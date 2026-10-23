// Runs on the main thread. Must never be imported from worker/.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { canonicalize, extensionFor } from "../../formats.ts";
import type { ConversionAdapter } from "../types.ts";
import type { ConvertParams } from "../../types.ts";

const FFMPEG_CORE_VERSION = "0.12.9";
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

const ffmpeg = new FFmpeg();
let loadPromise: Promise<void> | undefined;
let queue: Promise<unknown> = Promise.resolve();
let fileSeq = 0;
const LOG_TAIL_LIMIT = 20;
const logTail: string[] = [];

function captureLog({ type, message }: { type: string; message: string }): void {
  logTail.push(`${type} ${message}`);
  if (logTail.length > LOG_TAIL_LIMIT) {
    logTail.shift();
  }
}

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function extensionForFile(mime: string): string {
  const ext = extensionFor(canonicalize(mime) ?? mime);
  if (!ext) {
    throw new Error(`Unsupported ffmpeg format: ${mime}`);
  }
  return ext;
}

function flagArgs(to: string, params?: ConvertParams): string[] {
  if (!params) {
    return [];
  }

  const args: string[] = [];
  const isVideo = to.startsWith("video/");
  const bitrateFlag = isVideo ? "-b:v" : "-b:a";

  if (typeof params.bitrateKbps === "number") {
    args.push(bitrateFlag, `${params.bitrateKbps}k`);
  }

  if (isVideo && typeof params.crf === "number") {
    args.push("-crf", String(params.crf));
  }

  if (typeof params.sampleRate === "number") {
    args.push("-ar", String(params.sampleRate));
  }

  return args;
}

async function cleanup(path: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // Best effort: the in-memory FS is rebuilt on every load.
  }
}

export type EngineStatus = "idle" | "loading" | "ready" | "error";

type DownloadEvent = {
  url: string | URL;
  total: number;
  received: number;
};

let engine: EngineStatus = "idle";
let warmupListener: ((pct: number) => void) | undefined;

export function engineStatus(): EngineStatus {
  return engine;
}

/**
 * Warms up the ffmpeg engine ahead of the first conversion.
 * onProgress receives 0..100 (byte-weighted across both core files),
 * or -1 while any download size is unknown (missing Content-Length).
 */
export function warmupEngine(
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (onProgress) {
    warmupListener = onProgress;
  }
  return ensureLoaded();
}

function createDownloadTracker(
  urls: readonly string[],
): (event: DownloadEvent) => void {
  const totals = new Map<string, number>(urls.map((url) => [url, -1]));
  const received = new Map<string, number>(urls.map((url) => [url, 0]));

  return (event) => {
    const url = String(event.url);
    totals.set(url, event.total);
    received.set(url, event.received);

    let anyUnknown = false;
    let totalBytes = 0;
    for (const value of totals.values()) {
      if (value < 0) {
        anyUnknown = true;
      }
      totalBytes += Math.max(0, value);
    }
    let receivedBytes = 0;
    for (const value of received.values()) {
      receivedBytes += value;
    }

    if (anyUnknown || totalBytes <= 0) {
      warmupListener?.(-1);
      return;
    }

    const pct = Math.round((receivedBytes / totalBytes) * 100);
    warmupListener?.(Math.max(0, Math.min(100, pct)));
  };
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    engine = "loading";
    loadPromise = (async () => {
      const coreJsUrl = `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`;
      const coreWasmUrl = `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`;
      const tracker = createDownloadTracker([coreJsUrl, coreWasmUrl]);
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(coreJsUrl, "text/javascript", true, tracker),
        toBlobURL(coreWasmUrl, "application/wasm", true, tracker),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpeg.on("log", captureLog);
      engine = "ready";
      warmupListener = undefined;
    })().catch((caught: unknown) => {
      engine = "error";
      loadPromise = undefined;
      warmupListener = undefined;
      throw caught;
    });
  }

  await loadPromise;
}

export const wasmAdapters: readonly ConversionAdapter[] = [
  {
    id: "wasm-adapter",
    kind: "wasm",
    from: [
      "audio/wav",
      "audio/mpeg",
      "audio/flac",
      "audio/ogg",
      "audio/aac",
      "audio/mp4",
      "audio/webm",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ],
    to: [
      "audio/wav",
      "audio/mpeg",
      "audio/flac",
      "audio/ogg",
      "audio/aac",
      "audio/mp4",
      "audio/webm",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ],
    load: ensureLoaded,
    convert: async (file, to, params, onProgress) =>
      runExclusive(async () => {
        await ensureLoaded();
        logTail.length = 0;

        const seq = ++fileSeq;
        const inputExt =
          extensionFor(canonicalize(file.type) ?? file.type) ?? "bin";
        const inputPath = `input-${seq}.${inputExt}`;
        const outputPath = `output-${seq}.${extensionForFile(to)}`;

        const reportProgress = ({ progress }: { progress: number }): void => {
          if (progress >= 0) {
            onProgress?.(Math.round(Math.min(progress, 1) * 100));
          }
        };

        ffmpeg.on("progress", reportProgress);

        try {
          await ffmpeg.writeFile(
            inputPath,
            new Uint8Array(await file.arrayBuffer()),
          );

          const exitCode = await ffmpeg.exec([
            "-i",
            inputPath,
            ...flagArgs(to, params),
            outputPath,
          ]);

          if (exitCode !== 0) {
            const tail = logTail.slice(-5).join(" | ");
            throw new Error(
              tail.length > 0
                ? `ffmpeg exited with code ${exitCode} for ${to}: ${tail}`
                : `ffmpeg exited with code ${exitCode} for ${to}`,
            );
          }

          const data = await ffmpeg.readFile(outputPath);
          onProgress?.(100);

          if (typeof data === "string") {
            throw new Error("Unexpected text output from ffmpeg");
          }

          return new Blob([data as Uint8Array<ArrayBuffer>], { type: to });
        } finally {
          ffmpeg.off("progress", reportProgress);
          void cleanup(inputPath);
          void cleanup(outputPath);
        }
      }),
  },
];
