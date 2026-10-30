import { Plus } from "lucide-react";

/**
 * Fixed Swiss grid: four columns of hairlines over the content width, with
 * registration crosses where they meet the header rule. Content aligns to it
 * through lib/grid.ts.
 */
export function GridLines() {
  return (
    <div aria-hidden className="vt-grid pointer-events-none fixed inset-0 -z-10">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-4">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="relative border-l border-rule last:border-r">
            {column > 0 && (
              <Plus className="absolute top-18 -left-2 size-4 text-ink-mute max-md:hidden" strokeWidth={1} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
