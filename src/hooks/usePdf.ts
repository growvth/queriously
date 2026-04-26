import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { loadPdfFromBytes } from "../lib/pdfjs";
import { api, type Paper } from "../lib/tauri";
import { useLibraryStore } from "../store/libraryStore";
import { useMarginaliaStore } from "../store/marginaliaStore";
import { usePdfStore } from "../store/pdfStore";

export function usePdf() {
  const setDoc = usePdfStore((s) => s.setDoc);
  const setPaper = usePdfStore((s) => s.setPaper);
  const setIngestStatus = usePdfStore((s) => s.setIngestStatus);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const setMargGenerating = useMarginaliaStore((s) => s.setGenerating);
  const setMargError = useMarginaliaStore((s) => s.setError);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    listen<{ paper_id: string; step: string; percent: number }>("ingest:progress", (event) => {
      const activePaper = usePdfStore.getState().paper;
      if (activePaper?.id !== event.payload.paper_id) return;
      const step = event.payload.step.replace(/_/g, " ");
      setIngestStatus("indexing", `${step} (${event.payload.percent}%)`);
    }).then((u) => {
      unsub = u;
    });

    return () => unsub?.();
  }, [setIngestStatus]);

  async function openPath(path: string): Promise<Paper> {
    const paper = await api.openPdf(path);
    const rawBytes = await api.readPdfBytes(path);
    const bytes = new Uint8Array(rawBytes);
    const doc = await loadPdfFromBytes(bytes);
    setPaper(paper);
    setDoc(doc, doc.numPages);
    void refreshLibrary();

    // Auto-ingest if not already indexed, then trigger marginalia.
    if (!paper.is_indexed) {
      setIngestStatus("indexing", "Indexing paper...");
      api
        .ingestPaper(paper.id, path)
        .then(() => {
          const indexedPaper = { ...paper, is_indexed: true };
          setPaper(indexedPaper);
          setIngestStatus("ready", "Indexed");
          void refreshLibrary();
          if (!paper.marginalia_done) {
            setMargGenerating(true);
            api
              .generateMarginalia(paper.id, path)
              .catch((err) => {
                console.warn("marginalia failed:", err);
                setMargError(String(err));
              });
          }
        })
        .catch((err) => {
          console.warn("ingest failed (will retry):", err);
          setIngestStatus("failed", String(err));
        });
    } else if (!paper.marginalia_done) {
      // Indexed but marginalia not yet generated.
      setMargGenerating(true);
      api
        .generateMarginalia(paper.id, path)
        .catch((err) => {
          console.warn("marginalia failed:", err);
          setMargError(String(err));
        });
    }

    return paper;
  }

  return { openPath };
}
