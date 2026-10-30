import { useSettings } from "../stores/settings.ts";
import type { LocalePreference } from "../stores/settings.ts";
import { en } from "./en.ts";
import type { Messages } from "./en.ts";
import { es } from "./es.ts";

export type { Messages };
export type Locale = "en" | "es";

export const LOCALES: readonly Locale[] = ["en", "es"];
const DICTIONARIES: Readonly<Record<Locale, Messages>> = { en, es };

/** AUTO picks the browser language when we have it, English otherwise. */
export function resolveLocale(preference: LocalePreference): Locale {
  if (preference !== "auto") return preference;
  // The first English or Spanish entry in the browser's list wins; English otherwise.
  for (const tag of typeof navigator === "undefined" ? [] : navigator.languages) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("en")) return "en";
  }
  return "en";
}

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

/** Current messages, for stores and other non-React code. */
export function getMessages(): Messages {
  return messagesFor(resolveLocale(useSettings.getState().locale));
}

export function useLocale(): Locale {
  return resolveLocale(useSettings((state) => state.locale));
}

export function useMessages(): Messages {
  return messagesFor(useLocale());
}
