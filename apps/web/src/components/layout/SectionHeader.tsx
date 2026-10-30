import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { pad2 } from "../../lib/format.ts";
import { GUTTER } from "../../lib/grid.ts";
import { Hint } from "../ui/tooltip.tsx";
import { RegisterMarks } from "./RegisterMarks.tsx";

type SectionHeaderProps = {
  index: number;
  total: number;
  title: string;
  aside?: ReactNode;
  /** Tooltip text explaining the section. */
  help?: string;
};

export function SectionHeader({ index, total, title, aside, help }: SectionHeaderProps) {
  return (
    <div className={cn("relative flex items-baseline justify-between gap-4 border-b border-ink pb-3", GUTTER)}>
      <RegisterMarks at={["0"]} edge="bottom" />
      <h2 className="label flex items-center gap-2 font-bold">
        <span className="cut">
          {pad2(index)} · {title}
        </span>
        {help && <Hint label={title}>{help}</Hint>}
      </h2>
      <span className="label flex items-center gap-4">
        {aside}
        <span className="cut">
          {pad2(index)} / {pad2(total)}
        </span>
      </span>
    </div>
  );
}
