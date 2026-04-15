type Rect = [number, number, number, number];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Merge fragmented rects into clean, continuous line-level highlights.
 * Handles equations, math (sub/superscripts), and multi-column layouts
 * by using vertical overlap instead of vertical center proximity.
 */
export function mergeNormalizedRects(rects: Rect[]): Rect[] {
  if (rects.length === 0) return [];

  // Filter out rects that are likely "background selection" artifacts.
  // If a single rect covers more than 80% of the page, it's almost
  // certainly the page container itself being selected.
  const validRects = rects.filter(r => {
    const w = r[2] - r[0];
    const h = r[3] - r[1];
    return w < 0.95 || h < 0.95;
  });

  if (validRects.length === 0) return [];

  // Sort primarily by top, then by left.
  const sorted = [...validRects].sort((a, b) => {
    if (Math.abs(a[1] - b[1]) > 0.005) return a[1] - b[1];
    return a[0] - b[0];
  });

  const lines: Rect[][] = [];
  
  for (const r of sorted) {
    let joined = false;
    
    // Attempt to add this rect to an existing line.
    // A rect belongs to a line if it has significant vertical overlap.
    for (const line of lines) {
      // Use the first rect in the line as the reference for vertical position.
      // This works well because we sorted by 'top'.
      const ref = line[0];
      const refHeight = ref[3] - ref[1];
      const rHeight = r[3] - r[1];
      
      const overlapTop = Math.max(ref[1], r[1]);
      const overlapBottom = Math.min(ref[3], r[3]);
      const overlap = Math.max(0, overlapBottom - overlapTop);
      
      // If they overlap by more than 40% of either rect's height, 
      // they are likely on the same line. This is generous enough 
      // for subscripts/superscripts.
      if (overlap > Math.min(refHeight, rHeight) * 0.4) {
        line.push(r);
        joined = true;
        break;
      }
    }
    
    if (!joined) {
      lines.push([r]);
    }
  }

  const merged: Rect[] = [];
  const padY = 0.001; // Tiny vertical padding for visual comfort

  for (const line of lines) {
    // Sort rects in the line horizontally
    line.sort((a, b) => a[0] - b[0]);

    // Calculate the overall vertical bounds for this line.
    // We want a consistent height for the highlight.
    const lineTop = Math.min(...line.map(r => r[1]));
    const lineBottom = Math.max(...line.map(r => r[3]));

    let segLeft = line[0][0];
    let segRight = line[0][2];
    
    // A generous horizontal gap tolerance to bridge word spaces (usually ~0.01-0.03)
    // but not cross columns (usually > 0.05).
    const gapTolerance = 0.035; 

    for (let i = 1; i < line.length; i++) {
      const next = line[i];
      if (next[0] - segRight <= gapTolerance) {
        segRight = Math.max(segRight, next[2]);
      } else {
        merged.push([
          clamp01(segLeft),
          clamp01(lineTop - padY),
          clamp01(segRight),
          clamp01(lineBottom + padY)
        ]);
        segLeft = next[0];
        segRight = next[2];
      }
    }
    
    merged.push([
      clamp01(segLeft),
      clamp01(lineTop - padY),
      clamp01(segRight),
      clamp01(lineBottom + padY)
    ]);
  }

  return merged;
}

/**
 * Convert DOM range client rects into normalized page-space rects and smooth
 * them into continuous line spans.
 */
export function normalizedRangeRects(range: Range, pageRect: DOMRect): Rect[] {
  // Use getClientRects() to get individual line/fragment boxes.
  // Note: getBoundingClientRect() would give one big box for the whole selection.
  const raw = Array.from(range.getClientRects())
    .map((r) => {
      // Intersection with pageRect to handle cross-page selections
      const left = Math.max(r.left, pageRect.left);
      const top = Math.max(r.top, pageRect.top);
      const right = Math.min(r.right, pageRect.right);
      const bottom = Math.min(r.bottom, pageRect.bottom);
      
      const width = right - left;
      const height = bottom - top;
      
      // Filter out only truly empty rects.
      if (width <= 0 || height <= 0) return null;
      
      return [
        clamp01((left - pageRect.left) / pageRect.width),
        clamp01((top - pageRect.top) / pageRect.height),
        clamp01((right - pageRect.left) / pageRect.width),
        clamp01((bottom - pageRect.top) / pageRect.height),
      ] as Rect;
    })
    .filter((r): r is Rect => Boolean(r));

  return mergeNormalizedRects(raw);
}
