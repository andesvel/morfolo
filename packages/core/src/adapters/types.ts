import type { ConvertParams } from "../types.ts";

export type AdapterKind = "canvas" | "wasm";

export type ConversionAdapter = {
  readonly id: string;
  /**
   * "canvas" runs inside our Web Worker (worker/conversion.worker.ts);
   * "wasm" runs on the main thread (FFmpeg spawns its own internal Worker).
   */
  readonly kind: AdapterKind;
  readonly from: readonly string[];
  readonly to: readonly string[];
  /** Largest input in bytes; larger files fail with INPUT_TOO_LARGE before loading anything. */
  readonly maxInputBytes?: number;
  load?(): Promise<void>;
  convert(
    file: Blob,
    to: string,
    params?: ConvertParams,
    onProgress?: (pct: number) => void,
  ): Promise<Blob>;
};
