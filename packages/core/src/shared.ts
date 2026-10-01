import { ConversionError } from "./types.ts";

export function sourceFormat(file: Blob, from: string | undefined): string {
  if (from) {
    return from;
  }

  if (file.type) {
    return file.type;
  }

  throw new ConversionError("Source format is unknown", "UNKNOWN_SOURCE");
}

export function toConversionError(caught: unknown): ConversionError {
  if (caught instanceof ConversionError) {
    return caught;
  }

  if (caught instanceof Error) {
    return new ConversionError(caught.message, "CONVERSION_FAILED");
  }

  return new ConversionError("Conversion failed", "CONVERSION_FAILED");
}

export function toErrorPayload(
  caught: unknown,
): { message: string; code: string } {
  const error = toConversionError(caught);
  return { message: error.message, code: error.code };
}
