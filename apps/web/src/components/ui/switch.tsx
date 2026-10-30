import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { useMessages } from "../../i18n/index.ts";
import { cn } from "../../lib/cn.ts";

/** Square toggle that also prints ON/OFF so state never relies on color. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  const t = useMessages();
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group label inline-flex h-9 w-24 shrink-0 items-center border-2 border-ink bg-bone p-1 data-[state=checked]:border-signal data-[state=checked]:bg-signal disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 bg-ink data-[state=checked]:bg-on-signal" />
      <span className="flex-1 text-center font-bold group-data-[state=checked]:-order-1 group-data-[state=checked]:text-on-signal">
        <span className="group-data-[state=checked]:hidden">{t.common.off}</span>
        <span className="hidden group-data-[state=checked]:inline">{t.common.on}</span>
      </span>
    </SwitchPrimitive.Root>
  );
}
