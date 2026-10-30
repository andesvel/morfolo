import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("border-b border-ink", className)} {...props} />;
}

/** The open state shows as an inverted icon and bold question, not only color. */
export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-center justify-between gap-6 px-6 py-5 text-left font-bold hover:bg-bone-soft focus-visible:-outline-offset-4",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex size-8 shrink-0 items-center justify-center border border-ink group-data-[state=open]:border-signal group-data-[state=open]:bg-signal group-data-[state=open]:text-bone">
          <Plus aria-hidden className="size-4 group-data-[state=open]:hidden" />
          <Minus aria-hidden className="hidden size-4 group-data-[state=open]:block" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" className="accordion-content overflow-hidden" {...props}>
      <div className={cn("px-6 pb-6 text-sm leading-relaxed text-ink-soft", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
