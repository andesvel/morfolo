import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

/** Square toggle that also prints ON/OFF so state never relies on color. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group label inline-flex h-9 w-24 shrink-0 items-center border-2 border-ink bg-bone p-1 data-[state=checked]:border-signal data-[state=checked]:bg-signal disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 bg-ink data-[state=checked]:bg-bone" />
      <span className="flex-1 text-center font-bold group-data-[state=checked]:-order-1 group-data-[state=checked]:text-bone">
        <span className="group-data-[state=checked]:hidden">OFF</span>
        <span className="hidden group-data-[state=checked]:inline">ON</span>
      </span>
    </SwitchPrimitive.Root>
  );
}
