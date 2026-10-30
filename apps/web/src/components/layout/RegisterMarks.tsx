import { cn } from "../../lib/cn.ts";

/** Positions along the parent's width; quarters match the page grid, thirds a 3-column span. */
const LINES = {
  "0": "left-0",
  "1/4": "left-1/4",
  "1/3": "left-1/3",
  "1/2": "left-1/2",
  "2/3": "left-2/3",
  "3/4": "left-3/4",
  "1": "left-full",
} as const;
type Line = keyof typeof LINES;

const EDGES = {
  /** Centered on the parent's top rule. */
  top: "top-0 -translate-y-1/2",
  /** Centered on the parent's bottom rule. */
  bottom: "bottom-0 translate-y-1/2",
} as const;

type RegisterMarksProps = {
  at: readonly Line[];
  edge?: keyof typeof EDGES;
};

/**
 * 8px signal squares where grid lines cross a rule (ChainGPT/Synthopsis
 * registration marks). The parent must be `relative` and span the lines.
 */
export function RegisterMarks({ at, edge = "top" }: RegisterMarksProps) {
  return (
    <>
      {at.map((line) => (
        <span
          key={line}
          aria-hidden
          className={cn("pointer-events-none absolute z-10 size-2 -translate-x-1/2 bg-signal", EDGES[edge], LINES[line])}
        />
      ))}
    </>
  );
}
