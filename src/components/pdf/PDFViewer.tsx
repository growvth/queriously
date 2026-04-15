import { useCallback, useEffect, useRef } from "react";
import { normalizedRangeRects } from "../../lib/selectionRects";
import { usePdfStore } from "../../store/pdfStore";
import { PdfPage } from "./PdfPage";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function rectOverlapArea(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);
  return w * h;
}

/**
 * Viewer shell: scrolls through every page of the active document. Each page
 * is mounted in DOM order so native text selection can span pages; rendering
 * is gated by an intersection observer inside PdfPage so only visible pages
 * pay the pdfjs render cost. Enough for Phase 1; a windowed virtualizer is a
 * follow-up if 500-page papers start to chug.
 */
export function PDFViewer() {
  const paper = usePdfStore((s) => s.paper);
  const doc = usePdfStore((s) => s.doc);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const currentPage = usePdfStore((s) => s.currentPage);
  const setZoom = usePdfStore((s) => s.setZoom);
  const setSelection = usePdfStore((s) => s.setSelection);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectionFrameRef = useRef<number | null>(null);

  const onPageVisible = useCallback(
    (p: number) => setCurrentPage(p),
    [setCurrentPage],
  );

  // Scroll to top when a new paper is loaded.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [paper?.id]);

  // Keyboard shortcuts per FR-PDF-09: j/k + arrows for page nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        jumpTo(currentPage + 1);
        e.preventDefault();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        jumpTo(currentPage - 1);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        setZoom(zoom + 0.1);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        setZoom(zoom - 0.1);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, zoom]);

  function jumpTo(page: number) {
    if (!scrollRef.current) return;
    const clamped = Math.min(Math.max(1, page), pageCount);
    const el = scrollRef.current.querySelector<HTMLElement>(
      `[data-page="${clamped}"]`,
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Relay native text selections into the store so the floating action
  // toolbar and custom overlay can react without having to re-read the DOM.
  useEffect(() => {
    let dragging = false;
    let sealed = false;
    
    // Cache page elements to avoid frequent DOM queries
    let cachedPageEls: { el: HTMLElement; page: number }[] = [];
    
    function refreshPageCache() {
      cachedPageEls = Array.from(
        document.querySelectorAll<HTMLElement>("[data-page]"),
      ).map(el => ({
        el,
        page: Number(el.dataset.page || "0")
      })).filter(p => p.page > 0);
    }

    function findDominantPage(range: Range) {
      if (cachedPageEls.length === 0) refreshPageCache();
      
      const rangeRects = Array.from(range.getClientRects());
      if (rangeRects.length === 0) return null;

      let best: { pageEl: HTMLElement; page: number; score: number } | null = null;
      
      // Heuristic: check pages near the startContainer first
      let startNode: Node | null = range.startContainer;
      let startPageEl: HTMLElement | null = null;
      let node: Node | null = startNode;
      while (node) {
        if (node instanceof HTMLElement && node.dataset.page) {
          startPageEl = node;
          break;
        }
        node = node.parentElement;
      }

      for (const { el, page } of cachedPageEls) {
        const pageRect = el.getBoundingClientRect();
        let score = 0;
        for (const rr of rangeRects) {
          score += rectOverlapArea(rr, pageRect);
        }
        if (score > 0) {
          if (!best || score > best.score) {
            best = { pageEl: el, page, score };
          }
          // If the page we found matches the start container's page 
          // and it has a high score, it's almost certainly the dominant one.
          if (el === startPageEl && score > 100) break;
        }
      }
      return best;
    }

    function captureSelection(showToolbar: boolean) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!sealed) setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        if (!sealed) setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      if (scrollRef.current && !scrollRef.current.contains(range.commonAncestorContainer)) {
        if (!sealed) setSelection(null);
        return;
      }

      const dominant = findDominantPage(range);
      if (!dominant) return;

      const { pageEl, page } = dominant;
      const pageRect = pageEl.getBoundingClientRect();
      const rects = normalizedRangeRects(range, pageRect);
      
      // The bounding rect for the toolbar positioning
      const rect = range.getBoundingClientRect();

      setSelection({ text, page, rect: showToolbar ? rect : null, rects });

      if (showToolbar) {
        sealed = true;
        sel.removeAllRanges();
      }
    }

    function scheduleCapture(showToolbar: boolean) {
      if (selectionFrameRef.current != null) {
        cancelAnimationFrame(selectionFrameRef.current);
      }
      selectionFrameRef.current = requestAnimationFrame(() => {
        selectionFrameRef.current = null;
        captureSelection(showToolbar);
      });
    }

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (scrollRef.current && target && scrollRef.current.contains(target)) {
        sealed = false;
        dragging = true;
        setSelection(null);
      }
    }

    function onMouseUp() {
      if (dragging) {
        dragging = false;
        scheduleCapture(true);
      }
    }

    function onLiveUpdate() {
      if (dragging) {
        scheduleCapture(false);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!sealed) {
        scheduleCapture(true);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onLiveUpdate);
    document.addEventListener("selectionchange", onLiveUpdate);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onLiveUpdate);
      document.removeEventListener("selectionchange", onLiveUpdate);
      document.removeEventListener("keyup", onKeyUp);
      if (selectionFrameRef.current != null) {
        cancelAnimationFrame(selectionFrameRef.current);
      }
    };
  }, [setSelection]);

  if (!doc) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-text-muted gap-3">
        <div className="text-4xl opacity-30">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <p className="text-sm">Drop a PDF here or press <kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary text-xs font-mono">⌘O</kbd> to open</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto bg-surface-base pb-24"
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <PdfPage
          key={`${paper?.id ?? "doc"}-${i + 1}`}
          doc={doc}
          pageNumber={i + 1}
          zoom={zoom}
          onVisible={onPageVisible}
        />
      ))}
    </div>
  );
}
