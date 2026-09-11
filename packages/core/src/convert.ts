import { ConversionError } from "./types.ts";
import type { ConvertInput } from "./types.ts";
import type { WorkerRequest, WorkerResponse } from "./worker/protocol.ts";

type PendingJob = {
  resolve: (result: Blob) => void;
  reject: (error: ConversionError) => void;
};

let worker: Worker | undefined;
const pending = new Map<string, PendingJob>();

export function convert(input: ConvertInput): Promise<Blob> {
  const id = crypto.randomUUID();
  const request: WorkerRequest = {
    id,
    type: "convert",
    file: input.file,
    to: input.to,
    from: input.from,
    params: input.params,
  };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(request);
  });
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

  if (!job) {
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
  const error = new ConversionError(event.message || "Worker failed", "WORKER_FAILED");

  for (const job of pending.values()) {
    job.reject(error);
  }

  pending.clear();
  worker?.removeEventListener("message", onMessage);
  worker?.removeEventListener("error", onError);
  worker = undefined;
}
