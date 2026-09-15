import type { ConvertParams } from "../types.ts";

export type AdapterKind = "canvas" | "wasm";

export type ConversionAdapter = {
  readonly id: string;
  readonly kind: AdapterKind;
  readonly from: readonly string[];
  readonly to: readonly string[];
  load?(): Promise<void>;
  convert(
    file: Blob,
    to: string,
    params?: ConvertParams,
    onProgress?: (pct: number) => void,
  ): Promise<Blob>;
};
