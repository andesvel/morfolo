// Runs on the main thread. Must never be imported from worker/.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { canonicalize, extensionFor } from "../../formats.ts";
import { ConversionError } from "../../types.ts";
import type { ConversionAdapter } from "../types.ts";
import type { ConvertParams } from "../../types.ts";

// The one pinned core version; configureEngine can override it per app.
const FFMPEG_CORE_VERSION = "0.12.9";
const ENGINE_CACHE_PREFIX = "morfolo-ffmpeg-";

export type EngineConfig = {
  /** @ffmpeg/core version. Defaults to the version this release was tested with. */
  version?: string;
  /**
   * Directory serving ffmpeg-core.js and ffmpeg-core.wasm (the package's
   * dist/esm), e.g. on your own origin. Defaults to unpkg for `version`.
   */
  baseURL?: string;
};

type EngineFiles = { js: string; wasm: string; cache: string };

function resolveFiles({ version = FFMPEG_CORE_VERSION, baseURL }: EngineConfig): EngineFiles {
  const base = (baseURL ?? `https://unpkg.com/@ffmpeg/core@${version}/dist/esm`).replace(/\/+$/, "");
  return {
    js: `${base}/ffmpeg-core.js`,
    wasm: `${base}/ffmpeg-core.wasm`,
    // Entries are keyed by full URL, so two origins of one version never mix.
    cache: `${ENGINE_CACHE_PREFIX}${version}`,
  };
}

let files = resolveFiles({});

// ffmpeg.wasm keeps the whole input in a 32-bit WebAssembly heap.
const MAX_INPUT_BYTES = 2 * 1024 ** 3;

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
 * Points the engine at another core version or origin (self-hosting keeps
 * unpkg out of your CSP). Call it before the engine loads; while it is
 * loading or loaded this throws, since the running core can't be swapped.
 * configureEngine({}) restores the defaults.
 */
export function configureEngine(config: EngineConfig): void {
  if (engine === "loading" || engine === "ready") {
    throw new Error("configureEngine must run before the ffmpeg engine loads");
  }
  files = resolveFiles(config);
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
  const { cache: name, js: jsURL, wasm: wasmURL } = files;
  if (!cacheAvailable() || !(await caches.has(name))) return false;
  const cache = await caches.open(name);
  const [js, wasm] = await Promise.all([cache.match(jsURL), cache.match(wasmURL)]);
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
 * Downloads a core file, reporting bytes as they arrive. Content-Length only
 * counts as the total when the body is not compressed: a compressing CDN
 * (jsDelivr, most self-hosted origins) sends the compressed length, which
 * never matches the decoded bytes. @ffmpeg/util's toBlobURL fails on exactly
 * that, so the engine downloads on its own.
 */
async function download(url: string, mime: string, tracker: (event: DownloadEvent) => void): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const length = Number(response.headers.get("Content-Length"));
  const total = response.headers.has("Content-Encoding") || !length ? -1 : length;

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    tracker({ url, total, received });
  }
  tracker({ url, total: received, received });
  return new Blob(chunks, { type: mime });
}

/**
 * Blob URL for a core file: served from Cache Storage when present,
 * otherwise downloaded once and stored for next time.
 */
async function coreBlobURL(
  url: string,
  mime: string,
  tracker: (event: DownloadEvent) => void,
): Promise<string> {
  const cache = cacheAvailable() ? await caches.open(files.cache) : undefined;
  const hit = await cache?.match(url);
  if (hit) {
    const blob = await hit.blob();
    tracker({ url, total: blob.size, received: blob.size });
    return URL.createObjectURL(new Blob([blob], { type: mime }));
  }

  const blob = await download(url, mime, tracker);
  if (cache) {
    try {
      await cache.put(url, new Response(blob, { headers: { "Content-Type": mime } }));
    } catch {
      // Quota or private mode: the engine still loads, it just won't be cached.
    }
  }
  return URL.createObjectURL(blob);
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    engine = "loading";
    loadPromise = (async () => {
      const tracker = createDownloadTracker([files.js, files.wasm]);
      const [coreURL, wasmURL] = await Promise.all([
        coreBlobURL(files.js, "text/javascript", tracker),
        coreBlobURL(files.wasm, "application/wasm", tracker),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      engine = "ready";
      warmupListener = undefined;
    })().catch((caught: unknown) => {
      engine = "error";
      loadPromise = undefined;
      warmupListener = undefined;
      const reason = caught instanceof Error ? caught.message : String(caught);
      throw new ConversionError(`ffmpeg engine failed to load: ${reason}`, "ENGINE_LOAD_FAILED", {
        cause: caught,
      });
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
    maxInputBytes: MAX_INPUT_BYTES,
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
