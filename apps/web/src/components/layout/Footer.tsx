import { ArrowUpRight, Asterisk } from "lucide-react";

export function Footer() {
  return (
    <footer className="vt-footer bg-ink text-bone">
      <div className="relative mx-auto grid max-w-6xl after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-ink-mute sm:grid-cols-4">
        <a
          href="https://github.com/andesvel"
          rel="noreferrer"
          target="_blank"
          className="label flex h-12 items-center gap-2 border-l border-ink-mute px-4 hover:bg-ink-soft max-sm:border-b sm:px-6"
        >
          <Asterisk aria-hidden className="size-4 text-signal" /> MADE BY ANDRES <ArrowUpRight className="size-4" />
        </a>
        <span className="label flex h-12 items-center border-l border-ink-mute px-4 max-sm:border-b sm:col-span-2 sm:px-6">
          FILES STAY ON YOUR DEVICE.
        </span>
        <span className="label flex h-12 items-center border-l border-ink-mute px-4 sm:justify-end sm:px-6">
          NO UPLOADS · NO TRACKING
        </span>
      </div>
    </footer>
  );
}
