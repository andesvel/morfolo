import { useState } from "react";
import type { ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { useMessages } from "../../i18n/index.ts";

export const TooltipProvider = TooltipPrimitive.Provider;

type HintProps = {
  /** What the hint explains, read by screen readers on the trigger. */
  label: string;
  children: ReactNode;
};

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
};

/**
 * Tooltip around any element, including disabled buttons: those ignore the
 * pointer, so the trigger is a focusable wrapper that receives hover and focus.
 */
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        <span tabIndex={0} className="block focus-visible:outline-offset-2">
          {children}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={8}
          collisionPadding={16}
          className="reveal z-50 max-w-sm border-2 border-ink bg-ink px-3 py-2 font-sans text-sm leading-snug text-bone shadow-hard-signal"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/**
 * A square "?" next to a label. Opens on hover and keyboard focus like a
 * tooltip, and on click/tap too (touch has no hover).
 */
export function Hint({ label, children }: HintProps) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={t.common.about(label)}
          onClick={() => setOpen((value) => !value)}
          className="label inline-flex size-5 shrink-0 items-center justify-center border border-ink bg-bone align-middle font-bold leading-none normal-case hover:border-signal hover:bg-signal hover:text-on-signal data-[state=delayed-open]:border-signal data-[state=delayed-open]:bg-signal data-[state=delayed-open]:text-on-signal data-[state=instant-open]:border-signal data-[state=instant-open]:bg-signal data-[state=instant-open]:text-on-signal"
        >
          ?
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="reveal z-50 max-w-xs border-2 border-ink bg-ink px-3 py-2 font-sans text-sm leading-snug text-bone shadow-hard-signal"
        >
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
