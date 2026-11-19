import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

type RevealProps = {
  as?: ElementType;
  /** Stagger position; each step adds --stagger to the delay. */
  i?: number;
  /**
   * The element is a surface (its own fill over the grid): the fill stays put
   * and only its children reveal, so the grid never shows through mid-fade.
   */
  surface?: boolean;
  className?: string;
  children: ReactNode;
};

export function Reveal({ as: Tag = "div", i = 0, surface = false, className, children }: RevealProps) {
  const style = { "--i": i } as CSSProperties;
  return (
    <Tag className={cn(surface ? "reveal-surface" : "reveal", className)} style={style}>
      {children}
    </Tag>
  );
}
