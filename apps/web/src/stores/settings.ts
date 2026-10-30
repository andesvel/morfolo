import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveValues } from "../lib/format-options.ts";
import type { FormatValues, OptionValue } from "../lib/format-options.ts";

/** Preferences only. File data never goes through this store. */
type Preferences = {
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
      version: 2,
      // v1 stored flat quality/bitrate fields; keep only what still exists.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<Preferences>;
        return {
          ...DEFAULT_PREFERENCES,
          nameSuffix: typeof old.nameSuffix === "string" ? old.nameSuffix : "",
          autoDownload: old.autoDownload === true,
          preloadEngine: old.preloadEngine === true,
        };
      },
      partialize: ({ formatOptions, nameSuffix, autoDownload, preloadEngine }): Preferences => ({
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
