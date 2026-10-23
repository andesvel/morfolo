export type FormatInfo = {
  /** Canonical MIME type; adapters list this and only this. */
  readonly mime: string;
  readonly aliases: readonly string[];
  readonly extensions: readonly string[];
};

/**
 * Order matters: ambiguous extensions ("ogg") resolve to the first
 * format that claims them.
 */
export const FORMATS: readonly FormatInfo[] = [
  // images
  { mime: "image/png", aliases: [], extensions: ["png"] },
  {
    mime: "image/jpeg",
    aliases: ["image/pjpeg"],
    extensions: ["jpg", "jpeg", "jpe"],
  },
  { mime: "image/webp", aliases: [], extensions: ["webp"] },
  {
    mime: "image/bmp",
    aliases: ["image/x-ms-bmp", "image/x-bmp"],
    extensions: ["bmp", "dib"],
  },
  // audio
  { mime: "audio/mpeg", aliases: ["audio/mp3"], extensions: ["mp3"] },
  {
    mime: "audio/wav",
    aliases: ["audio/x-wav", "audio/wave", "audio/vnd.wave"],
    extensions: ["wav"],
  },
  { mime: "audio/flac", aliases: ["audio/x-flac"], extensions: ["flac"] },
  { mime: "audio/ogg", aliases: ["audio/x-ogg"], extensions: ["ogg", "oga"] },
  { mime: "audio/aac", aliases: ["audio/x-aac"], extensions: ["aac"] },
  {
    mime: "audio/mp4",
    aliases: ["audio/m4a", "audio/x-m4a"],
    extensions: ["m4a"],
  },
  { mime: "audio/webm", aliases: ["audio/x-webm"], extensions: ["weba"] },
  // video
  { mime: "video/mp4", aliases: ["video/x-m4v"], extensions: ["mp4", "m4v"] },
  { mime: "video/webm", aliases: [], extensions: ["webm"] },
  { mime: "video/ogg", aliases: [], extensions: ["ogv", "ogg"] },
];

const canonicalByType = new Map<string, string>();
const canonicalByExtension = new Map<string, string>();
const extensionByMime = new Map<string, string>();

for (const format of FORMATS) {
  canonicalByType.set(format.mime, format.mime);
  for (const alias of format.aliases) {
    canonicalByType.set(alias, format.mime);
  }
  for (const extension of format.extensions) {
    if (!canonicalByExtension.has(extension)) {
      canonicalByExtension.set(extension, format.mime);
    }
  }
  if (!extensionByMime.has(format.mime)) {
    extensionByMime.set(format.mime, format.extensions[0] ?? "bin");
  }
}

export function canonicalize(type: string): string | undefined {
  return canonicalByType.get(type);
}

export function extensionFor(mime: string): string | undefined {
  return extensionByMime.get(mime);
}

/**
 * Resolves a file to its canonical MIME type: file.type first,
 * name extension as fallback (e.g. application/octet-stream + song.mp3).
 */
export function identify(file: File | Blob): string | undefined {
  if (file.type) {
    const canonical = canonicalize(file.type);
    if (canonical) {
      return canonical;
    }
  }

  if (file instanceof File) {
    const name = file.name.toLowerCase();
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
      return canonicalByExtension.get(name.slice(dot + 1));
    }
  }

  return undefined;
}
