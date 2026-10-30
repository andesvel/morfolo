import type { ConvertParams } from "@morfolo/core";

export type OptionValue = string | number | null;
export type FormatValues = Record<string, OptionValue>;

type Base = {
  key: string;
  label: string;
  /** Hidden under ADVANCED until expanded. */
  advanced?: boolean;
  /** Only relevant for some combinations, e.g. bitrate only for lossy codecs. */
  when?: (values: FormatValues) => boolean;
  /** Plain-language explanation shown in the option's tooltip. */
  help?: string;
};

export type ChoiceSpec = Base & {
  kind: "choice";
  default: OptionValue;
  choices: readonly { value: OptionValue; label: string }[];
};

export type RangeSpec = Base & {
  kind: "range";
  default: number;
  min: number;
  max: number;
  step: number;
  /** Shown next to the label, e.g. "90%". */
  display: (value: number) => string;
  hint?: string;
};

export type OptionSpec = ChoiceSpec | RangeSpec;

export type FormatSpec = {
  options: readonly OptionSpec[];
  lossless: (values: FormatValues) => boolean;
  toParams: (values: FormatValues) => ConvertParams;
  /** One line describing the output, e.g. "AAC · 192 KBPS · STEREO". */
  summary: (values: FormatValues) => string;
};

// Shared option builders -----------------------------------------------------

const SCALE: ChoiceSpec = {
  kind: "choice",
  key: "scale",
  label: "SIZE",
  help: "Scales width and height by this percentage. Smaller images, smaller files, less detail.",
  advanced: true,
  default: 1,
  choices: [
    { value: 1, label: "100%" },
    { value: 0.75, label: "75%" },
    { value: 0.5, label: "50%" },
    { value: 0.25, label: "25%" },
  ],
};

const IMAGE_QUALITY: RangeSpec = {
  kind: "range",
  key: "quality",
  label: "QUALITY",
  help: "How hard the image is compressed. Lower makes smaller files with visible artifacts.",
  default: 90,
  min: 10,
  max: 100,
  step: 5,
  display: (value) => `${value}%`,
};

function bitrates(key: string, label: string, values: readonly number[], fallback: number, extra: Partial<ChoiceSpec> = {}): ChoiceSpec {
  return {
    kind: "choice",
    key,
    label,
    default: fallback,
    choices: values.map((value) => ({ value, label: String(value) })),
    ...extra,
  };
}

const SAMPLE_RATE: ChoiceSpec = {
  kind: "choice",
  key: "sampleRate",
  label: "SAMPLE RATE",
  help: "Samples per second. SOURCE keeps the original; 44.1 kHz is CD audio, 48 kHz is the video standard.",
  advanced: true,
  default: null,
  choices: [
    { value: null, label: "SOURCE" },
    { value: 22050, label: "22.05 KHZ" },
    { value: 44100, label: "44.1 KHZ" },
    { value: 48000, label: "48 KHZ" },
  ],
};

const CHANNELS: ChoiceSpec = {
  kind: "choice",
  key: "channels",
  label: "CHANNELS",
  help: "MONO mixes everything into one channel and roughly halves the size. STEREO keeps or makes two.",
  advanced: true,
  default: null,
  choices: [
    { value: null, label: "SOURCE" },
    { value: 1, label: "MONO" },
    { value: 2, label: "STEREO" },
  ],
};

const AUDIO_TRACK: ChoiceSpec = {
  kind: "choice",
  key: "audio",
  label: "AUDIO TRACK",
  help: "REMOVE drops the sound and keeps only the picture.",
  advanced: true,
  default: "keep",
  choices: [
    { value: "keep", label: "KEEP" },
    { value: "drop", label: "REMOVE" },
  ],
};

function num(values: FormatValues, key: string): number | undefined {
  const value = values[key];
  return typeof value === "number" ? value : undefined;
}

function audioExtras(values: FormatValues): ConvertParams {
  return { sampleRate: num(values, "sampleRate") ?? null, channels: num(values, "channels") ?? null };
}

function audioExtrasSummary(values: FormatValues): string[] {
  const parts: string[] = [];
  const rate = num(values, "sampleRate");
  const channels = num(values, "channels");
  if (rate) parts.push(`${rate / 1000} KHZ`);
  if (channels) parts.push(channels === 1 ? "MONO" : "STEREO");
  return parts;
}

function join(parts: readonly (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function scaleLabel(values: FormatValues): string | undefined {
  const scale = num(values, "scale") ?? 1;
  return scale === 1 ? undefined : `${Math.round(scale * 100)}% SIZE`;
}

// Opus and Vorbis share two containers (OGG, WEBA) ----------------------------

function xiphAudio(defaultCodec: "libvorbis" | "libopus"): FormatSpec {
  const isOpus = (values: FormatValues) => values.codec === "libopus";
  return {
    options: [
      {
        kind: "choice",
        key: "codec",
        label: "CODEC",
        help: "Opus is newer and sounds better at low bitrates. Vorbis plays in more older players.",
        default: defaultCodec,
        choices: [
          { value: "libopus", label: "OPUS" },
          { value: "libvorbis", label: "VORBIS" },
        ],
      },
      bitrates("bitrate", "BITRATE · KBPS", [64, 96, 128, 160, 192, 256], 128, {
        when: isOpus,
        help: "Data per second of audio. Opus is transparent for most music around 128 kbps.",
      }),
      {
        kind: "range",
        key: "vorbisQuality",
        label: "QUALITY",
        default: 6,
        min: 0,
        max: 10,
        step: 1,
        display: (value) => `Q${value}`,
        hint: "VARIABLE BITRATE. 10 IS BEST.",
        help: "Vorbis picks the bitrate per moment. Q6 averages about 192 kbps.",
        when: (values) => !isOpus(values),
      },
      // Opus resamples to 48 kHz internally, so a sample rate choice would only fail.
      { ...SAMPLE_RATE, when: (values) => !isOpus(values) },
      CHANNELS,
    ],
    lossless: () => false,
    toParams: (values) => ({
      audioCodec: String(values.codec),
      ...(isOpus(values)
        ? { bitrateKbps: num(values, "bitrate") ?? null, channels: num(values, "channels") ?? null }
        : { audioQuality: num(values, "vorbisQuality") ?? null, ...audioExtras(values) }),
    }),
    summary: (values) =>
      isOpus(values)
        ? join(["OPUS", `${num(values, "bitrate")} KBPS`, ...audioExtrasSummary({ channels: values.channels ?? null })])
        : join(["VORBIS", `Q${num(values, "vorbisQuality")}`, ...audioExtrasSummary(values)]),
  };
}

// The table ------------------------------------------------------------------

export const FORMAT_SPECS: Readonly<Record<string, FormatSpec>> = {
  "image/png": {
    options: [SCALE],
    lossless: () => true,
    toParams: (values) => ({ scale: num(values, "scale") ?? 1 }),
    summary: (values) => join(["LOSSLESS", scaleLabel(values)]),
  },
  "image/jpeg": {
    options: [
      IMAGE_QUALITY,
      SCALE,
      {
        kind: "choice",
        key: "matte",
        label: "TRANSPARENCY FILL",
        help: "JPG has no transparency. Transparent pixels are filled with this color.",
        advanced: true,
        default: "white",
        choices: [
          { value: "white", label: "WHITE" },
          { value: "black", label: "BLACK" },
        ],
      },
    ],
    lossless: () => false,
    toParams: (values) => ({
      qualityValue: (num(values, "quality") ?? 90) / 100,
      scale: num(values, "scale") ?? 1,
      matte: String(values.matte),
    }),
    summary: (values) => join([`QUALITY ${num(values, "quality")}%`, scaleLabel(values)]),
  },
  "image/webp": {
    options: [IMAGE_QUALITY, SCALE],
    lossless: () => false,
    toParams: (values) => ({
      qualityValue: (num(values, "quality") ?? 90) / 100,
      scale: num(values, "scale") ?? 1,
    }),
    summary: (values) => join([`QUALITY ${num(values, "quality")}%`, scaleLabel(values)]),
  },

  "audio/mpeg": {
    options: [
      {
        kind: "choice",
        key: "mode",
        label: "BITRATE MODE",
        help: "CONSTANT keeps one bitrate for the whole file. VARIABLE spends bits where the audio needs them, usually smaller at the same quality.",
        default: "cbr",
        choices: [
          { value: "cbr", label: "CONSTANT" },
          { value: "vbr", label: "VARIABLE" },
        ],
      },
      bitrates("bitrate", "BITRATE · KBPS", [96, 128, 192, 256, 320], 192, {
        when: (values) => values.mode !== "vbr",
        help: "Data per second of audio. Higher sounds closer to the source and makes bigger files.",
      }),
      {
        kind: "range",
        key: "vbrQuality",
        label: "VBR QUALITY",
        default: 2,
        min: 0,
        max: 9,
        step: 1,
        display: (value) => `V${value}`,
        hint: "0 IS BEST, 9 IS SMALLEST.",
        help: "LAME presets: V0 averages about 245 kbps, V2 about 190, V9 about 65.",
        when: (values) => values.mode === "vbr",
      },
      SAMPLE_RATE,
      CHANNELS,
    ],
    lossless: () => false,
    toParams: (values) => ({
      audioCodec: "libmp3lame",
      ...(values.mode === "vbr"
        ? { audioQuality: num(values, "vbrQuality") ?? null }
        : { bitrateKbps: num(values, "bitrate") ?? null }),
      ...audioExtras(values),
    }),
    summary: (values) =>
      join([
        "MP3",
        values.mode === "vbr" ? `VBR V${num(values, "vbrQuality")}` : `${num(values, "bitrate")} KBPS`,
        ...audioExtrasSummary(values),
      ]),
  },
  "audio/aac": {
    options: [
      bitrates("bitrate", "BITRATE · KBPS", [96, 128, 192, 256, 320], 192, {
        help: "Data per second of audio. Higher sounds closer to the source and makes bigger files.",
      }),
      SAMPLE_RATE,
      CHANNELS,
    ],
    lossless: () => false,
    toParams: (values) => ({ audioCodec: "aac", bitrateKbps: num(values, "bitrate") ?? null, ...audioExtras(values) }),
    summary: (values) => join(["AAC", `${num(values, "bitrate")} KBPS`, ...audioExtrasSummary(values)]),
  },
  "audio/mp4": {
    options: [
      {
        kind: "choice",
        key: "codec",
        label: "CODEC",
        default: "aac",
        help: "AAC is lossy and small. ALAC is lossless: an exact copy of the audio, roughly half the size of WAV.",
        choices: [
          { value: "aac", label: "AAC · LOSSY" },
          { value: "alac", label: "ALAC · LOSSLESS" },
        ],
      },
      bitrates("bitrate", "BITRATE · KBPS", [96, 128, 192, 256, 320], 256, {
        when: (values) => values.codec !== "alac",
        help: "Data per second of audio. Higher sounds closer to the source and makes bigger files.",
      }),
      SAMPLE_RATE,
      CHANNELS,
    ],
    lossless: (values) => values.codec === "alac",
    toParams: (values) => ({
      audioCodec: String(values.codec),
      ...(values.codec === "alac" ? {} : { bitrateKbps: num(values, "bitrate") ?? null }),
      ...audioExtras(values),
    }),
    summary: (values) =>
      values.codec === "alac"
        ? join(["ALAC", "LOSSLESS", ...audioExtrasSummary(values)])
        : join(["AAC", `${num(values, "bitrate")} KBPS`, ...audioExtrasSummary(values)]),
  },
  "audio/ogg": xiphAudio("libvorbis"),
  "audio/webm": xiphAudio("libopus"),
  "audio/flac": {
    options: [
      {
        kind: "range",
        key: "compression",
        label: "COMPRESSION",
        default: 5,
        min: 0,
        max: 12,
        step: 1,
        display: (value) => String(value),
        hint: "SAME AUDIO AT EVERY LEVEL. HIGHER IS SMALLER AND SLOWER.",
        help: "FLAC is always lossless. The level only trades encoding time for file size.",
      },
      SAMPLE_RATE,
      CHANNELS,
    ],
    lossless: () => true,
    toParams: (values) => ({
      audioCodec: "flac",
      compressionLevel: num(values, "compression") ?? null,
      ...audioExtras(values),
    }),
    summary: (values) => join(["FLAC", "LOSSLESS", `LEVEL ${num(values, "compression")}`, ...audioExtrasSummary(values)]),
  },
  "audio/wav": {
    options: [
      {
        kind: "choice",
        key: "depth",
        label: "BIT DEPTH",
        help: "16-bit is CD quality. 24-bit and 32-bit float keep more headroom for editing and make bigger files.",
        default: "pcm_s16le",
        choices: [
          { value: "pcm_s16le", label: "16-BIT" },
          { value: "pcm_s24le", label: "24-BIT" },
          { value: "pcm_f32le", label: "32-BIT FLOAT" },
        ],
      },
      SAMPLE_RATE,
      CHANNELS,
    ],
    lossless: () => true,
    toParams: (values) => ({ audioCodec: String(values.depth), ...audioExtras(values) }),
    summary: (values) => {
      const depth = { pcm_s16le: "16-BIT", pcm_s24le: "24-BIT", pcm_f32le: "32-BIT FLOAT" }[String(values.depth)];
      return join(["PCM", depth, ...audioExtrasSummary(values)]);
    },
  },

  "video/mp4": {
    options: [
      {
        kind: "choice",
        key: "codec",
        label: "CODEC",
        default: "libx264",
        help: "H.264 plays everywhere. H.265 makes smaller files but encodes slower and not every browser plays it.",
        choices: [
          { value: "libx264", label: "H.264" },
          { value: "libx265", label: "H.265" },
        ],
      },
      {
        kind: "range",
        key: "crf",
        label: "CRF",
        default: 23,
        min: 16,
        max: 40,
        step: 1,
        display: (value) => String(value),
        hint: "LOWER IS BETTER AND BIGGER.",
        help: "Constant quality: the encoder spends as many bits as each scene needs. Around 23 looks good for H.264.",
      },
      {
        kind: "choice",
        key: "preset",
        label: "ENCODER SPEED",
        help: "Faster presets finish sooner and make bigger files at the same quality.",
        advanced: true,
        default: "veryfast",
        choices: [
          { value: "ultrafast", label: "ULTRAFAST" },
          { value: "veryfast", label: "VERYFAST" },
          { value: "medium", label: "MEDIUM" },
        ],
      },
      AUDIO_TRACK,
      bitrates("audioBitrate", "AUDIO BITRATE · KBPS", [96, 128, 192, 256], 128, {
        advanced: true,
        help: "Bitrate of the AAC sound track inside the video.",
        when: (values) => values.audio !== "drop",
      }),
    ],
    lossless: () => false,
    toParams: (values) => ({
      videoCodec: String(values.codec),
      crf: num(values, "crf") ?? null,
      preset: String(values.preset),
      dropAudio: values.audio === "drop",
      audioCodec: "aac",
      audioBitrateKbps: num(values, "audioBitrate") ?? null,
    }),
    summary: (values) =>
      join([
        values.codec === "libx265" ? "H.265" : "H.264",
        `CRF ${num(values, "crf")}`,
        values.audio === "drop" ? "NO AUDIO" : `AAC ${num(values, "audioBitrate")} KBPS`,
      ]),
  },
  "video/webm": {
    options: [
      {
        kind: "choice",
        key: "codec",
        label: "CODEC",
        default: "libvpx-vp9",
        help: "VP9 compresses better. VP8 encodes faster and plays on older devices.",
        choices: [
          { value: "libvpx-vp9", label: "VP9" },
          { value: "libvpx", label: "VP8" },
        ],
      },
      {
        kind: "range",
        key: "crf",
        label: "CRF",
        default: 32,
        min: 15,
        max: 50,
        step: 1,
        display: (value) => String(value),
        hint: "LOWER IS BETTER AND BIGGER.",
        help: "Constant quality for VP9. Around 32 is a good balance for web video.",
        when: (values) => values.codec === "libvpx-vp9",
      },
      bitrates("bitrate", "BITRATE · KBPS", [500, 1000, 2000, 4000], 1000, {
        when: (values) => values.codec === "libvpx",
        help: "Target data rate for VP8 video. 1000 kbps suits 720p.",
      }),
      {
        kind: "choice",
        key: "speed",
        label: "ENCODER SPEED",
        help: "FAST uses the realtime encoder: quicker, slightly bigger. BETTER takes longer for a smaller file.",
        advanced: true,
        default: "fast",
        choices: [
          { value: "fast", label: "FAST" },
          { value: "good", label: "BETTER" },
        ],
      },
      AUDIO_TRACK,
    ],
    lossless: () => false,
    toParams: (values) => ({
      videoCodec: String(values.codec),
      ...(values.codec === "libvpx-vp9"
        ? { crf: num(values, "crf") ?? null }
        : { bitrateKbps: num(values, "bitrate") ?? null }),
      vpxSpeed: String(values.speed),
      dropAudio: values.audio === "drop",
      audioCodec: "libopus",
    }),
    summary: (values) =>
      join([
        values.codec === "libvpx" ? `VP8 ${num(values, "bitrate")} KBPS` : `VP9 CRF ${num(values, "crf")}`,
        values.audio === "drop" ? "NO AUDIO" : "OPUS AUDIO",
      ]),
  },
  "video/ogg": {
    options: [
      {
        kind: "range",
        key: "quality",
        label: "QUALITY",
        default: 6,
        min: 0,
        max: 10,
        step: 1,
        display: (value) => `Q${value}`,
        hint: "10 IS BEST.",
        help: "Theora quality scale. 6 is a sensible default; 10 is near-transparent and large.",
      },
      AUDIO_TRACK,
    ],
    lossless: () => false,
    toParams: (values) => ({
      videoCodec: "libtheora",
      videoQuality: num(values, "quality") ?? null,
      dropAudio: values.audio === "drop",
      audioCodec: "libvorbis",
    }),
    summary: (values) => join(["THEORA", `Q${num(values, "quality")}`, values.audio === "drop" ? "NO AUDIO" : "VORBIS AUDIO"]),
  },
};

export function defaultsFor(mime: string): FormatValues {
  const spec = FORMAT_SPECS[mime];
  if (!spec) return {};
  return Object.fromEntries(spec.options.map((option) => [option.key, option.default]));
}

/** Stored values over defaults, dropping keys the spec no longer knows. */
export function resolveValues(mime: string, stored: FormatValues | undefined): FormatValues {
  const values = defaultsFor(mime);
  if (stored) {
    for (const key of Object.keys(values)) {
      const value = stored[key];
      if (value !== undefined) values[key] = value;
    }
  }
  return values;
}

export function visibleOptions(spec: FormatSpec, values: FormatValues): OptionSpec[] {
  return spec.options.filter((option) => !option.when || option.when(values));
}
