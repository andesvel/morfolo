import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      {/* Solid scrim, no blur: the page behind is dimmed, never frosted. */}
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim/70" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "reveal fixed inset-0 z-50 m-auto h-fit w-11/12 max-w-lg border-2 border-ink bg-bone shadow-hard-lg",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("display display-lg", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-base leading-relaxed text-ink-soft", className)} {...props} />;
}
