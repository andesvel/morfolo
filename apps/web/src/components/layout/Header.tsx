import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "../../lib/cn.ts";
import { pad2 } from "../../lib/format.ts";
import { useConversion } from "../../stores/conversion.ts";
import { useEngine } from "../../stores/engine.ts";
import { GithubMark } from "./GithubMark.tsx";
import { RegisterMarks } from "./RegisterMarks.tsx";

const NAV = [
  { href: "/", label: "INDEX" },
  { href: "/convert", label: "CONVERT" },
  { href: "/settings", label: "SETTINGS" },
] as const;

function EngineState() {
  const { status, pct, cached } = useEngine();
  if (status === "loading") return <>FFMPEG · LOADING{pct !== null && ` ${Math.round(pct)}%`}</>;
  if (status === "ready") return <>FFMPEG · READY</>;
  if (status === "error") return <>FFMPEG · ERROR</>;
  return <>FFMPEG · {cached ? "CACHED" : "NOT DOWNLOADED"}</>;
}

export function Header() {
  const [location] = useLocation();
  const queued = useConversion((state) => state.jobs.length);

  return (
    <header className="vt-header sticky top-0 z-20 bg-bone">
      <div className="bg-ink text-bone">
        <div className="label mx-auto flex h-6 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span>CLIENT-SIDE FILE CONVERTER</span>
          <span className="max-sm:hidden">
            <EngineState />
          </span>
        </div>
      </div>
      <div className="border-b border-ink">
        <div className="relative mx-auto grid max-w-6xl after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-ink md:grid-cols-4">
          <Link
            href="/"
            className="font-display relative flex h-14 items-center border-l border-ink px-4 text-xl uppercase tracking-tight max-md:border-b sm:px-6"
          >
            {/* On the logo cell's bottom-left corner: the first grid line meeting the header rule, on every view. */}
            <RegisterMarks at={["0"]} edge="bottom" />
            MORFOLO<span className="text-signal">.</span>
          </Link>
          <nav aria-label="Views" className="grid grid-cols-3 border-l border-ink md:col-span-2">
            {NAV.map((item, index) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "label relative flex h-14 items-center justify-center gap-2 not-first:border-l not-first:border-ink hover:bg-bone-soft",
                    active && "font-bold",
                  )}
                >
                  <span className="text-ink-mute max-sm:hidden">{pad2(index + 1)}</span>
                  {item.label}
                  {item.href === "/convert" && queued > 0 && (
                    <span className="bg-signal px-1 text-bone" aria-label={`${queued} files in queue`}>
                      {pad2(queued)}
                    </span>
                  )}
                  {active && <span aria-hidden className="vt-nav-indicator absolute inset-x-0 bottom-0 h-1 bg-signal" />}
                </Link>
              );
            })}
          </nav>
          <a
            className="label flex h-14 items-center justify-end gap-1 border-l border-ink px-4 hover:bg-bone-soft max-md:hidden sm:px-6"
            href="https://github.com/andesvel/morfolo"
            rel="noreferrer"
            target="_blank"
          >
            <GithubMark className="mr-1 size-4" />
            GITHUB <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
