import { FORMATS } from "@morfolo/core";

export type MediaKind = "image" | "audio" | "video";

export const KINDS: readonly MediaKind[] = ["image", "audio", "video"];

export function kindOf(mime: string): MediaKind | undefined {
  const prefix = mime.split("/")[0];
  return KINDS.find((kind) => kind === prefix);
}

export function extensionOf(mime: string): string {
  return FORMATS.find((format) => format.mime === mime)?.extensions[0] ?? "bin";
}

/** Short uppercase label for a MIME type: "audio/mpeg" -> "MP3". */
export function formatLabel(mime: string): string {
  return extensionOf(mime).toUpperCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function outputName(fileName: string, to: string, suffix: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${base}${suffix}.${extensionOf(to)}`;
}

/** Value for <input type="file" accept>, derived from the format table. */
export const ACCEPT = FORMATS.flatMap((format) => [
  format.mime,
  ...format.extensions.map((extension) => `.${extension}`),
]).join(",");

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
