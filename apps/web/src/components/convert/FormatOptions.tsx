import { useState } from "react";
import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { FORMAT_SPECS, visibleOptions } from "../../lib/format-options.ts";
import type { OptionSpec, OptionValue } from "../../lib/format-options.ts";
import { formatLabel } from "../../lib/format.ts";
import { useFormatValues, useSettings } from "../../stores/settings.ts";
import { Slider } from "../ui/slider.tsx";
import { Hint } from "../ui/tooltip.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";

type FieldProps = { label: string; value?: string; hint?: string; help?: string; children: ReactNode };

function Field({ label, value, hint, help, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label flex items-center gap-2">
          {label}
          {help && <Hint label={label}>{help}</Hint>}
        </span>
        {value && <span className="font-mono text-lg font-medium">{value}</span>}
      </div>
      {children}
      {hint && <span className="label text-ink-mute">{hint}</span>}
    </div>
  );
}

function OptionField({ option, value, onChange }: { option: OptionSpec; value: OptionValue; onChange: (value: OptionValue) => void }) {
  if (option.kind === "range") {
    const current = typeof value === "number" ? value : option.default;
    return (
      <Field label={option.label} value={option.display(current)} hint={option.hint} help={option.help}>
        <Slider
          aria-label={option.label}
          min={option.min}
          max={option.max}
          step={option.step}
          value={[current]}
          onValueChange={([next]) => next !== undefined && onChange(next)}
        />
      </Field>
    );
  }

  return (
    <Field label={option.label} help={option.help}>
      <div role="radiogroup" aria-label={option.label} className="flex flex-wrap">
        {option.choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              key={choice.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(choice.value)}
              className={
                selected
                  ? "label relative z-10 -ml-px h-10 border border-signal bg-signal px-4 font-bold text-bone first:ml-0"
                  : "label -ml-px h-10 border border-ink bg-bone px-4 first:ml-0 hover:bg-bone-soft"
              }
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function FormatPanel({ mime }: { mime: string }) {
  const spec = FORMAT_SPECS[mime];
  const values = useFormatValues(mime);
  const setOption = useSettings((state) => state.setOption);
  const resetFormat = useSettings((state) => state.resetFormat);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  if (!spec) return <p className="label">NO OPTIONS FOR {formatLabel(mime)}.</p>;

  const visible = visibleOptions(spec, values);
  const basic = visible.filter((option) => !option.advanced);
  const advanced = visible.filter((option) => option.advanced);
  const field = (option: OptionSpec) => (
    <OptionField
      key={option.key}
      option={option}
      value={values[option.key] ?? null}
      onChange={(value) => setOption(mime, option.key, value)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-bone-deep pb-4">
        <span className="label font-bold">{spec.summary(values)}</span>
        <span className="label">{spec.lossless(values) ? "LOSSLESS" : "LOSSY"}</span>
      </div>

      {basic.length > 0 ? basic.map(field) : <p className="label text-ink-mute">NOTHING TO TUNE. OPEN ADVANCED FOR SIZE.</p>}

      {advanced.length > 0 && (
        <div className="flex flex-col gap-6">
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
            className="label flex h-10 items-center justify-between border border-ink bg-bone px-4 font-bold hover:bg-bone-soft"
          >
            ADVANCED · {advanced.length} {advanced.length === 1 ? "OPTION" : "OPTIONS"}
            {advancedOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
          </button>
          {advancedOpen && <div className="reveal flex flex-col gap-6">{advanced.map(field)}</div>}
        </div>
      )}

      <button
        type="button"
        onClick={() => resetFormat(mime)}
        className="label self-start underline underline-offset-4 hover:text-signal"
      >
        RESET {formatLabel(mime)} TO DEFAULTS
      </button>
    </div>
  );
}

export function FormatOptions({ formats }: { formats: readonly string[] }) {
  const [tab, setTab] = useState<string>();
  const current = tab && formats.includes(tab) ? tab : formats[0];

  if (!current) {
    return (
      <div className="border border-ink bg-bone px-4 py-6 sm:px-6">
        <p className="label text-ink-mute">PICK AN OUTPUT FORMAT TO SEE ITS OPTIONS.</p>
      </div>
    );
  }

  return (
    <Tabs value={current} onValueChange={setTab}>
      <TabsList className="flex-wrap">
        {formats.map((mime) => (
          <TabsTrigger key={mime} value={mime}>
            {formatLabel(mime)}
          </TabsTrigger>
        ))}
      </TabsList>
      {formats.map((mime) => (
        <TabsContent key={mime} value={mime}>
          <FormatPanel mime={mime} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
