import { canvasAdapters } from "../adapters/canvas/index.ts";
import { findAdapter, registerAdapter } from "../registry.ts";
import { sourceFormat, toErrorPayload } from "../shared.ts";
import { ConversionError } from "../types.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

for (const adapter of canvasAdapters) {
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

    await adapter.load?.();

    const result = await adapter.convert(
      request.file,
      request.to,
      request.params,
      (pct) => {
        const progress: WorkerResponse = {
          id: request.id,
          type: "progress",
          pct,
        };
        self.postMessage(progress);
      },
    );

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
