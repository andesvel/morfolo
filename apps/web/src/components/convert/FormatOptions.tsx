import { useState } from "react";
import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { useMessages } from "../../i18n/index.ts";
import { formatSpecs, visibleOptions } from "../../lib/format-options.ts";
import type { OptionSpec, OptionValue } from "../../lib/format-options.ts";
import { formatLabel } from "../../lib/format.ts";
import { useFormatValues, useSettings } from "../../stores/settings.ts";
import { ChoiceGroup } from "../ui/choice-group.tsx";
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
      <ChoiceGroup label={option.label} options={option.choices} value={value} onChange={onChange} />
    </Field>
  );
}

function FormatPanel({ mime }: { mime: string }) {
  const t = useMessages();
  const spec = formatSpecs(t.formats)[mime];
  const values = useFormatValues(mime);
  const setOption = useSettings((state) => state.setOption);
  const resetFormat = useSettings((state) => state.resetFormat);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  if (!spec) return <p className="label">{t.options.noOptions(formatLabel(mime))}</p>;

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
        <span className="label">{spec.lossless(values) ? t.options.lossless : t.options.lossy}</span>
      </div>

      {basic.length > 0 ? basic.map(field) : <p className="label text-ink-mute">{t.options.nothingToTune}</p>}

      {advanced.length > 0 && (
        <div className="flex flex-col gap-6">
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
            className="label flex h-10 items-center justify-between border border-ink bg-bone px-4 font-bold hover:bg-bone-soft"
          >
            {t.options.advanced(advanced.length)}
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
        {t.options.reset(formatLabel(mime))}
      </button>
    </div>
  );
}

export function FormatOptions({ formats }: { formats: readonly string[] }) {
  const t = useMessages();
  const [tab, setTab] = useState<string>();
  const current = tab && formats.includes(tab) ? tab : formats[0];

  if (!current) {
    return (
      <div className="border border-ink bg-bone px-4 py-6 sm:px-6">
        <p className="label text-ink-mute">{t.options.pickFormat}</p>
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
