import { useRef } from "react";
import { ArrowDown, ArrowUpRight, Asterisk, Crosshair } from "lucide-react";
import { Link, useLocation } from "wouter";
import { FORMATS, targetsFor } from "@morfolo/core";
import { DropZone } from "../components/convert/DropZone.tsx";
import { GithubMark } from "../components/layout/GithubMark.tsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { useMessages } from "../i18n/index.ts";
import { cn } from "../lib/cn.ts";
import { formatLabel, KINDS, pad2 } from "../lib/format.ts";
import { CELL, CELLS, GUTTER } from "../lib/grid.ts";
import { useConversion } from "../stores/conversion.ts";

/** Real input/output lists per media kind, read from the core's tables. */
const CAPABILITIES = KINDS.map((kind) => {
  const inputs = FORMATS.filter((format) => format.mime.startsWith(`${kind}/`)).map((format) => format.mime);
  const outputs = [...new Set(inputs.flatMap((mime) => targetsFor(mime)))].filter((mime) =>
    mime.startsWith(`${kind}/`),
  );
  return { kind, inputs, outputs };
});

const INPUT_COUNT = FORMATS.length;
const OUTPUT_COUNT = new Set(FORMATS.flatMap((format) => targetsFor(format.mime))).size;

export function LandingView() {
  const t = useMessages();
  const l = t.landing;
  const [, navigate] = useLocation();
  const addFiles = useConversion((state) => state.addFiles);
  const details = useRef<HTMLElement>(null);

  const onFiles = (files: File[]) => {
    addFiles(files);
    navigate("/convert");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative grid overflow-hidden hero-fill content-end pt-28 pb-24 md:grid-cols-4 md:items-end md:pt-20">
        {/* Signal block on the grid's last column (half width below md): the format table, counted.
            Below md it spans the text column, so the hero's top padding clears its h-28. */}
        <Reveal
          i={2}
          className="@container absolute top-0 right-0 left-1/2 z-10 flex h-28 flex-col justify-between bg-signal p-4 text-on-signal sm:p-6 md:left-3/4 md:h-40"
        >
          <span className="label flex items-center justify-between">
            {l.formatTable} <Asterisk aria-hidden className="size-4" />
          </span>
          {/* Each count stays glued to its label; wrapping happens between the pairs. */}
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-display uppercase leading-none">
            <span className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="fit-count">{INPUT_COUNT}</span>
              <span className="label">{l.in}</span>
            </span>
            <span className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="fit-count">{OUTPUT_COUNT}</span>
              <span className="label">{l.out}</span>
            </span>
          </span>
        </Reveal>
        <div
          aria-hidden
          className="display display-hero text-ghost pointer-events-none absolute top-4 left-0 whitespace-nowrap select-none"
        >
          MORFOLO
        </div>
        <h1 className={cn("display display-hero relative mt-6 md:col-span-3", GUTTER)}>
          {l.heroLines.map((line, index) => (
            <Reveal as="span" key={line} i={index} className="block">
              {line}
              <span className={index === l.heroLines.length - 1 ? "text-signal" : undefined}>.</span>
            </Reveal>
          ))}
        </h1>
        <div className={cn("relative flex flex-col justify-end gap-6 pt-12 md:pt-0", GUTTER)}>
          <Reveal as="p" i={2} className="text-base leading-relaxed text-ink-soft">
            <span className="cut">{l.intro}</span>
          </Reveal>
          <Reveal i={3}>
            <Link
              href="/convert"
              className="flex items-center justify-between border-b-2 border-ink bg-bone pb-2 font-bold uppercase hover:text-signal"
            >
              {l.start}
              <ArrowUpRight className="size-5" />
            </Link>
          </Reveal>
          <Reveal i={4}>
            <a
              href="https://github.com/andesvel/morfolo"
              rel="noreferrer"
              target="_blank"
              className="label flex items-center gap-2 text-ink-mute hover:text-signal"
            >
              <GithubMark className="size-4" />
              <span className="cut">{l.openSource}</span>
              <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </Reveal>
        </div>
        {/* Scroll cue: names what is below and drifts down, so the fold reads as a door, not an end. */}
        <Reveal i={5} className={cn("absolute bottom-8 left-0", GUTTER)}>
          <button
            type="button"
            onClick={() => details.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="label group flex items-center gap-3"
          >
            <span className="flex size-8 items-center justify-center overflow-hidden bg-signal text-on-signal group-hover:bg-ink group-hover:text-bone">
              <ArrowDown aria-hidden className="scroll-cue size-4" />
            </span>
            <span className="cut">{l.scrollCue}</span>
          </button>
        </Reveal>
      </section>

      <section ref={details} className={cn(CELLS, "scroll-below-header md:grid-cols-4")}>
        <Reveal i={5} className={cn(CELL, "@container flex flex-col justify-between gap-12 bg-signal p-6 text-on-signal")}>
          <span className="label">{l.privacyLabel}</span>
          <div className="flex flex-col gap-4">
            <p className="fit-cell font-display leading-none uppercase">{l.privacyTitle}</p>
            <p className="text-sm leading-relaxed">{l.privacyText}</p>
          </div>
        </Reveal>
        {CAPABILITIES.map(({ kind, inputs, outputs }, index) => (
          <Reveal key={kind} i={6 + index} className={cn(CELL, "flex flex-col justify-between gap-10 bg-bone p-6")}>
            <div className="flex items-center justify-between">
              <span className="label font-bold">{l.kinds[kind]}</span>
              <Crosshair aria-hidden className="size-4" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="slashes font-display text-2xl leading-tight uppercase">
                {inputs.map((mime) => (
                  <span key={mime} className="inline-block">
                    {formatLabel(mime)}
                  </span>
                ))}
              </p>
              <p className="label">
                <span>{l.out} </span>
                <span className="slashes">
                  {outputs.map((mime) => (
                    <span key={mime} className="inline-block">
                      {formatLabel(mime)}
                    </span>
                  ))}
                </span>
              </p>
              <p className="label text-ink-mute">{l.engineByKind[kind]}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="grid py-16 md:grid-cols-4">
        <div className={cn("pb-8", GUTTER)}>
          <Reveal as="h2" className="display display-lg">
            {l.howTitle}
            <span className="text-signal">.</span>
          </Reveal>
        </div>
        <ol className={cn(CELLS, "sm:grid-cols-3 md:col-span-3")}>
          {l.steps.map((step, index) => (
            <Reveal as="li" key={step.title} i={index + 1} className={cn(CELL, "flex flex-col gap-6 bg-bone p-6")}>
              <span className="label">{l.step(pad2(index + 1))}</span>
              <span className="font-display text-2xl uppercase">
                {step.title}
                <span className="text-signal">.</span>
              </span>
              <span className="text-sm leading-relaxed text-ink-soft">{step.text}</span>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="grid pb-16 md:grid-cols-4">
        <div className={cn("pb-8", GUTTER)}>
          <Reveal as="h2" className="display display-lg">
            {l.faqTitle}
            <span className="text-signal">.</span>
          </Reveal>
        </div>
        <Reveal i={1} className="relative border border-ink bg-bone md:col-span-3">
          <Accordion type="single" collapsible>
            {l.faq.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="last:border-b-0">
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      <section className="pb-16">
        <Reveal>
          <DropZone onFiles={onFiles} compact />
        </Reveal>
      </section>
    </div>
  );
}
