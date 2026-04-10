"""LiteLLM wrapper — unified interface for Ollama, OpenAI, Anthropic, etc.

Reads the active model config from environment variables:
  QUERIOUSLY_LLM_MODEL   — e.g. "ollama/llama3.2", "gpt-4o-mini"
  QUERIOUSLY_LLM_API_KEY — API key (not needed for Ollama)
  QUERIOUSLY_LLM_BASE    — custom base URL (optional)
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import litellm

# Suppress litellm's verbose logging.
litellm.set_verbose = False

DEFAULT_MODEL = "ollama/llama3.2"


def _model() -> str:
    return os.environ.get("QUERIOUSLY_LLM_MODEL", DEFAULT_MODEL)


def _params() -> dict:
    params: dict = {}
    key = os.environ.get("QUERIOUSLY_LLM_API_KEY")
    base = os.environ.get("QUERIOUSLY_LLM_BASE")
    if key:
        params["api_key"] = key
    if base:
        params["api_base"] = base
    return params


async def complete(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """Non-streaming completion. Returns the full assistant reply."""
    resp = await litellm.acompletion(
        model=_model(),
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        **_params(),
    )
    return resp.choices[0].message.content or ""


async def stream(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> AsyncGenerator[str, None]:
    """Streaming completion. Yields token strings as they arrive."""
    resp = await litellm.acompletion(
        model=_model(),
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        **_params(),
    )
    async for chunk in resp:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
