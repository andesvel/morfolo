import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DropZone } from "../components/convert/DropZone.tsx";
import { EngineDialog } from "../components/convert/EngineDialog.tsx";
import { FormatOptions } from "../components/convert/FormatOptions.tsx";
import { Queue } from "../components/convert/Queue.tsx";
import { SectionHeader } from "../components/layout/SectionHeader.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { Button } from "../components/ui/button.tsx";
import { Tooltip } from "../components/ui/tooltip.tsx";
import { useMessages } from "../i18n/index.ts";
import { cn } from "../lib/cn.ts";
import { formatLabel } from "../lib/format.ts";
import { CELL, CELLS, fillerClasses, GUTTER } from "../lib/grid.ts";
import { isRunnable, sharedTargets, useConversion } from "../stores/conversion.ts";
import type { Job } from "../stores/conversion.ts";
import type { Messages } from "../i18n/index.ts";

/** Why RUN is disabled, naming what is missing; null when it can run. */
function blockedReason(jobs: readonly Job[], running: boolean, t: Messages): string | null {
  const b = t.convert.blocked;
  if (running) return b.running;
  if (jobs.length === 0) return b.noFiles;
  if (jobs.some(isRunnable)) return null;
  const convertible = jobs.filter((job) => job.targets.length > 0);
  if (convertible.length === 0) return b.unsupported;
  const missing = convertible.filter((job) => !job.to && job.status !== "done");
  if (missing.length === 0) return b.allDone;
  const shown = missing.slice(0, 3).map((job) => job.file.name);
  return b.pickFormat(shown.join(", "), missing.length - shown.length);
}

function unique(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function ConvertView() {
  const t = useMessages();
  const jobs = useConversion((state) => state.jobs);
  const running = useConversion((state) => state.running);
  const addFiles = useConversion((state) => state.addFiles);
  const setTargetAll = useConversion((state) => state.setTargetAll);
  const clear = useConversion((state) => state.clear);
  const requestStart = useConversion((state) => state.requestStart);

  const pending = jobs.filter((job) => job.status !== "done" && job.targets.length > 0);
  const shared = sharedTargets(pending);
  // Keep the last non-empty chooser on screen while it collapses away.
  const [keptShared, setKeptShared] = useState(shared);
  if (shared.length > 0 && shared.join() !== keptShared.join()) setKeptShared(shared);
  const chooser = shared.length > 0 ? shared : keptShared;
  const runnable = jobs.filter(isRunnable);
  const targetsInUse = unique(pending.map((job) => job.to));
  const allSame = targetsInUse.length === 1 && pending.every((job) => job.to === targetsInUse[0]);
  const sources = unique(runnable.map((job) => job.from));
  const targets = unique(runnable.map((job) => job.to));
  const reason = blockedReason(jobs, running, t);

  const cta = (
    <Button
      variant="signal"
      size="lg"
      disabled={running || runnable.length === 0}
      onClick={() => void requestStart()}
      className="display h-24 gap-4 text-2xl md:text-4xl"
    >
      {running ? (
        t.convert.converting
      ) : sources.length === 1 && targets.length === 1 ? (
        <>
          {t.convert.cta} {formatLabel(sources[0] ?? "")}
          <ArrowRight aria-label={t.convert.ctaTo} className="size-8! md:size-10!" strokeWidth={3} />
          {formatLabel(targets[0] ?? "")}
        </>
      ) : runnable.length === 0 ? (
        t.convert.cta
      ) : (
        t.convert.ctaFiles(runnable.length)
      )}
    </Button>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 py-12 md:py-16">
      <div className={GUTTER}>
        <Reveal as="h1" className="display display-xl">
          {t.convert.title}
          <span className="text-signal">.</span>
        </Reveal>
        <Reveal as="p" i={1} className="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
          <span className="cut">{t.convert.intro}</span>
        </Reveal>
      </div>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={1}
          total={4}
          title={t.convert.sections.input.title}
          help={t.convert.sections.input.help}
        />
        <Reveal i={2}>
          <DropZone onFiles={addFiles} compact={jobs.length > 0} />
        </Reveal>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={2}
          total={4}
          title={t.convert.sections.target.title}
          help={t.convert.sections.target.help}
          aside={
            jobs.length > 0 && !running ? (
              <button type="button" onClick={clear} className="cut underline underline-offset-4 hover:text-signal">
                {t.convert.clearAll}
              </button>
            ) : null
          }
        />
        <div>
          <div className="collapse-box" data-open={shared.length > 0} inert={shared.length === 0}>
            <div>
              <div role="radiogroup" aria-label={t.convert.allToLabel} className={cn(CELLS, "mb-8 grid-cols-2 md:grid-cols-4")}>
                {chooser.map((to, index) => {
                  const selected = allSame && targetsInUse[0] === to;
                  return (
                    <Reveal key={to} i={index} className={CELL}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTargetAll(to)}
                        className={cn(
                          "flex h-20 w-full flex-col justify-between p-3 text-left focus-visible:-outline-offset-4",
                          selected ? "bg-signal text-on-signal" : "bg-bone hover:bg-bone-soft",
                        )}
                      >
                        <span className="label">{selected ? t.convert.selected : t.convert.allTo}</span>
                        <span className="font-display text-2xl uppercase">{formatLabel(to)}</span>
                      </button>
                    </Reveal>
                  );
                })}
                {fillerClasses(chooser.length, { base: 2, md: 4 }).map((className, index) => (
                  <div key={`filler-${index}`} aria-hidden className={className} />
                ))}
              </div>
            </div>
          </div>
          <Queue />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={3}
          total={4}
          title={t.convert.sections.parameters.title}
          help={t.convert.sections.parameters.help}
          aside={<span className="cut max-sm:hidden">{t.convert.sections.parameters.aside}</span>}
        />
        <FormatOptions formats={targetsInUse} />
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={4}
          total={4}
          title={t.convert.sections.run.title}
          help={t.convert.sections.run.help}
        />
        {/* A disabled button gets no hover, so the tooltip wraps it and names what is missing. */}
        {reason ? <Tooltip content={reason}>{cta}</Tooltip> : cta}
        {/* The reason is a sentence with file names: keep its real casing. */}
        <p className={cn("label text-ink-mute", reason && "normal-case", GUTTER)}>
          <span className="cut">{reason ?? t.convert.runHintReady(runnable.length)}</span>
        </p>
      </section>

      <EngineDialog />
    </div>
  );
}
