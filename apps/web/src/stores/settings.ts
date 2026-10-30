import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveValues } from "../lib/format-options.ts";
import type { FormatValues, OptionValue } from "../lib/format-options.ts";

export type ThemePreference = "system" | "light" | "dark";
export type LocalePreference = "auto" | "en" | "es";

/** Preferences only. File data never goes through this store. */
type Preferences = {
  theme: ThemePreference;
  locale: LocalePreference;
  /** Per target MIME type; missing keys fall back to the spec defaults. */
  formatOptions: Record<string, FormatValues>;
  nameSuffix: string;
  autoDownload: boolean;
  preloadEngine: boolean;
};

type SettingsStore = Preferences & {
  set: (patch: Partial<Omit<Preferences, "formatOptions">>) => void;
  setOption: (mime: string, key: string, value: OptionValue) => void;
  resetFormat: (mime: string) => void;
  reset: () => void;
};

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  locale: "auto",
  formatOptions: {},
  nameSuffix: "",
  autoDownload: false,
  preloadEngine: false,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (patch) => set(patch),
      setOption: (mime, key, value) =>
        set((state) => ({
          formatOptions: {
            ...state.formatOptions,
            [mime]: { ...state.formatOptions[mime], [key]: value },
          },
        })),
      resetFormat: (mime) =>
        set((state) => {
          const next = { ...state.formatOptions };
          delete next[mime];
          return { formatOptions: next };
        }),
      reset: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: "morfolo:settings",
      version: 3,
      // v1 stored flat quality/bitrate fields, v2 had no theme or locale; keep what still exists.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<Preferences>;
        return {
          ...DEFAULT_PREFERENCES,
          formatOptions: version >= 2 && old.formatOptions ? old.formatOptions : {},
          nameSuffix: typeof old.nameSuffix === "string" ? old.nameSuffix : "",
          autoDownload: old.autoDownload === true,
          preloadEngine: old.preloadEngine === true,
        };
      },
      partialize: ({ theme, locale, formatOptions, nameSuffix, autoDownload, preloadEngine }): Preferences => ({
        theme,
        locale,
        formatOptions,
        nameSuffix,
        autoDownload,
        preloadEngine,
      }),
    },
  ),
);

/** Effective option values for a target format. */
export function useFormatValues(mime: string): FormatValues {
  const stored = useSettings((state) => state.formatOptions[mime]);
  return resolveValues(mime, stored);
}

export function formatValues(mime: string): FormatValues {
  return resolveValues(mime, useSettings.getState().formatOptions[mime]);
}
