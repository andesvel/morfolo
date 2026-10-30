import { flushSync } from "react-dom";
import type { AroundNavHandler } from "wouter";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** wouter navigation wrapped in the View Transitions API, when available. */
export const aroundNav: AroundNavHandler = (navigate, to, options) => {
  const go = () => {
    navigate(to, options);
    window.scrollTo(0, 0);
  };

  if (!("startViewTransition" in document) || prefersReducedMotion()) {
    go();
    return;
  }

  document.startViewTransition(() => {
    flushSync(go);
  });
};
