// Runs on the main thread. Must never be imported from worker/.
import type { ConversionAdapter } from "../types.ts";

export const wasmAdapters: readonly ConversionAdapter[] = [];
