// Runs on the main thread. Must never be imported from worker/.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { canonicalize, extensionFor } from "../../formats.ts";
import type { ConversionAdapter } from "../types.ts";
import type { ConvertParams } from "../../types.ts";

const FFMPEG_CORE_VERSION = "0.12.9";
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

const ENGINE_CACHE_PREFIX = "morfolo-ffmpeg-";
const ENGINE_CACHE = `${ENGINE_CACHE_PREFIX}${FFMPEG_CORE_VERSION}`;
const CORE_JS_URL = `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`;
const CORE_WASM_URL = `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`;

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

const AUDIO_CODECS = new Set([
  "libmp3lame",
  "aac",
  "alac",
  "flac",
  "libvorbis",
  "libopus",
  "pcm_s16le",
  "pcm_s24le",
  "pcm_f32le",
]);
const VIDEO_CODECS = new Set(["libx264", "libx265", "libvpx", "libvpx-vp9", "libtheora"]);
const X26X_PRESETS = new Set(["ultrafast", "superfast", "veryfast", "faster", "fast", "medium"]);

function num(params: ConvertParams, key: string): number | undefined {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(params: ConvertParams, key: string, allowed: ReadonlySet<string>): string | undefined {
  const value = params[key];
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

/**
 * Maps ConvertParams to ffmpeg flags. Unknown keys and values outside the
 * allowlists are ignored, so ffmpeg falls back to the container defaults.
 */
function flagArgs(to: string, params?: ConvertParams): string[] {
  if (!params) {
    return [];
  }

  const args: string[] = [];
  const isVideo = to.startsWith("video/");

  const videoCodec = isVideo ? str(params, "videoCodec", VIDEO_CODECS) : undefined;
  const audioCodec = str(params, "audioCodec", AUDIO_CODECS);

  if (videoCodec) args.push("-c:v", videoCodec);

  if (isVideo) {
    const bitrate = num(params, "bitrateKbps");
    const crf = num(params, "crf");
    const quality = num(params, "videoQuality");
    const preset = str(params, "preset", X26X_PRESETS);

    if (bitrate !== undefined) args.push("-b:v", `${bitrate}k`);
    if (crf !== undefined) {
      args.push("-crf", String(crf));
      // VP9 needs a zero target bitrate for constant-quality mode.
      if (videoCodec === "libvpx-vp9" && bitrate === undefined) args.push("-b:v", "0");
    }
    if (quality !== undefined) args.push("-q:v", String(quality));
    if (preset && (videoCodec === "libx264" || videoCodec === "libx265")) {
      args.push("-preset", preset);
    }
    if (videoCodec === "libvpx" || videoCodec === "libvpx-vp9") {
      const fast = params.vpxSpeed === "fast";
      args.push("-deadline", fast ? "realtime" : "good", "-cpu-used", fast ? "8" : "4");
    }

    if (params.dropAudio === true) {
      args.push("-an");
      return args;
    }
  }

  if (audioCodec) args.push("-c:a", audioCodec);

  const audioBitrate = num(params, isVideo ? "audioBitrateKbps" : "bitrateKbps");
  if (audioBitrate !== undefined) args.push("-b:a", `${audioBitrate}k`);

  const audioQuality = num(params, "audioQuality");
  if (audioQuality !== undefined) args.push("-q:a", String(audioQuality));

  const compression = num(params, "compressionLevel");
  if (compression !== undefined) args.push("-compression_level", String(compression));

  const sampleRate = num(params, "sampleRate");
  if (sampleRate !== undefined) args.push("-ar", String(sampleRate));

  const channels = num(params, "channels");
  if (channels !== undefined) args.push("-ac", String(channels));

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
ffmpeg.on("log", captureLog);
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

function cacheAvailable(): boolean {
  return typeof caches !== "undefined";
}

/** True when both core files are already in this browser's Cache Storage. */
export async function isEngineCached(): Promise<boolean> {
  // caches.has first: caches.open would create an empty cache as a side effect.
  if (!cacheAvailable() || !(await caches.has(ENGINE_CACHE))) return false;
  const cache = await caches.open(ENGINE_CACHE);
  const [js, wasm] = await Promise.all([cache.match(CORE_JS_URL), cache.match(CORE_WASM_URL)]);
  return Boolean(js && wasm);
}

/**
 * Deletes every cached ffmpeg core (any version) and unloads the running
 * engine, so the next audio/video conversion downloads it again.
 */
export async function clearEngineCache(): Promise<void> {
  if (cacheAvailable()) {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith(ENGINE_CACHE_PREFIX)).map((name) => caches.delete(name)),
    );
  }
  if (engine === "ready") {
    ffmpeg.terminate();
  }
  if (engine !== "loading") {
    engine = "idle";
    loadPromise = undefined;
  }
}

/**
 * Blob URL for a core file: served from Cache Storage when present,
 * otherwise downloaded once with toBlobURL and stored for next time.
 */
async function coreBlobURL(
  url: string,
  mime: string,
  tracker: (event: DownloadEvent) => void,
): Promise<string> {
  const cache = cacheAvailable() ? await caches.open(ENGINE_CACHE) : undefined;
  const hit = await cache?.match(url);
  if (hit) {
    const blob = await hit.blob();
    tracker({ url, total: blob.size, received: blob.size });
    return URL.createObjectURL(new Blob([blob], { type: mime }));
  }

  const blobURL = await toBlobURL(url, mime, true, tracker);
  if (cache) {
    try {
      const blob = await (await fetch(blobURL)).blob();
      await cache.put(url, new Response(blob, { headers: { "Content-Type": mime } }));
    } catch {
      // Quota or private mode: the engine still loads, it just won't be cached.
    }
  }
  return blobURL;
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    engine = "loading";
    loadPromise = (async () => {
      const tracker = createDownloadTracker([CORE_JS_URL, CORE_WASM_URL]);
      const [coreURL, wasmURL] = await Promise.all([
        coreBlobURL(CORE_JS_URL, "text/javascript", tracker),
        coreBlobURL(CORE_WASM_URL, "application/wasm", tracker),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
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
