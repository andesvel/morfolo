import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex border border-ink", className)}
      {...props}
    />
  );
}

/** Selected tab is inverted (ink fill, bone text), not just recolored. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "label flex h-11 flex-1 items-center justify-center gap-2 border-r border-ink bg-bone last:border-r-0 hover:bg-bone-soft data-[state=active]:bg-ink data-[state=active]:font-bold data-[state=active]:text-bone disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("reveal border border-t-0 border-ink bg-bone p-6", className)}
      {...props}
    />
  );
}
