<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="queriously-white-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="queriously-red-bg.png">
    <img alt="Queriously Logo" src="queriously-red-bg.png" width="128">
  </picture>
</p>

<h1 align="center">Queriously</h1>

<p align="center">
  Research copilot and technical document reader.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.1.0-blue" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT" />
  <img src="https://img.shields.io/badge/Platform-macOS-lightgrey" alt="Platform macOS" />
</p>

Queriously is a desktop application for deep engagement with technical literature.
It combines a local PDF reader with a sidecar AI service for grounded, paper-aware
question answering and annotation workflows.

## Current Implementation Status

### Shipped in this branch
- PDF open/read flow with local library and SQLite metadata.
- Ingestion pipeline (parse, chunk, embed, store) through the Python sidecar.
- Streaming QA with reading modes and source-cited responses.
- Marginalia generation and rendering (Phase 1 note types).
- Summary generation and persistent reading progress/highlights.
- Session skeleton: create/list sessions and add current paper.

### In progress / planned
- Equations and citations tabs (UI + endpoint wiring).
- Full research session workflow (context chat, synthesis, richer session actions).
- Marginalia edit/delete/promote interactions and broader note types.
- Export pack and deeper test coverage.

## Tech Stack

- Tauri 2 + Rust command layer
- React 18 + TypeScript + Zustand
- Python FastAPI sidecar
- SQLite + local vector store

## Local Development

```bash
npm install
npm run tauri dev
```

For frontend-only iteration:

```bash
npm run dev
```
