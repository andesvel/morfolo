import { create } from "zustand";
import { clearEngineCache, engineStatus, isEngineCached, warmupEngine } from "@morfolo/core";
import type { EngineStatus } from "@morfolo/core";

type EngineStore = {
  status: EngineStatus;
  /** 0..100, or null while unknown. */
  pct: number | null;
  cached: boolean | null;
  error: string | null;
  refresh: () => Promise<void>;
  warm: () => Promise<boolean>;
  clearCache: () => Promise<void>;
};

export const ENGINE_SIZE_LABEL = "32 MB";

export const useEngine = create<EngineStore>()((set, get) => ({
  status: engineStatus(),
  pct: null,
  cached: null,
  error: null,

  refresh: async () => {
    const cached = await isEngineCached().catch(() => false);
    set((state) => ({
      cached,
      // Keep our own "loading" while a warm-up we started is in flight.
      status: state.status === "loading" ? "loading" : engineStatus(),
    }));
  },

  warm: async () => {
    if (get().status === "ready") return true;
    set({ status: "loading", pct: null, error: null });
    try {
      await warmupEngine((pct) => set({ pct: pct < 0 ? null : pct }));
      set({ status: engineStatus(), pct: 100 });
      await get().refresh();
      return true;
    } catch (caught) {
      set({
        status: "error",
        pct: null,
        error: caught instanceof Error ? caught.message : "Failed to load",
      });
      return false;
    }
  },

  clearCache: async () => {
    await clearEngineCache();
    set({ pct: null, error: null });
    await get().refresh();
  },
}));
