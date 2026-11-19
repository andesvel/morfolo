import { wasmAdapters } from "./adapters/wasm/index.ts";
import { findAdapter, registerAdapter } from "./registry.ts";
import { abortError, sourceFormat, toConversionError, untilAborted } from "./shared.ts";
import { ConversionError } from "./types.ts";
import type { ConvertInput } from "./types.ts";
import type { WorkerRequest, WorkerResponse } from "./worker/protocol.ts";

type PendingJob = {
  resolve: (result: Blob) => void;
  reject: (error: ConversionError) => void;
  onProgress?: (pct: number) => void;
};

let worker: Worker | undefined;
const pending = new Map<string, PendingJob>();

for (const adapter of wasmAdapters) {
  registerAdapter(adapter);
}

export async function convert(
  input: ConvertInput,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { signal } = input;
  if (signal?.aborted) throw abortError(signal);
  const from = sourceFormat(input.file, input.from);
  const adapter = findAdapter(from, input.to);

  if (adapter?.maxInputBytes !== undefined && input.file.size > adapter.maxInputBytes) {
    throw new ConversionError(
      `Input is ${input.file.size} bytes; this engine holds at most ${adapter.maxInputBytes}`,
      "INPUT_TOO_LARGE",
    );
  }

  if (adapter) {
    try {
      // The load is shared: aborting stops waiting for it, not the download.
      await untilAborted(adapter.load?.() ?? Promise.resolve(), signal);
      // Also rejects at once when the job is still queued behind another one.
      return await untilAborted(adapter.convert(input.file, input.to, input.params, onProgress, signal), signal);
    } catch (caught) {
      throw toConversionError(caught);
    }
  }

  return requestWorkerConversion(input, from, onProgress);
}

function requestWorkerConversion(
  input: ConvertInput,
  from: string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const id = crypto.randomUUID();
  const request: WorkerRequest = {
    id,
    type: "convert",
    file: input.file,
    to: input.to,
    from,
    params: input.params,
  };

  // On abort the job is forgotten: the worker finishes the image, and its reply is dropped.
  const result = new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage(request);
  });
  const { signal } = input;
  signal?.addEventListener("abort", () => pending.delete(id), { once: true });
  return untilAborted(result, signal);
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  const next = new Worker(
    new URL("./worker/conversion.worker.ts", import.meta.url),
    { type: "module" },
  );

  next.addEventListener("message", onMessage);
  next.addEventListener("error", onError);
  worker = next;
  return next;
}

function onMessage(event: MessageEvent<WorkerResponse>): void {
  const response = event.data;
  const job = pending.get(response.id);
  if (!job) return;

  if (response.type === "progress") {
    job.onProgress?.(response.pct);
    return;
  }

  pending.delete(response.id);
  if (response.type === "success") {
    job.resolve(response.result);
    return;
  }
  job.reject(new ConversionError(response.error.message, response.error.code));
}

function onError(event: ErrorEvent): void {
  const error = new ConversionError(
    event.message || "Worker failed",
    "WORKER_FAILED",
  );

  for (const job of pending.values()) {
    job.reject(error);
  }

  pending.clear();
  worker?.removeEventListener("message", onMessage);
  worker?.removeEventListener("error", onError);
  worker = undefined;
}
