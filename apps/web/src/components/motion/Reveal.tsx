import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

type RevealProps = {
  as?: ElementType;
  /** Stagger position; each step adds --stagger to the delay. */
  i?: number;
  className?: string;
  children: ReactNode;
};

export function Reveal({ as: Tag = "div", i = 0, className, children }: RevealProps) {
  const style = { "--i": i } as CSSProperties;
  return (
    <Tag className={cn("reveal", className)} style={style}>
      {children}
    </Tag>
  );
}
