import { useRef } from "react";
import { ArrowDown, ArrowUpRight, Asterisk, Crosshair } from "lucide-react";
import { Link, useLocation } from "wouter";
import { FORMATS, targetsFor } from "@morfolo/core";
import { DropZone } from "../components/convert/DropZone.tsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion.tsx";
import { Reveal } from "../components/motion/Reveal.tsx";
import { cn } from "../lib/cn.ts";
import { formatLabel, KINDS, pad2 } from "../lib/format.ts";
import { CELL, CELLS, GUTTER } from "../lib/grid.ts";
import { useConversion } from "../stores/conversion.ts";
import { ENGINE_SIZE_LABEL } from "../stores/engine.ts";

const ENGINE_BY_KIND = {
  image: "CANVAS IN A WEB WORKER",
  audio: `FFMPEG.WASM · ${ENGINE_SIZE_LABEL} ONCE`,
  video: `FFMPEG.WASM · ${ENGINE_SIZE_LABEL} ONCE`,
} as const;

const STEPS = [
  { title: "DROP", text: "Add one file or a batch. They are read in memory, never uploaded." },
  { title: "PICK", text: "Choose the output format and, if you want, codec, quality or bitrate." },
  { title: "SAVE", text: "Download each result. Close the tab and the files are gone from memory." },
] as const;

/** Real input/output lists per media kind, read from the core's tables. */
const CAPABILITIES = KINDS.map((kind) => {
  const inputs = FORMATS.filter((format) => format.mime.startsWith(`${kind}/`)).map((format) => format.mime);
  const outputs = [...new Set(inputs.flatMap((mime) => targetsFor(mime)))].filter((mime) =>
    mime.startsWith(`${kind}/`),
  );
  return { kind, inputs, outputs };
});

const FAQ = [
  {
    q: "Are my files uploaded anywhere?",
    a: "No. Images are converted with the browser's canvas inside a Web Worker, audio and video with ffmpeg compiled to WebAssembly, all in this tab. The files never leave your device; the only download is the ffmpeg engine itself.",
  },
  {
    q: "Why does audio or video ask me to download something?",
    a: `Those formats need ffmpeg.wasm, a ${ENGINE_SIZE_LABEL} engine fetched once from the unpkg CDN. It is then kept in this browser's cache and loads from disk next time. You can clear it in Settings.`,
  },
  {
    q: "Is there a file size limit?",
    a: "There is no limit set by Morfolo; files are held in memory while you convert. The practical ceiling is your device's RAM, and ffmpeg.wasm cannot handle single files above about 2 GB.",
  },
  {
    q: "Why is video slower than on a desktop app?",
    a: "The engine runs single-threaded WebAssembly on your CPU. For quicker results pick a faster encoder speed, a higher CRF, or a smaller size in the advanced options.",
  },
  {
    q: "What is the difference between lossless and lossy?",
    a: "Lossless formats (PNG, FLAC, WAV, ALAC in M4A) keep every bit of the original. Lossy ones (JPG, WEBP, MP3, AAC, Opus, video codecs) discard detail you are unlikely to notice to make files much smaller. Each format's panel says which one you get.",
  },
  {
    q: "Does it work offline?",
    a: "Once the page is open, image conversions need no network. Audio and video also work offline after the engine is cached. There is no installable offline app yet.",
  },
] as const;

const INPUT_COUNT = FORMATS.length;
const OUTPUT_COUNT = new Set(FORMATS.flatMap((format) => targetsFor(format.mime))).size;

export function LandingView() {
  const [, navigate] = useLocation();
  const addFiles = useConversion((state) => state.addFiles);
  const details = useRef<HTMLElement>(null);

  const onFiles = (files: File[]) => {
    addFiles(files);
    navigate("/convert");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative grid overflow-hidden hero-fill content-end pt-12 pb-28 md:grid-cols-4 md:items-end md:pt-20">
        {/* Signal block on the grid's last column (half width below md): the format table, counted. */}
        <Reveal
          i={2}
          className="@container absolute top-0 right-0 left-1/2 flex h-28 flex-col justify-between bg-signal p-4 text-bone sm:p-6 md:left-3/4 md:h-40"
        >
          <span className="label flex items-center justify-between">
            FORMAT TABLE <Asterisk aria-hidden className="size-4" />
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 font-display uppercase leading-none">
            <span className="fit-count">{INPUT_COUNT}</span>
            <span className="label mr-2">IN</span>
            <span className="fit-count">{OUTPUT_COUNT}</span>
            <span className="label">OUT</span>
          </span>
        </Reveal>
        <div
          aria-hidden
          className="display display-hero text-ghost pointer-events-none absolute top-4 left-0 whitespace-nowrap select-none"
        >
          MORFOLO
        </div>
        <h1 className={cn("display display-hero relative mt-6 md:col-span-3", GUTTER)}>
          <Reveal as="span" className="block">
            FILES IN.
          </Reveal>
          <Reveal as="span" i={1} className="block">
            FILES OUT<span className="text-signal">.</span>
          </Reveal>
        </h1>
        <div className={cn("relative flex flex-col justify-end gap-6 pt-12 md:pt-0", GUTTER)}>
          <Reveal as="p" i={2} className="text-base leading-relaxed text-ink-soft">
            <span className="cut">Convert images, audio and video in your browser. Files stay on your device.</span>
          </Reveal>
          <Reveal i={3}>
            <Link
              href="/convert"
              className="flex items-center justify-between border-b-2 border-ink bg-bone pb-2 font-bold uppercase hover:text-signal"
            >
              Start converting
              <ArrowUpRight className="size-5" />
            </Link>
          </Reveal>
        </div>
        {/* Scroll cue: names what is below and drifts down, so the fold reads as a door, not an end. */}
        <Reveal i={4} className={cn("absolute bottom-8 left-0", GUTTER)}>
          <button
            type="button"
            onClick={() => details.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="label group flex items-center gap-3"
          >
            <span className="flex size-8 items-center justify-center overflow-hidden bg-signal text-bone group-hover:bg-ink">
              <ArrowDown aria-hidden className="scroll-cue size-4" />
            </span>
            <span className="cut">FORMATS · PRIVACY · HOW IT WORKS</span>
          </button>
        </Reveal>
      </section>

      <section ref={details} className={cn(CELLS, "scroll-mt-24 md:grid-cols-4")}>
        <Reveal i={5} className={cn(CELL, "@container flex flex-col justify-between gap-12 bg-signal p-6 text-bone")}>
          <span className="label">PRIVACY</span>
          <div className="flex flex-col gap-4">
            <p className="fit-cell font-display leading-none uppercase">Converted in this tab.</p>
            <p className="text-sm leading-relaxed">Nothing is uploaded. Only the engine is downloaded, from a CDN, and cached.</p>
          </div>
        </Reveal>
        {CAPABILITIES.map(({ kind, inputs, outputs }, index) => (
          <Reveal key={kind} i={6 + index} className={cn(CELL, "flex flex-col justify-between gap-10 bg-bone p-6")}>
            <div className="flex items-center justify-between">
              <span className="label font-bold">{kind.toUpperCase()}</span>
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
                <span>OUT </span>
                <span className="slashes">
                  {outputs.map((mime) => (
                    <span key={mime} className="inline-block">
                      {formatLabel(mime)}
                    </span>
                  ))}
                </span>
              </p>
              <p className="label text-ink-mute">{ENGINE_BY_KIND[kind]}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="grid py-16 md:grid-cols-4">
        <div className={cn("pb-8", GUTTER)}>
          <Reveal as="h2" className="display display-lg">
            HOW<span className="text-signal">.</span>
          </Reveal>
        </div>
        <ol className={cn(CELLS, "sm:grid-cols-3 md:col-span-3")}>
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} i={index + 1} className={cn(CELL, "flex flex-col gap-6 bg-bone p-6")}>
              <span className="label">STEP {pad2(index + 1)}</span>
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
            FAQ<span className="text-signal">.</span>
          </Reveal>
        </div>
        <Reveal i={1} className="relative border border-ink bg-bone md:col-span-3">
          <Accordion type="single" collapsible>
            {FAQ.map((item) => (
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
