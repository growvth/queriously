import { open } from "@tauri-apps/plugin-dialog";
import { FlaskConical, FolderOpen, ZoomIn, ZoomOut } from "lucide-react";
import { PDFViewer } from "./components/pdf/PDFViewer";
import { usePdf } from "./hooks/usePdf";
import { usePdfStore } from "./store/pdfStore";

function App() {
  const { openPath } = usePdf();
  const paper = usePdfStore((s) => s.paper);
  const currentPage = usePdfStore((s) => s.currentPage);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);

  async function onOpen() {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof path === "string") {
      try {
        await openPath(path);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-base text-text-primary">
      <header className="h-11 flex items-center px-3 border-b border-surface-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-accent-primary" />
          <span className="font-semibold">Queriously</span>
        </div>
        <div className="mx-4 text-text-secondary truncate">
          {paper?.title ?? "No paper open"}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="q-btn" onClick={onOpen} title="Open PDF">
            <FolderOpen className="w-4 h-4" />
            <span>Open</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <PDFViewer />
      </main>

      <footer className="h-8 flex items-center gap-4 px-3 border-t border-surface-border bg-surface-raised text-xs text-text-secondary">
        <span>
          Page {currentPage}
          {pageCount ? ` / ${pageCount}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="q-btn py-0.5" onClick={() => setZoom(zoom - 0.1)}>
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button className="q-btn py-0.5" onClick={() => setZoom(zoom + 0.1)}>
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
