import { create } from "zustand";
import { ConversionError, convert, identify, needsEngine, targetsFor } from "@morfolo/core";
import { getMessages } from "../i18n/index.ts";
import { paramsFor } from "../lib/format-options.ts";
import { outputName } from "../lib/format.ts";
import { useEngine } from "./engine.ts";
import { formatValues, useSettings } from "./settings.ts";

export type JobStatus = "ready" | "queued" | "converting" | "done" | "error";

export type Job = {
  id: string;
  file: File;
  from: string | undefined;
  targets: readonly string[];
  to: string | undefined;
  status: JobStatus;
  pct: number | null;
  /** Object URL for the converted Blob, revoked when the job goes away. */
  url?: string;
  outputName?: string;
  outputSize?: number;
  error?: string;
};

type ConversionStore = {
  jobs: Job[];
  running: boolean;
  /** Jobs waiting for the user to accept the ffmpeg download. */
  gate: { ids: string[] } | null;
  /** Rows playing their exit animation; removed once it ends. */
  leaving: string[];
  addFiles: (files: Iterable<File>) => void;
  /** Animates the rows out, then drops them and revokes their results. */
  remove: (id: string) => void;
  clear: () => void;
  setTarget: (id: string, to: string) => void;
  setTargetAll: (to: string) => void;
  /** Converts the given jobs (all runnable ones when omitted). */
  requestStart: (ids?: readonly string[]) => Promise<void>;
  confirmGate: () => Promise<void>;
  cancelGate: () => void;
};

/** Matches --duration-slow, the collapse-box transition. */
const EXIT_MS = 400;

function exitDelay(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : EXIT_MS;
}

function revoke(job: Job): void {
  if (job.url) URL.revokeObjectURL(job.url);
}

export function isRunnable(job: Job): job is Job & { to: string; from: string } {
  return Boolean(job.to && job.from) && (job.status === "ready" || job.status === "error");
}

export function jobNeedsEngine(job: Job): boolean {
  return Boolean(job.from && job.to && needsEngine(job.from, job.to));
}

export function download(url: string, name: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
}

/** Targets every pending job can reach, for the "convert all to" chooser. */
export function sharedTargets(jobs: readonly Job[]): string[] {
  const pending = jobs.filter((job) => job.status !== "done");
  const [first, ...rest] = pending;
  if (!first) return [];
  return first.targets.filter((to) => rest.every((job) => job.targets.includes(to)));
}

export const useConversion = create<ConversionStore>()((set, get) => {
  const patch = (id: string, next: Partial<Job>) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...next } : job)),
    }));

  const pickRunnable = (ids?: readonly string[]) =>
    get().jobs.filter((job) => isRunnable(job) && (!ids || ids.includes(job.id)));

  /** Drains every queued job, one at a time. */
  const drain = async () => {
    if (get().running) return;
    set({ running: true });

    for (;;) {
      const job = get().jobs.find((item) => item.status === "queued");
      if (!job?.to) break;
      const { id, to } = job;

      patch(id, { status: "converting", pct: null });
      try {
        const params = paramsFor(to, formatValues(to));
        const result = await convert({ file: job.file, from: job.from, to, params }, (pct) =>
          patch(id, { pct }),
        );
        const { nameSuffix, autoDownload } = useSettings.getState();
        const name = outputName(job.file.name, to, nameSuffix);
        if (!get().jobs.some((item) => item.id === id)) continue;
        const url = URL.createObjectURL(result);
        patch(id, { status: "done", pct: 100, url, outputName: name, outputSize: result.size });
        if (autoDownload) download(url, name);
      } catch (caught) {
        const message =
          caught instanceof ConversionError || caught instanceof Error
            ? caught.message
            : getMessages().errors.conversionFailed;
        patch(id, { status: "error", pct: null, error: message });
      }
    }

    set({ running: false });
    void useEngine.getState().refresh();
  };

  const dismiss = (ids: readonly string[]) => {
    const fresh = ids.filter((id) => !get().leaving.includes(id));
    if (fresh.length === 0) return;
    set((state) => ({ leaving: [...state.leaving, ...fresh] }));
    window.setTimeout(() => {
      set((state) => {
        state.jobs.filter((job) => fresh.includes(job.id)).forEach(revoke);
        return {
          jobs: state.jobs.filter((job) => !fresh.includes(job.id)),
          leaving: state.leaving.filter((id) => !fresh.includes(id)),
        };
      });
    }, exitDelay());
  };

  const start = (ids: readonly string[]) => {
    for (const job of pickRunnable(ids)) {
      patch(job.id, { status: "queued", error: undefined });
    }
    void drain();
  };

  return {
    jobs: [],
    running: false,
    gate: null,
    leaving: [],

    addFiles: (files) => {
      const added: Job[] = [...files].map((file) => {
        const from = identify(file);
        const targets = from ? targetsFor(from).filter((to) => to !== from) : [];
        return {
          id: crypto.randomUUID(),
          file,
          from,
          targets,
          to: undefined,
          status: from ? "ready" : "error",
          pct: null,
          error: from ? undefined : getMessages().errors.unsupported,
        };
      });
      set((state) => ({ jobs: [...state.jobs, ...added] }));
    },

    remove: (id) => {
      const job = get().jobs.find((item) => item.id === id);
      if (job && job.status !== "converting") dismiss([id]);
    },

    clear: () => {
      if (get().running) return;
      dismiss(get().jobs.map((job) => job.id));
    },

    setTarget: (id, to) => {
      const job = get().jobs.find((item) => item.id === id);
      if (!job || job.status === "converting" || job.status === "queued") return;
      revoke(job);
      patch(id, { to, status: "ready", pct: null, url: undefined, outputSize: undefined, error: undefined });
    },

    setTargetAll: (to) => {
      for (const job of get().jobs) {
        if (job.status !== "done" && job.targets.includes(to)) {
          get().setTarget(job.id, to);
        }
      }
    },

    requestStart: async (ids) => {
      const runnable = pickRunnable(ids);
      if (runnable.length === 0) return;
      const runIds = runnable.map((job) => job.id);
      const engine = useEngine.getState();

      if (runnable.some(jobNeedsEngine) && engine.status !== "ready") {
        await engine.refresh();
        if (!useEngine.getState().cached) {
          set({ gate: { ids: runIds } });
          return;
        }
        // Cached: loading from Cache Storage is quick, no need to ask.
        await useEngine.getState().warm();
      }
      start(runIds);
    },

    confirmGate: async () => {
      const gate = get().gate;
      if (!gate) return;
      const ok = await useEngine.getState().warm();
      if (!ok) return; // the modal shows the error and stays open
      set({ gate: null });
      start(gate.ids);
    },

    cancelGate: () => set({ gate: null }),
  };
});
