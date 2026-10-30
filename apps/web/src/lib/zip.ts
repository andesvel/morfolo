import { zip } from "fflate";
import type { AsyncZippable } from "fflate";

export type ZipEntry = { name: string; blob: Blob };

/** "photo.png", "photo.png" -> "photo.png", "photo (2).png". */
function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}

/**
 * Bundles converted files into one zip, entirely in memory. Media is already
 * compressed, so entries are stored (level 0): fast, and no bigger.
 * fflate's async zip runs off the main thread.
 */
export async function buildZip(entries: readonly ZipEntry[]): Promise<Blob> {
  const names = uniqueNames(entries.map((entry) => entry.name));
  const files: AsyncZippable = {};
  const buffers = await Promise.all(entries.map((entry) => entry.blob.arrayBuffer()));
  buffers.forEach((buffer, index) => {
    files[names[index] ?? `file-${index}`] = [new Uint8Array(buffer), { level: 0 }];
  });

  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, data) => {
      if (error) reject(error);
      else resolve(new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
    });
  });
}

/** morfolo-2026-10-29-1432.zip, in local time. */
export function zipName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `morfolo-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.zip`;
}
