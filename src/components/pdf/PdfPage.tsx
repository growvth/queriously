import { useEffect, useRef, useState } from "react";
import type { PdfDoc } from "../../lib/pdfjs";
import { pdfjsLib } from "../../lib/pdfjs";
import { AnnotationLayer } from "./AnnotationLayer";
import { MarginaliaLayer } from "./MarginaliaLayer";

type Props = {
  doc: PdfDoc;
  pageNumber: number;
  zoom: number;
  onVisible?: (page: number) => void;
};

/**
 * Renders a single PDF page to a canvas with an absolutely-positioned pdfjs
 * text layer on top. Selection is handled entirely by the browser's native
 * ::selection — no custom overlay rects.
 */
export function PdfPage({ doc, pageNumber, zoom, onVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: zoom });
      setSize({ w: viewport.width, h: viewport.height });
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onVisible?.(pageNumber);
            if (!rendered) {
              void renderPage();
            }
          }
        }
      },
      { root: null, threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, pageNumber, zoom]);

  useEffect(() => {
    if (!rendered) return;
    void renderPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  async function renderPage() {
    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    if (!canvas || !textLayer) return;
    const page = await doc.getPage(pageNumber);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: zoom });

    canvas.width = Math.round(viewport.width * dpr);
    canvas.height = Math.round(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // pdfjs 4.x positions spans and sets font-sizes via
    // calc(var(--scale-factor) * ...). Set the variable BEFORE constructing
    // the TextLayer so the constructor's setLayerDimensions call and all
    // subsequent span sizing resolve correctly.
    textLayer.innerHTML = "";
    textLayer.style.setProperty("--scale-factor", `${viewport.scale}`);
    try {
      const tl = new pdfjsLib.TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayer,
        viewport,
      });
      await tl.render();
    } catch (err) {
      console.warn("text layer failed", err);
    }

    setRendered(true);
  }

  return (
    <div
      ref={containerRef}
      data-page={pageNumber}
      className="relative mx-auto my-4 shadow-lg bg-white"
      style={{
        width: size ? `${size.w}px` : undefined,
        height: size ? `${size.h}px` : undefined,
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="textLayer absolute inset-0 leading-none"
      />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
          Page {pageNumber}
        </div>
      )}
      <AnnotationLayer page={pageNumber} />
      <MarginaliaLayer page={pageNumber} />
    </div>
  );
}
