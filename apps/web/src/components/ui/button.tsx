import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans text-sm font-bold uppercase tracking-wide whitespace-nowrap ease-press select-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-sm active:translate-x-0 active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:border-2 disabled:border-dashed disabled:border-on-signal-tint disabled:bg-signal-tint disabled:text-on-signal-tint [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-signal text-on-signal",
        secondary: "border-2 border-ink bg-bone text-ink",
        signal: "bg-signal text-on-signal",
        ghost: "bg-bone text-ink hover:translate-x-0 hover:translate-y-0 hover:bg-bone-soft hover:shadow-none",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-12 px-5",
        lg: "h-18 w-full px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
