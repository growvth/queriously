import { useAnnotationStore } from "../../store/annotationStore";
import { mergeNormalizedRects } from "../../lib/selectionRects";

type Props = {
  page: number;
};

/**
 * Overlay for user highlight annotations on a single PDF page.
 * Each highlight is rendered as a semi-transparent coloured rectangle
 * positioned via the stored normalized PDF-space coords (0-1).
 * The page container must be `position: relative` and have a known size.
 */
export function AnnotationLayer({ page }: Props) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const pageAnnotations = annotations.filter(
    (a) => a.page === page && a.type === "highlight",
  );

  if (pageAnnotations.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {pageAnnotations.map((a) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(a.coords);
        } catch {
          return null;
        }

        // Backward compatible:
        // - legacy: [x1, y1, x2, y2]
        // - current: [[x1, y1, x2, y2], ...] for multi-line highlights
        const rectsRaw: number[][] = Array.isArray(parsed) && Array.isArray(parsed[0])
          ? (parsed as number[][])
          : [parsed as number[]];
        const rects = mergeNormalizedRects(
          rectsRaw.filter((coords) => Array.isArray(coords) && coords.length === 4) as [number, number, number, number][],
        );

        return (
          <div key={a.id} title={a.note_text || a.selected_text || "Highlight"}>
            {rects.map((coords, idx) => {
              const [x1, y1, x2, y2] = coords;
              if (
                [x1, y1, x2, y2].some((n) => !Number.isFinite(n)) ||
                x2 <= x1 ||
                y2 <= y1
              ) {
                return null;
              }
              return (
                <div
                  key={`${a.id}-${idx}`}
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    left: `${x1 * 100}%`,
                    top: `${y1 * 100}%`,
                    width: `${(x2 - x1) * 100}%`,
                    height: `${(y2 - y1) * 100}%`,
                    backgroundColor: a.color || "#FEF08A",
                    opacity: 0.42,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
