import type { ConversionErrorCode, ConvertParams } from "../types.ts";

export type WorkerRequest = {
  id: string;
  type: "convert";
  file: Blob;
  to: string;
  from?: string;
  params?: ConvertParams;
};

export type WorkerSuccess = {
  id: string;
  type: "success";
  result: Blob;
};

export type WorkerFailure = {
  id: string;
  type: "error";
  error: {
    message: string;
    code: ConversionErrorCode;
  };
};

export type WorkerProgress = {
  id: string;
  type: "progress";
  pct: number;
};

export type WorkerResponse = WorkerSuccess | WorkerFailure | WorkerProgress;
