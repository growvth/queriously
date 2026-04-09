import { readFile } from "@tauri-apps/plugin-fs";
import { loadPdfFromBytes } from "../lib/pdfjs";
import { api, type Paper } from "../lib/tauri";
import { usePdfStore } from "../store/pdfStore";

/**
 * Opens a PDF end-to-end: registers it in the library via the Rust backend,
 * reads the file bytes through the Tauri FS plugin, and loads the document
 * into pdfjs so the viewer can render it.
 */
export function usePdf() {
  const setDoc = usePdfStore((s) => s.setDoc);
  const setPaper = usePdfStore((s) => s.setPaper);

  async function openPath(path: string): Promise<Paper> {
    const paper = await api.openPdf(path);
    const bytes = await readFile(path);
    const doc = await loadPdfFromBytes(new Uint8Array(bytes));
    setPaper(paper);
    setDoc(doc, doc.numPages);
    return paper;
  }

  return { openPath };
}
