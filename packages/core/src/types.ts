export type ConvertParams = {
  [key: string]: string | number | boolean | null;
};

export type ConvertInput = {
  file: Blob;
  to: string;
  from?: string;
  params?: ConvertParams;
  /** Aborting rejects with ABORTED; a running ffmpeg job is killed and the engine reloads (from cache) on next use. */
  signal?: AbortSignal;
};

/**
 * Why a conversion failed. Stable across minor versions: match on these, not
 * on messages.
 * - UNKNOWN_SOURCE: the file has no type and no `from` was given.
 * - UNSUPPORTED_FORMAT: no adapter converts this pair.
 * - INPUT_TOO_LARGE: the file exceeds what the engine can hold in memory.
 * - ENGINE_LOAD_FAILED: the ffmpeg core could not be downloaded or started.
 * - WORKER_FAILED: the conversion worker crashed.
 * - ABORTED: the input's signal was aborted.
 * - CONVERSION_FAILED: the adapter ran and failed (ffmpeg's log tail is in the message).
 */
export type ConversionErrorCode =
  | "UNKNOWN_SOURCE"
  | "UNSUPPORTED_FORMAT"
  | "INPUT_TOO_LARGE"
  | "ENGINE_LOAD_FAILED"
  | "WORKER_FAILED"
  | "ABORTED"
  | "CONVERSION_FAILED";

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(message: string, code: ConversionErrorCode = "CONVERSION_FAILED", options?: ErrorOptions) {
    super(message, options);
    this.name = "ConversionError";
    this.code = code;
  }
}
