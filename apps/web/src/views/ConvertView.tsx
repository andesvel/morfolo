import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DropZone } from "../components/convert/DropZone.tsx";
import { EngineDialog } from "../components/convert/EngineDialog.tsx";
import { FormatOptions } from "../components/convert/FormatOptions.tsx";
import { Queue } from "../components/convert/Queue.tsx";
import { SectionHeader } from "../components/layout/SectionHeader.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { Button } from "../components/ui/button.tsx";
import { cn } from "../lib/cn.ts";
import { formatLabel } from "../lib/format.ts";
import { CELL, CELLS, fillerClasses, GUTTER } from "../lib/grid.ts";
import { isRunnable, sharedTargets, useConversion } from "../stores/conversion.ts";

function unique(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function ConvertView() {
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 py-12 md:py-16">
      <div className={GUTTER}>
        <Reveal as="h1" className="display display-xl">
          CONVERT<span className="text-signal">.</span>
        </Reveal>
        <Reveal as="p" i={1} className="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
          <span className="cut">Add files, pick an output format per file or for all of them, and convert. Everything runs in this tab.</span>
        </Reveal>
      </div>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={1}
          total={4}
          title="INPUT"
          help="Drop or pick any number of images, audio or video files. They are read into memory in this tab, never uploaded."
        />
        <Reveal i={2}>
          <DropZone onFiles={addFiles} compact={jobs.length > 0} />
        </Reveal>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={2}
          total={4}
          title="TARGET"
          help="ALL TO sets one output format for every file that supports it. Each row can still pick its own."
          aside={
            jobs.length > 0 && !running ? (
              <button type="button" onClick={clear} className="cut underline underline-offset-4 hover:text-signal">
                CLEAR ALL
              </button>
            ) : null
          }
        />
        <div>
          <div className="collapse-box" data-open={shared.length > 0} inert={shared.length === 0}>
            <div>
              <div role="radiogroup" aria-label="Convert all to" className={cn(CELLS, "mb-8 grid-cols-2 md:grid-cols-4")}>
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
                          selected ? "bg-signal text-bone" : "bg-bone hover:bg-bone-soft",
                        )}
                      >
                        <span className="label">{selected ? "SELECTED" : "ALL TO"}</span>
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
          title="PARAMETERS"
          help="One tab per output format in the queue. Changes apply to every file going to that format and are remembered in this browser."
          aside={<span className="cut max-sm:hidden">PER FORMAT · SAVED AS DEFAULTS</span>}
        />
        <FormatOptions formats={targetsInUse} />
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader
          index={4}
          total={4}
          title="RUN"
          help="Converts every row that has a format, one after another. Use CONVERT on a row to run just that file."
        />
        <Button
          variant="signal"
          size="lg"
          disabled={running || runnable.length === 0}
          onClick={() => void requestStart()}
          className="display h-24 gap-4 text-2xl md:text-4xl"
        >
          {running ? (
            "CONVERTING"
          ) : sources.length === 1 && targets.length === 1 ? (
            <>
              CONVERT {formatLabel(sources[0] ?? "")}
              <ArrowRight aria-label="to" className="size-8! md:size-10!" strokeWidth={3} />
              {formatLabel(targets[0] ?? "")}
            </>
          ) : (
            runnable.length === 0 ? "CONVERT" : `CONVERT ${runnable.length} FILES`
          )}
        </Button>
        <p className={cn("label text-ink-mute", GUTTER)}>
          <span className="cut">
            {runnable.length === 0
              ? "ADD A FILE AND PICK A FORMAT TO ENABLE. OR USE CONVERT ON A SINGLE ROW."
              : `${runnable.length} ${runnable.length === 1 ? "FILE" : "FILES"} READY.`}
          </span>
        </p>
      </section>

      <EngineDialog />
    </div>
  );
}
