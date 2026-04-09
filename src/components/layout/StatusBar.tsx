import { Eye, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/tauri";
import { usePdfStore } from "../../store/pdfStore";

export function StatusBar() {
  const currentPage = usePdfStore((s) => s.currentPage);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  // Poll the sidecar status on mount + every 5s so the status dot stays
  // truthful across restarts without any eventing in place yet.
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await api.sidecarStatus();
        if (alive) setAiReady(s.ready);
      } catch {
        if (alive) setAiReady(false);
      }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <footer className="h-8 shrink-0 flex items-center gap-4 px-3 border-t border-surface-border bg-surface-raised text-xs text-text-secondary">
      <span className="tabular-nums">
        Page {currentPage}
        {pageCount ? ` / ${pageCount}` : ""}
      </span>
      <span className="flex items-center gap-1">
        <Eye className="w-3 h-3" />
        Marginalia off
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            aiReady === null
              ? "bg-text-muted"
              : aiReady
              ? "bg-accent-success"
              : "bg-accent-error"
          }`}
        />
        AI {aiReady === null ? "…" : aiReady ? "ready" : "offline"}
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
