import { Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/tauri";
import { useLibraryStore } from "../../store/libraryStore";
import { useMarginaliaStore } from "../../store/marginaliaStore";
import { usePdfStore } from "../../store/pdfStore";

export function StatusBar() {
  const currentPage = usePdfStore((s) => s.currentPage);
  const paper = usePdfStore((s) => s.paper);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);
  const ingestStatus = usePdfStore((s) => s.ingestStatus);
  const ingestMessage = usePdfStore((s) => s.ingestMessage);
  const setPaper = usePdfStore((s) => s.setPaper);
  const setIngestStatus = usePdfStore((s) => s.setIngestStatus);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const marginaliaVisible = useMarginaliaStore((s) => s.visible);
  const setMarginaliaVisible = useMarginaliaStore((s) => s.setVisible);
  const marginaliaCount = useMarginaliaStore((s) => s.notes.length);
  const isGenerating = useMarginaliaStore((s) => s.isGenerating);
  const marginaliaError = useMarginaliaStore((s) => s.error);
  const setMarginaliaGenerating = useMarginaliaStore((s) => s.setGenerating);
  const setMarginaliaError = useMarginaliaStore((s) => s.setError);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [aiDetail, setAiDetail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await api.checkAiReadiness();
        if (alive) {
          setAiReady(s.ready);
          setAiDetail(s.detail);
        }
      } catch (err) {
        if (alive) {
          setAiReady(false);
          setAiDetail(String(err));
        }
      }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  function retryMarginalia() {
    if (!paper) return;
    setMarginaliaGenerating(true);
    api
      .generateMarginalia(paper.id, paper.file_path)
      .catch((err) => setMarginaliaError(String(err)));
  }

  async function retryIndexing() {
    if (!paper) return;
    setIngestStatus("indexing", "Indexing paper...");
    try {
      await api.ingestPaper(paper.id, paper.file_path);
      const indexedPaper = { ...paper, is_indexed: true };
      setPaper(indexedPaper);
      setIngestStatus("ready", "Indexed");
      void refreshLibrary();
      if (!indexedPaper.marginalia_done) {
        retryMarginalia();
      }
    } catch (err) {
      setIngestStatus("failed", String(err));
    }
  }

  return (
    <footer className="h-8 shrink-0 flex items-center gap-4 px-3 border-t border-surface-border bg-surface-raised text-xs text-text-secondary">
      <span className="tabular-nums">
        Page {currentPage}
        {pageCount ? ` / ${pageCount}` : ""}
      </span>
      {ingestStatus !== "idle" && (
        <span
          className={`flex items-center gap-1.5 ${
            ingestStatus === "failed" ? "text-accent-error" : "text-text-secondary"
          }`}
          title={ingestMessage ?? undefined}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              ingestStatus === "indexing"
                ? "bg-accent-primary animate-pulse"
                : ingestStatus === "failed"
                ? "bg-accent-error"
                : "bg-accent-success"
            }`}
          />
          {ingestStatus === "indexing"
            ? ingestMessage ?? "Indexing..."
            : ingestStatus === "failed"
            ? "Index failed"
            : "Indexed"}
        </span>
      )}
      {ingestStatus === "failed" && (
        <button
          className="hover:text-text-primary transition-colors text-accent-primary"
          onClick={retryIndexing}
          title={ingestMessage ?? undefined}
        >
          Retry indexing
        </button>
      )}
      <button
        className="flex items-center gap-1 hover:text-text-primary transition-colors"
        onClick={() => setMarginaliaVisible(!marginaliaVisible)}
        title="Toggle marginalia"
      >
        {marginaliaVisible ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        Marginalia {marginaliaVisible ? "on" : "off"}
        {isGenerating && (
          <span className="text-accent-primary animate-pulse ml-1">generating...</span>
        )}
        {marginaliaError && !isGenerating && (
          <span className="text-accent-error ml-1" title={marginaliaError}>
            failed
          </span>
        )}
        {!isGenerating && marginaliaCount > 0 && (
          <span className="text-text-muted ml-1">({marginaliaCount})</span>
        )}
      </button>
      {marginaliaError && !isGenerating && (
        <button
          className="hover:text-text-primary transition-colors text-accent-primary"
          onClick={retryMarginalia}
          title={marginaliaError}
        >
          Retry marginalia
        </button>
      )}
      <span className="flex items-center gap-1.5" title={aiDetail ?? undefined}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            aiReady === null
              ? "bg-text-muted"
              : aiReady
              ? "bg-accent-success"
              : "bg-accent-error"
          }`}
        />
        AI {aiReady === null ? "..." : aiReady ? "ready" : "not ready"}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          className="q-btn py-0.5"
          onClick={() => setZoom(zoom - 0.1)}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="q-btn py-0.5"
          onClick={() => setZoom(zoom + 0.1)}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
