import { canvasAdapters } from "../adapters/canvas/index.ts";
import { wasmAdapters } from "../adapters/wasm/index.ts";
import { findAdapter, registerAdapter } from "../registry.ts";
import { ConversionError } from "../types.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

for (const adapter of canvasAdapters) {
  registerAdapter(adapter);
}

for (const adapter of wasmAdapters) {
  registerAdapter(adapter);
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data);
});

async function handle(request: WorkerRequest): Promise<void> {
  try {
    const from = sourceFormat(request.file, request.from);
    const adapter = findAdapter(from, request.to);

    if (!adapter) {
      throw new ConversionError(
        `No adapter for ${from} → ${request.to}`,
        "UNSUPPORTED_FORMAT",
      );
    }

    const result = await adapter.convert(request.file, request.to, request.params);
    const response: WorkerResponse = {
      id: request.id,
      type: "success",
      result,
    };
    self.postMessage(response);
  } catch (caught) {
    const response: WorkerResponse = {
      id: request.id,
      type: "error",
      error: toErrorPayload(caught),
    };
    self.postMessage(response);
  }
}

function sourceFormat(file: Blob, from: string | undefined): string {
  if (from) {
    return from;
  }

  if (file.type) {
    return file.type;
  }

  throw new ConversionError("Source format is unknown", "UNKNOWN_SOURCE");
}

function toErrorPayload(caught: unknown): { message: string; code: string } {
  if (caught instanceof ConversionError) {
    return { message: caught.message, code: caught.code };
  }

  if (caught instanceof Error) {
    return { message: caught.message, code: "CONVERSION_FAILED" };
  }

  return { message: "Conversion failed", code: "CONVERSION_FAILED" };
}
