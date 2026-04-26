"""Configuration endpoints — update LLM settings at runtime and detect Ollama."""

from __future__ import annotations

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["config"])


class LLMConfig(BaseModel):
    model: str  # e.g. "ollama/llama3.2", "gpt-4o-mini", "claude-sonnet-4-20250514"
    api_key: str | None = None
    base_url: str | None = None


class OllamaStatus(BaseModel):
    running: bool
    models: list[str]


class ReadinessStatus(BaseModel):
    ready: bool
    status: str
    detail: str
    model: str


@router.post("/config/llm")
async def update_llm_config(cfg: LLMConfig) -> dict:
    """Update the LLM environment variables used by the llm module at runtime."""
    os.environ["QUERIOUSLY_LLM_MODEL"] = cfg.model
    if cfg.api_key:
        os.environ["QUERIOUSLY_LLM_API_KEY"] = cfg.api_key
    else:
        os.environ.pop("QUERIOUSLY_LLM_API_KEY", None)
    if cfg.base_url:
        os.environ["QUERIOUSLY_LLM_BASE"] = cfg.base_url
    else:
        os.environ.pop("QUERIOUSLY_LLM_BASE", None)
    return {"ok": True, "model": cfg.model}


@router.get("/config/llm")
async def get_llm_config() -> dict:
    """Return the current LLM config (without the API key for security)."""
    return {
        "model": os.environ.get("QUERIOUSLY_LLM_MODEL", "ollama/llama3.2"),
        "has_api_key": bool(os.environ.get("QUERIOUSLY_LLM_API_KEY")),
        "base_url": os.environ.get("QUERIOUSLY_LLM_BASE"),
    }


@router.get("/ollama/status", response_model=OllamaStatus)
async def ollama_status() -> OllamaStatus:
    """Check if Ollama is running locally and list available models."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return OllamaStatus(running=True, models=models)
    except Exception:
        pass
    return OllamaStatus(running=False, models=[])


@router.get("/config/readiness", response_model=ReadinessStatus)
async def readiness() -> ReadinessStatus:
    """Report whether the configured LLM provider is usable enough for sends.

    This intentionally avoids paid probe completions for hosted providers. For
    local Ollama we can verify the daemon and selected model. For hosted/custom
    providers we verify config shape and let request-time errors stay explicit.
    """
    model = os.environ.get("QUERIOUSLY_LLM_MODEL", "ollama/llama3.2")
    api_key = os.environ.get("QUERIOUSLY_LLM_API_KEY")
    base_url = os.environ.get("QUERIOUSLY_LLM_BASE")

    if model.startswith("ollama/"):
        selected = model.split("/", 1)[1]
        status = await ollama_status()
        if not status.running:
            return ReadinessStatus(
                ready=False,
                status="ollama_offline",
                detail="Ollama is not running.",
                model=model,
            )
        names = {m.split(":", 1)[0]: m for m in status.models}
        if selected not in status.models and selected.split(":", 1)[0] not in names:
            return ReadinessStatus(
                ready=False,
                status="model_missing",
                detail=f"Ollama is running, but {selected} is not installed.",
                model=model,
            )
        return ReadinessStatus(
            ready=True,
            status="ready",
            detail="Ollama is running and the selected model is available.",
            model=model,
        )

    if model.startswith("gpt-") and not api_key:
        return ReadinessStatus(
            ready=False,
            status="missing_api_key",
            detail="OpenAI model selected, but no API key is configured.",
            model=model,
        )

    if (model.startswith("claude-") or model.startswith("anthropic/")) and not api_key:
        return ReadinessStatus(
            ready=False,
            status="missing_api_key",
            detail="Anthropic model selected, but no API key is configured.",
            model=model,
        )

    if not model:
        return ReadinessStatus(
            ready=False,
            status="missing_model",
            detail="No LLM model is configured.",
            model=model,
        )

    if model.startswith("custom/") and not base_url:
        return ReadinessStatus(
            ready=False,
            status="missing_base_url",
            detail="Custom model selected, but no base URL is configured.",
            model=model,
        )

    return ReadinessStatus(
        ready=True,
        status="ready",
        detail="Provider configuration is present.",
        model=model,
    )
