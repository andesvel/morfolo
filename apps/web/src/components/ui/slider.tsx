import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex h-8 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow border border-ink bg-bone">
        <SliderPrimitive.Range className="absolute h-full bg-ink" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-6 border-2 border-ink bg-signal hover:shadow-hard-sm" />
    </SliderPrimitive.Root>
  );
}
