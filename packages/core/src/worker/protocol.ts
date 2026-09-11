import type { ConvertParams } from "../types.ts";

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
    code: string;
  };
};

export type WorkerResponse = WorkerSuccess | WorkerFailure;
