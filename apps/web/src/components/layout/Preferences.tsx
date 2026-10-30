import { Monitor, Moon, Sun } from "lucide-react";
import { LOCALES, useLocale, useMessages } from "../../i18n/index.ts";
import { cn } from "../../lib/cn.ts";
import { useSettings } from "../../stores/settings.ts";
import type { ThemePreference } from "../../stores/settings.ts";

const THEME_ORDER: readonly ThemePreference[] = ["system", "light", "dark"];
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/** Compact theme cycle for the header strip: AUTO, LIGHT, DARK. */
export function ThemeToggle() {
  const t = useMessages();
  const theme = useSettings((state) => state.theme);
  const set = useSettings((state) => state.set);
  const Icon = THEME_ICON[theme];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? "system";

  return (
    <button
      type="button"
      onClick={() => set({ theme: next })}
      aria-label={`${t.header.theme.label}: ${t.header.theme[theme]}`}
      className="flex h-5 items-center gap-1.5 px-1 hover:bg-ink-soft"
    >
      <Icon aria-hidden className="size-3" />
      {t.header.theme[theme]}
    </button>
  );
}

/** EN / ES switch for the header strip; the active language is inverted. */
export function LocaleToggle() {
  const t = useMessages();
  const locale = useLocale();
  const set = useSettings((state) => state.set);

  return (
    <div role="radiogroup" aria-label={t.header.language} className="flex">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={code === locale}
          lang={code}
          onClick={() => set({ locale: code })}
          className={cn(
            "h-5 px-1.5",
            code === locale ? "bg-bone font-bold text-ink" : "hover:bg-ink-soft",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
