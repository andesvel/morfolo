import type { ConvertParams } from "../types.ts";

export type AdapterKind = "canvas" | "wasm";

export type ConversionAdapter = {
  readonly id: string;
  readonly kind: AdapterKind;
  readonly from: readonly string[];
  readonly to: readonly string[];
  convert(file: Blob, to: string, params?: ConvertParams): Promise<Blob>;
};
