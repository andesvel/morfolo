import { useEffect } from "react";
import type { ReactNode } from "react";
import { Cpu, HardDrive } from "lucide-react";
import { SectionHeader } from "../components/layout/SectionHeader.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { Button } from "../components/ui/button.tsx";
import { Switch } from "../components/ui/switch.tsx";
import { Hint } from "../components/ui/tooltip.tsx";
import { cn } from "../lib/cn.ts";
import { GUTTER } from "../lib/grid.ts";
import { useConversion } from "../stores/conversion.ts";
import { ENGINE_SIZE_LABEL, useEngine } from "../stores/engine.ts";
import { useSettings } from "../stores/settings.ts";

const ENGINE_LABEL = {
  idle: "NOT LOADED",
  loading: "LOADING",
  ready: "LOADED",
  error: "ERROR: FAILED TO LOAD",
} as const;

/** One setting per row, laid on the grid: title | hint (2 cols) | control. */
type RowProps = { id: string; title: string; hint: ReactNode; help: string; control: ReactNode };

function Row({ id, title, hint, help, control }: RowProps) {
  return (
    <div className="grid items-center gap-y-3 border-b border-bone-deep py-6 last:border-b-0 md:grid-cols-4">
      <div className={cn("flex items-center gap-2", GUTTER)}>
        <label htmlFor={id} className="font-bold uppercase">
          <span className="cut">{title}</span>
        </label>
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
  const settings = useSettings();
  const engine = useEngine();
  const { refresh } = engine;
  const jobs = useConversion((state) => state.jobs.length);
  const running = useConversion((state) => state.running);
  const clear = useConversion((state) => state.clear);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 py-12 md:py-16">
      <div className={GUTTER}>
        <Reveal as="h1" className="display display-xl">
          SETTINGS<span className="text-signal">.</span>
        </Reveal>
        <Reveal as="p" i={1} className="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
          <span className="cut">
            Preferences are saved in this browser. Your files are never stored, only kept in memory while this tab is open.
          </span>
        </Reveal>
      </div>

      <section className="flex flex-col gap-2">
        <SectionHeader index={1} total={3} title="OUTPUT" help="How converted files are named and saved." />
        <Reveal i={2}>
          <Row
            id="name-suffix"
            title="Name suffix"
            help="Text added to every converted file's name. Leave it empty to keep the original name with the new extension."
            hint="ADDED BEFORE THE EXTENSION: PHOTO.PNG BECOMES PHOTO-WEB.WEBP. OPTIONAL."
            control={
              <input
                id="name-suffix"
                value={settings.nameSuffix}
                placeholder="-WEB"
                maxLength={32}
                onChange={(event) => settings.set({ nameSuffix: event.target.value })}
                className="h-14 w-full border-2 border-ink bg-bone px-4 font-mono text-base md:w-full"
              />
            }
          />
          <Row
            id="auto-download"
            title="Auto download"
            help="Saves each result the moment it finishes. Your browser may ask once to allow several downloads from this page."
            hint="SAVE EACH FILE AS SOON AS IT FINISHES."
            control={
              <Switch
                id="auto-download"
                checked={settings.autoDownload}
                onCheckedChange={(checked) => settings.set({ autoDownload: checked })}
              />
            }
          />
        </Reveal>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader
          index={2}
          total={3}
          title="ENGINE"
          help={`ffmpeg.wasm converts audio and video. It is downloaded once (${ENGINE_SIZE_LABEL}) from the unpkg CDN and kept in this browser's Cache Storage. CLEAR CACHE deletes it and unloads it from memory.`}
        />
        <Reveal i={3} className="flex flex-col">
          <div className="mt-6 flex flex-col gap-4 border border-ink bg-bone-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <StatusLine icon={<Cpu aria-hidden className="size-4" />}>
                FFMPEG: {ENGINE_LABEL[engine.status]}
                {engine.status === "loading" && engine.pct !== null && ` ${Math.round(engine.pct)}%`}
              </StatusLine>
              <StatusLine icon={<HardDrive aria-hidden className="size-4" />}>
                CACHE: {engine.cached === null ? "CHECKING" : engine.cached ? `STORED · ${ENGINE_SIZE_LABEL}` : "EMPTY"}
              </StatusLine>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={engine.status === "loading" || engine.status === "ready"}
                onClick={() => void engine.warm()}
              >
                {engine.status === "ready" ? "LOADED" : "LOAD NOW"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={engine.status === "loading" || running || (!engine.cached && engine.status !== "ready")}
                onClick={() => void engine.clearCache()}
              >
                CLEAR CACHE
              </Button>
            </div>
          </div>
          <Row
            id="preload-engine"
            title="Preload ffmpeg"
            help="Loads the audio and video engine when Morfolo opens, so the first conversion starts right away. From cache it takes a moment; the first time it downloads."
            hint={`LOAD THE AUDIO/VIDEO ENGINE WHEN THE APP OPENS. THE FIRST TIME THAT IS A ${ENGINE_SIZE_LABEL} DOWNLOAD.`}
            control={
              <Switch
                id="preload-engine"
                checked={settings.preloadEngine}
                onCheckedChange={(checked) => settings.set({ preloadEngine: checked })}
              />
            }
          />
        </Reveal>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader index={3} total={3} title="DATA" help="What Morfolo keeps: files only in memory, preferences in this browser." />
        <Reveal i={4}>
          <Row
            id="clear-queue"
            title="Clear queue"
            help="Removes every file and converted result from memory. Downloaded files on your disk are not touched."
            hint={
              jobs === 0
                ? "THE QUEUE IS EMPTY."
                : `REMOVE ${jobs} ${jobs === 1 ? "FILE AND ITS RESULT" : "FILES AND THEIR RESULTS"} FROM MEMORY.`
            }
            control={
              <Button id="clear-queue" variant="secondary" disabled={jobs === 0 || running} onClick={clear}>
                CLEAR
              </Button>
            }
          />
          <Row
            id="reset-settings"
            title="Reset preferences"
            help="Restores defaults for format options, the name suffix, auto download and preload. The engine cache stays; clear it above."
            hint="RESTORE FORMAT OPTIONS, NAMING AND ENGINE DEFAULTS."
            control={
              <Button id="reset-settings" variant="primary" onClick={settings.reset}>
                RESET
              </Button>
            }
          />
        </Reveal>
      </section>
    </div>
  );
}
