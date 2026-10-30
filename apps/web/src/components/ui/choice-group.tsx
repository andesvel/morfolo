import { cn } from "../../lib/cn.ts";

type ChoiceGroupProps<T> = {
  label: string;
  options: readonly { value: T; label: string; lang?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Joined square chips acting as a radio group; the selected one is a signal fill. */
export function ChoiceGroup<T>({ label, options, value, onChange, className }: ChoiceGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={option.lang}
            onClick={() => onChange(option.value)}
            className={
              selected
                ? "label relative z-10 -ml-px h-10 border border-signal bg-signal px-4 font-bold text-on-signal first:ml-0"
                : "label -ml-px h-10 border border-ink bg-bone px-4 first:ml-0 hover:bg-bone-soft"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
