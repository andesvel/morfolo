/**
 * Bordered cell rows that sit exactly on the background grid.
 *
 * The background grid (GridLines) draws a left hairline at the start of each
 * of its 4 columns and a right one on the last. Cells mirror that: every cell
 * draws only its left and bottom edges, the row draws the top edge, and the
 * right edge is a pseudo-element so no border ever shrinks the row's content
 * box. Column starts then land on the same pixels as the grid lines.
 */
export const CELLS =
  "relative grid border-t border-ink after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-ink";

export const CELL = "border-b border-l border-ink";

/** Horizontal inset for text that is not inside a cell. */
export const GUTTER = "px-4 sm:px-6";

/**
 * Empty cells that complete the last row of a CELLS grid, so every real cell
 * is closed on the right and no outer edge runs past the content. Pass the
 * column count per breakpoint; returns a class string per filler.
 */
export function fillerClasses(count: number, cols: { base: number; md: number }): string[] {
  const base = (cols.base - (count % cols.base)) % cols.base;
  const md = (cols.md - (count % cols.md)) % cols.md;
  return Array.from({ length: Math.max(base, md) }, (_, index) => {
    const showBase = index < base;
    const showMd = index < md;
    if (showBase && showMd) return CELL;
    return showMd ? `${CELL} hidden md:block` : `${CELL} md:hidden`;
  });
}
