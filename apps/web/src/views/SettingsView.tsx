import { useEffect } from "react";
import type { ReactNode } from "react";
import { Cpu, HardDrive } from "lucide-react";
import { SectionHeader } from "../components/layout/SectionHeader.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { Button } from "../components/ui/button.tsx";
import { ChoiceGroup } from "../components/ui/choice-group.tsx";
import { Switch } from "../components/ui/switch.tsx";
import { Hint } from "../components/ui/tooltip.tsx";
import { messagesFor, useMessages } from "../i18n/index.ts";
import { cn } from "../lib/cn.ts";
import { GUTTER } from "../lib/grid.ts";
import { useConversion } from "../stores/conversion.ts";
import { useEngine } from "../stores/engine.ts";
import { useSettings } from "../stores/settings.ts";
import type { LocalePreference, ThemePreference } from "../stores/settings.ts";

/** One setting per row, laid on the grid: title | hint (2 cols) | control. Controls carry their own aria-label. */
type RowProps = { id: string; title: string; hint: ReactNode; help: string; control: ReactNode };

function Row({ id, title, hint, help, control }: RowProps) {
  return (
    <div className="grid items-center gap-y-3 border-b border-bone-deep py-6 last:border-b-0 md:grid-cols-4">
      <div className={cn("flex items-center gap-2", GUTTER)}>
        <h3 id={`${id}-title`} className="font-bold uppercase">
          <span className="cut">{title}</span>
        </h3>
        <Hint label={title}>{help}</Hint>
      </div>
      <p className={cn("label text-ink-mute md:col-span-2", GUTTER)}>
        <span className="cut">{hint}</span>
      </p>
      <div className={cn("md:flex md:justify-end", GUTTER)}>{control}</div>
    </div>
  );
}

function StatusLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="label flex items-center gap-3 font-bold">
      {icon}
      {children}
    </span>
  );
}

export function SettingsView() {
  const t = useMessages();
  const s = t.settings;
  const settings = useSettings();
  const engine = useEngine();
  const { refresh } = engine;
  const jobs = useConversion((state) => state.jobs.length);
  const running = useConversion((state) => state.running);
  const clear = useConversion((state) => state.clear);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const themes: readonly { value: ThemePreference; label: string }[] = [
    { value: "system", label: t.header.theme.system },
    { value: "light", label: t.header.theme.light },
    { value: "dark", label: t.header.theme.dark },
  ];
  // Each language is named in itself, so it can be found from either one.
  const locales: readonly { value: LocalePreference; label: string; lang?: string }[] = [
    { value: "auto", label: s.language.auto },
    { value: "en", label: messagesFor("en").meta.name.toUpperCase(), lang: "en" },
    { value: "es", label: messagesFor("es").meta.name.toUpperCase(), lang: "es" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 py-12 md:py-16">
      <div className={GUTTER}>
        <Reveal as="h1" className="display display-xl">
          {s.title}
          <span className="text-signal">.</span>
        </Reveal>
        <Reveal as="p" i={1} className="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
          <span className="cut">{s.intro}</span>
        </Reveal>
      </div>

      <section className="flex flex-col gap-2">
        <SectionHeader index={1} total={4} title={s.sections.interface.title} help={s.sections.interface.help} />
        <Reveal i={2}>
          <Row
            id="theme"
            title={s.theme.title}
            help={s.theme.help}
            hint={s.theme.hint}
            control={
              <ChoiceGroup
                label={s.theme.title}
                options={themes}
                value={settings.theme}
                onChange={(theme) => settings.set({ theme })}
              />
            }
          />
          <Row
            id="language"
            title={s.language.title}
            help={s.language.help}
            hint={s.language.hint}
            control={
              <ChoiceGroup
                label={s.language.title}
                options={locales}
                value={settings.locale}
                onChange={(locale) => settings.set({ locale })}
              />
            }
          />
        </Reveal>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader index={2} total={4} title={s.sections.output.title} help={s.sections.output.help} />
        <Reveal i={3}>
          <Row
            id="name-suffix"
            title={s.suffix.title}
            help={s.suffix.help}
            hint={s.suffix.hint}
            control={
              <input
                id="name-suffix"
                aria-label={s.suffix.title}
                value={settings.nameSuffix}
                placeholder={s.suffix.placeholder}
                maxLength={32}
                onChange={(event) => settings.set({ nameSuffix: event.target.value })}
                className="h-14 w-full border-2 border-ink bg-bone px-4 font-mono text-base md:w-full"
              />
            }
          />
          <Row
            id="auto-download"
            title={s.autoDownload.title}
            help={s.autoDownload.help}
            hint={s.autoDownload.hint}
            control={
              <Switch
                aria-label={s.autoDownload.title}
                checked={settings.autoDownload}
                onCheckedChange={(checked) => settings.set({ autoDownload: checked })}
              />
            }
          />
        </Reveal>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader index={3} total={4} title={s.sections.engine.title} help={s.sections.engine.help} />
        <Reveal i={4} className="flex flex-col">
          <div className="mt-6 flex flex-col gap-4 border border-ink bg-bone-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <StatusLine icon={<Cpu aria-hidden className="size-4" />}>
                {s.engineStatus.label}: {s.engineStatus[engine.status]}
                {engine.status === "loading" && engine.pct !== null && ` ${Math.round(engine.pct)}%`}
              </StatusLine>
              <StatusLine icon={<HardDrive aria-hidden className="size-4" />}>
                {s.engineStatus.cache}:{" "}
                {engine.cached === null
                  ? s.engineStatus.checking
                  : engine.cached
                    ? s.engineStatus.stored
                    : s.engineStatus.empty}
              </StatusLine>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={engine.status === "loading" || engine.status === "ready"}
                onClick={() => void engine.warm()}
              >
                {engine.status === "ready" ? s.engineStatus.loaded : s.engineStatus.loadNow}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={engine.status === "loading" || running || (!engine.cached && engine.status !== "ready")}
                onClick={() => void engine.clearCache()}
              >
                {s.engineStatus.clearCache}
              </Button>
            </div>
          </div>
          <Row
            id="preload-engine"
            title={s.preload.title}
            help={s.preload.help}
            hint={s.preload.hint}
            control={
              <Switch
                aria-label={s.preload.title}
                checked={settings.preloadEngine}
                onCheckedChange={(checked) => settings.set({ preloadEngine: checked })}
              />
            }
          />
        </Reveal>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader index={4} total={4} title={s.sections.data.title} help={s.sections.data.help} />
        <Reveal i={5}>
          <Row
            id="clear-queue"
            title={s.clearQueue.title}
            help={s.clearQueue.help}
            hint={jobs === 0 ? s.clearQueue.empty : s.clearQueue.hint(jobs)}
            control={
              <Button id="clear-queue" variant="secondary" disabled={jobs === 0 || running} onClick={clear}>
                {s.clearQueue.action}
              </Button>
            }
          />
          <Row
            id="reset-settings"
            title={s.reset.title}
            help={s.reset.help}
            hint={s.reset.hint}
            control={
              <Button id="reset-settings" variant="primary" onClick={settings.reset}>
                {s.reset.action}
              </Button>
            }
          />
        </Reveal>
      </section>
    </div>
  );
}
