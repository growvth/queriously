"""RAG question-answering endpoint — spec §6.4.

POST /qa  →  streaming SSE of tokens, followed by a final JSON payload
with sources and mode-specific metadata.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.embedder import embed_texts
from ..core.llm import stream as llm_stream
from ..core.reading_modes import SYSTEM_PROMPTS, build_context_block
from ..core.vector_store import query_chunks, query_multi_paper
from ..models.schemas import QARequest

logger = logging.getLogger("queriously.qa")

router = APIRouter(tags=["qa"])


@router.post("/qa")
async def qa(req: QARequest) -> StreamingResponse:
    """Streaming QA. Sends SSE events: `token` for each LLM token, then
    `done` with the full response + sources JSON."""

    # --- Retrieve context ---
    if req.context_override:
        # Selection-based QA: use the selected text directly.
        context_chunks = [
            {"document": req.context_override, "metadata": {"page": 0, "section": "selection"}, "distance": 0.0}
        ]
    elif req.context_paper_ids:
        # Multi-paper session context.
        q_emb = embed_texts([req.question])[0]
        context_chunks = query_multi_paper(req.context_paper_ids, q_emb, top_k_per_paper=req.top_k)
    else:
        # Standard single-paper RAG.
        q_emb = embed_texts([req.question])[0]
        raw = query_chunks(req.paper_id, q_emb, top_k=req.top_k)
        docs = raw.get("documents", [[]])[0]
        metas = raw.get("metadatas", [[]])[0]
        dists = raw.get("distances", [[]])[0]
        context_chunks = [
            {"document": d, "metadata": m, "distance": dist, "paper_id": req.paper_id}
            for d, m, dist in zip(docs, metas, dists)
        ]

    # --- Build prompt ---
    system = SYSTEM_PROMPTS.get(req.reading_mode, SYSTEM_PROMPTS["explain"])
    context_block = build_context_block(context_chunks)
    user_msg = (
        f"Here is the relevant source material from the paper(s):\n\n"
        f"{context_block}\n\n"
        f"---\n\nQuestion: {req.question}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]

    # --- Confidence heuristic based on retrieval distance ---
    if context_chunks:
        best = min(c.get("distance", 1.0) for c in context_chunks)
        if best < 0.3:
            confidence = "high"
        elif best < 0.6:
            confidence = "medium"
        else:
            confidence = "low"
    else:
        confidence = "low"

    # --- Sources payload ---
    sources = []
    for c in context_chunks:
        meta = c.get("metadata", {})
        sources.append({
            "paper_id": c.get("paper_id", req.paper_id),
            "page": meta.get("page", 0),
            "section": meta.get("section") or None,
            "text": (c.get("document", "") or "")[:300],
            "score": round(1.0 - c.get("distance", 0.0), 3),
        })

    # --- Stream response ---
    async def event_stream():
        full_text = ""
        async for token in llm_stream(messages):
            full_text += token
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        # Parse mode-specific blocks from the full text.
        counterpoint = None
        followup = None
        margin_note = None

        if req.reading_mode == "challenge" and "Counterpoint:" in full_text:
            parts = full_text.split("Counterpoint:", 1)
            full_text = parts[0].strip()
            counterpoint = parts[1].strip()
        elif req.reading_mode == "connect" and "Your turn:" in full_text:
            parts = full_text.split("Your turn:", 1)
            full_text = parts[0].strip()
            followup = parts[1].strip()
        elif req.reading_mode == "annotate" and "Margin note:" in full_text:
            parts = full_text.split("Margin note:", 1)
            full_text = parts[0].strip()
            margin_note = parts[1].strip()

        done_payload = {
            "type": "done",
            "answer": full_text,
            "counterpoint": counterpoint,
            "followup_question": followup,
            "margin_note": margin_note,
            "sources": sources,
            "confidence": confidence,
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
