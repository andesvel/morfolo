import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMessages } from "../../i18n/index.ts";
import { cn } from "../../lib/cn.ts";
import { pad2 } from "../../lib/format.ts";
import { useConversion } from "../../stores/conversion.ts";
import { useEngine } from "../../stores/engine.ts";
import { GithubMark } from "./GithubMark.tsx";
import { LocaleToggle, ThemeToggle } from "./Preferences.tsx";
import { RegisterMarks } from "./RegisterMarks.tsx";

const NAV = [
  { href: "/", key: "index" },
  { href: "/convert", key: "convert" },
  { href: "/settings", key: "settings" },
] as const;

function EngineState() {
  const t = useMessages();
  const { status, pct, cached } = useEngine();
  if (status === "loading") return <>{t.header.engine.loading(pct === null ? null : Math.round(pct))}</>;
  if (status === "ready") return <>{t.header.engine.ready}</>;
  if (status === "error") return <>{t.header.engine.error}</>;
  return <>{cached ? t.header.engine.cached : t.header.engine.missing}</>;
}

export function Header() {
  const t = useMessages();
  const [location] = useLocation();
  const queued = useConversion((state) => state.jobs.length);

  return (
    <header className="vt-header sticky top-0 z-20 bg-bone">
      <div className="bg-ink text-bone">
        <div className="label mx-auto flex h-6 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="truncate max-sm:hidden">{t.header.strip}</span>
          <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
            <span className="whitespace-nowrap max-md:hidden">
              <EngineState />
            </span>
            <ThemeToggle />
            <LocaleToggle />
          </div>
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
          <nav aria-label={t.header.navLabel} className="grid grid-cols-3 border-l border-ink md:col-span-2">
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
                  {t.header.nav[item.key]}
                  {item.href === "/convert" && queued > 0 && (
                    <span className="bg-signal px-1 text-on-signal" aria-label={t.header.queued(queued)}>
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
            {t.header.github} <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
