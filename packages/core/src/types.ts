export type ConvertParams = {
  [key: string]: string | number | boolean | null;
};

export type ConvertInput = {
  file: Blob;
  to: string;
  from?: string;
  params?: ConvertParams;
};

export class ConversionError extends Error {
  readonly code: string;

  constructor(message: string, code = "CONVERSION_FAILED") {
    super(message);
    this.name = "ConversionError";
    this.code = code;
  }
}
