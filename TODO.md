# Queriously Product Backlog

Last reviewed: April 2026

Queriously is already a useful v0.1 research reader: it can open PDFs, keep a
local library, index papers, ask source-grounded questions, stream answers,
show citations, generate marginalia, create highlights, summarize papers, and
create basic research sessions.

The app is past "prototype" but not yet a complete research workflow. The main
gap is depth: several primitives exist, but they need stronger interactions,
better reliability, and richer cross-paper behavior.

## Current Status

### Working Today

- Local macOS desktop reader.
- PDF open, drag-and-drop, continuous scroll, zoom, page tracking, and native
  text selection.
- Local library with recency ordering and search.
- PDF ingestion: parse text, chunk passages, embed locally, store vectors.
- Streaming paper Q&A with source snippets, page citations, and confidence
  heuristic.
- Persisted per-paper chat history with source metadata and reading-mode
  extras.
- Reading modes: Explain, Challenge, Connect, Annotate.
- Selection-based actions from the floating toolbar.
- Highlight annotations persisted locally.
- AI marginalia generation for restatement, assumption, and limitation notes.
- Summary panel with bullet summaries.
- Local LLM/provider configuration with Ollama, OpenAI, Anthropic, and custom
  LiteLLM-compatible endpoints.
- Basic research sessions: create sessions and add current paper.
- Reading progress persistence.
- Visible indexing status and marginalia retry state in the status bar.
- LLM readiness checks distinguish sidecar availability from provider/model
  availability.

### Partially Built

- Research sessions have storage and UI, but no active session context in chat.
- Multi-paper retrieval exists in the sidecar, but the app does not yet pass
  session paper IDs into chat.
- Summary backend supports critique and ELI5 prompts, but the UI only exposes
  bullet summaries.
- Equation detection exists during parsing and the selection toolbar can ask
  about equations, but there is no equation browser, rendering surface, or plot
  workflow.
- Marginalia rendering works, but notes cannot yet be edited, deleted,
  promoted, filtered from a full UI, or attached to an annotation workflow.
- The schema has tables for summaries, sessions, and marginalia, but some app
  state still lives only in memory during a run.

### Not Built Yet

- Citation/reference extraction tab.
- DOI/arXiv resolution and BibTeX export.
- Session synthesis.
- Export packs for annotations, chat, marginalia, summaries, and sessions.
- Sticky notes.
- TOC/bookmark sidebar.
- OCR for scanned PDFs.
- Broken file relocation flow.
- Auto-update and signed/notarized release distribution.
- Windows support.
- Meaningful automated test coverage.

## Priority Backlog

### P0: Make v0.1 Trustworthy

These are the highest-leverage tasks before showing the app to more users.

- **Expand smoke tests into end-to-end app flows.** Current smoke coverage
  checks DB migrations, library/annotation/progress/session/chat persistence,
  and sidecar health/readiness. Next: GUI-level open-PDF and retrieval flows.

### P1: Finish the Single-Paper Research Loop

This makes one paper feel complete end-to-end.

- **Marginalia actions.** Edit note, delete note, regenerate note, promote note
  to annotation, and copy note.
- **Manual margin notes.** The floating toolbar already has "Add margin note"
  but currently dismisses; make it create a user-authored note.
- **Sticky notes.** Add note annotations independent of highlights.
- **Better highlights.** Store multi-line selection rects accurately instead of
  relying on one toolbar-positioning rectangle.
- **Source citation jump polish.** Source cards should jump to page and ideally
  flash or focus the relevant passage.
- **Summary modes in UI.** Expose Bullets, Critical Review, and ELI5 from the
  existing backend.
- **Section/selection summaries.** Use selected text or PDF outline sections as
  summary scope.
- **TOC/bookmark panel.** Use PDF outlines to navigate dense papers quickly.
- **Better confidence.** Replace the simple distance threshold with a clearer
  evidence-quality signal.

### P2: Make Sessions Real

This is the biggest product unlock: Queriously becomes a literature-review
workspace, not just a single-paper reader.

- **Active session state.** Let a user select an active session and show it in
  the reader.
- **Session-aware chat.** Pass all paper IDs in the active session to the QA
  endpoint so multi-paper retrieval is actually used.
- **Cross-paper citations.** Source cards need paper title, page, section, and
  snippet.
- **Session synthesis.** Generate a structured synthesis with claims,
  agreements, disagreements, open questions, and recommended next reads.
- **Synthesis stale state.** Mark synthesis stale when papers, annotations, or
  key chat messages change.
- **Session notes.** Let users promote marginalia, chat answers, and highlights
  into a session-level research board.
- **Session export.** Export synthesis, citations, notes, and source trail as
  Markdown/JSON.

### P3: Technical Reading Power Features

These make Queriously feel built for technical papers specifically.

- **Equation tab.** Show extracted equations with page/context.
- **KaTeX rendering.** Render equation candidates cleanly instead of treating
  them as plain text.
- **Equation plotting.** Use the existing Python math dependencies to plot
  user-selected functions with configurable bounds.
- **Citation tab.** Extract bibliography entries and in-text references.
- **DOI/arXiv enrichment.** Resolve references where possible.
- **BibTeX export.** Export references and selected evidence trails.
- **Figure/table awareness.** Detect captions and let users ask about figures
  and tables with better context.
- **Contradiction marginalia.** Add second-pass claim comparison within a paper.
- **Connection marginalia.** Link related claims across sections and, later,
  across session papers.

### P4: Production Readiness

These are launch-quality requirements rather than core product discovery.

- **Signed macOS builds.** Produce notarized DMG releases with checksums.
- **Auto-update.** Add Tauri updater flow.
- **Sidecar packaging hardening.** Ensure Python dependencies and model/runtime
  expectations work outside a dev machine.
- **Performance audit.** Test startup, 200+ page PDFs, marginalia generation,
  memory use, and large-library behavior.
- **OCR for scanned PDFs.** Detect image-only PDFs and provide a clear path.
- **Broken file recovery.** If a library PDF moved, prompt the user to locate
  it instead of failing.
- **Accessibility pass.** Keyboard navigation, focus states, screen reader
  labels, contrast, and reduced-motion behavior.
- **Windows support.** Defer until macOS build and sidecar packaging are solid.

## Product Judgment

Queriously already has the right skeleton: local reader, sidecar intelligence,
source-grounded chat, marginalia, and sessions. The product direction is strong.

The main risk is that some headline ideas currently exist as isolated pieces
instead of finished workflows. Marginalia is generated but not yet truly
actionable. Sessions can group papers but do not yet change how chat works.
Summaries exist but are under-exposed. The technical-paper features implied by
the product, especially equations, citations, figures, and contradiction
detection, are still mostly backlog.

The next best milestone is not "add more features." It is:

> Make one paper feel excellent, persistent, inspectable, and recoverable.

After that, make sessions genuinely multi-paper. That sequence preserves the
product thesis without spreading effort across too many half-finished surfaces.
