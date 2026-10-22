// Runs on the main thread. Must never be imported from worker/.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { ConversionAdapter } from "../types.ts";
import type { ConvertParams } from "../../types.ts";

const FFMPEG_CORE_VERSION = "0.12.9";
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

const EXTENSIONS: Record<string, string> = {
  "audio/wav": "wav",
  "audio/mp3": "mp3",
  "audio/flac": "flac",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/m4a": "m4a",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
};

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

function extensionFor(mime: string): string {
  const ext = EXTENSIONS[mime];
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

  if (typeof params.bitrate === "string" && params.bitrate !== "") {
    args.push(bitrateFlag, params.bitrate);
  } else if (typeof params.bitrate === "number") {
    args.push(bitrateFlag, String(params.bitrate));
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

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(
          `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        toBlobURL(
          `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpeg.on("log", captureLog);
    })().catch((caught: unknown) => {
      loadPromise = undefined;
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
      "audio/mp3",
      "audio/flac",
      "audio/ogg",
      "audio/aac",
      "audio/m4a",
      "audio/webm",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ],
    to: [
      "audio/wav",
      "audio/mp3",
      "audio/flac",
      "audio/ogg",
      "audio/aac",
      "audio/m4a",
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
        const inputPath = `input-${seq}.${EXTENSIONS[file.type] ?? "bin"}`;
        const outputPath = `output-${seq}.${extensionFor(to)}`;

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
