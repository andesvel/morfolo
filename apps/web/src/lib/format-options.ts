import type { ConvertParams } from "@morfolo/core";
import { en } from "../i18n/en.ts";
import type { Messages } from "../i18n/en.ts";

type FormatMessages = Messages["formats"];

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

// Labels, help and summaries come from the active locale; defaults and
// ffmpeg params never change with it.

function buildSpecs(m: FormatMessages): Readonly<Record<string, FormatSpec>> {
  const { labels: L, choices: C, hints: HI, help: H, summary: S } = m;


  const SCALE: ChoiceSpec = {
    kind: "choice",
    key: "scale",
    label: L.size,
    help: H.scale,
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
    label: L.quality,
    help: H.imageQuality,
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
    label: L.sampleRate,
    help: H.sampleRate,
    advanced: true,
    default: null,
    choices: [
      { value: null, label: C.source },
      { value: 22050, label: "22.05 KHZ" },
      { value: 44100, label: "44.1 KHZ" },
      { value: 48000, label: "48 KHZ" },
    ],
  };

  const CHANNELS: ChoiceSpec = {
    kind: "choice",
    key: "channels",
    label: L.channels,
    help: H.channels,
    advanced: true,
    default: null,
    choices: [
      { value: null, label: C.source },
      { value: 1, label: C.mono },
      { value: 2, label: C.stereo },
    ],
  };

  const AUDIO_TRACK: ChoiceSpec = {
    kind: "choice",
    key: "audio",
    label: L.audioTrack,
    help: H.audioTrack,
    advanced: true,
    default: "keep",
    choices: [
      { value: "keep", label: C.keep },
      { value: "drop", label: C.remove },
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
    if (channels) parts.push(channels === 1 ? C.mono : C.stereo);
    return parts;
  }

  function join(parts: readonly (string | undefined | false)[]): string {
    return parts.filter(Boolean).join(" · ");
  }

  function scaleLabel(values: FormatValues): string | undefined {
    const scale = num(values, "scale") ?? 1;
    return scale === 1 ? undefined : S.size(Math.round(scale * 100));
  }

  // Opus and Vorbis share two containers (OGG, WEBA) ----------------------------

  function xiphAudio(defaultCodec: "libvorbis" | "libopus"): FormatSpec {
    const isOpus = (values: FormatValues) => values.codec === "libopus";
    return {
      options: [
        {
          kind: "choice",
          key: "codec",
          label: L.codec,
          help: H.xiphCodec,
          default: defaultCodec,
          choices: [
            { value: "libopus", label: "OPUS" },
            { value: "libvorbis", label: "VORBIS" },
          ],
        },
        bitrates("bitrate", L.bitrate, [64, 96, 128, 160, 192, 256], 128, {
          when: isOpus,
          help: H.opusBitrate,
        }),
        {
          kind: "range",
          key: "vorbisQuality",
          label: L.quality,
          default: 6,
          min: 0,
          max: 10,
          step: 1,
          display: (value) => `Q${value}`,
          hint: HI.vorbisQuality,
          help: H.vorbisQuality,
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

  return {
    "image/png": {
      options: [SCALE],
      lossless: () => true,
      toParams: (values) => ({ scale: num(values, "scale") ?? 1 }),
      summary: (values) => join([S.lossless, scaleLabel(values)]),
    },
    "image/jpeg": {
      options: [
        IMAGE_QUALITY,
        SCALE,
        {
          kind: "choice",
          key: "matte",
          label: L.transparencyFill,
          help: H.matte,
          advanced: true,
          default: "white",
          choices: [
            { value: "white", label: C.white },
            { value: "black", label: C.black },
          ],
        },
      ],
      lossless: () => false,
      toParams: (values) => ({
        qualityValue: (num(values, "quality") ?? 90) / 100,
        scale: num(values, "scale") ?? 1,
        matte: String(values.matte),
      }),
      summary: (values) => join([S.quality(num(values, "quality") ?? 90), scaleLabel(values)]),
    },
    "image/webp": {
      options: [IMAGE_QUALITY, SCALE],
      lossless: () => false,
      toParams: (values) => ({
        qualityValue: (num(values, "quality") ?? 90) / 100,
        scale: num(values, "scale") ?? 1,
      }),
      summary: (values) => join([S.quality(num(values, "quality") ?? 90), scaleLabel(values)]),
    },

    "audio/mpeg": {
      options: [
        {
          kind: "choice",
          key: "mode",
          label: L.bitrateMode,
          help: H.mp3Mode,
          default: "cbr",
          choices: [
            { value: "cbr", label: C.constant },
            { value: "vbr", label: C.variable },
          ],
        },
        bitrates("bitrate", L.bitrate, [96, 128, 192, 256, 320], 192, {
          when: (values) => values.mode !== "vbr",
          help: H.bitrate,
        }),
        {
          kind: "range",
          key: "vbrQuality",
          label: L.vbrQuality,
          default: 2,
          min: 0,
          max: 9,
          step: 1,
          display: (value) => `V${value}`,
          hint: HI.vbrQuality,
          help: H.vbrQuality,
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
        bitrates("bitrate", L.bitrate, [96, 128, 192, 256, 320], 192, {
          help: H.bitrate,
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
          label: L.codec,
          default: "aac",
          help: H.m4aCodec,
          choices: [
            { value: "aac", label: C.aacLossy },
            { value: "alac", label: C.alacLossless },
          ],
        },
        bitrates("bitrate", L.bitrate, [96, 128, 192, 256, 320], 256, {
          when: (values) => values.codec !== "alac",
          help: H.bitrate,
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
          ? join(["ALAC", S.lossless, ...audioExtrasSummary(values)])
          : join(["AAC", `${num(values, "bitrate")} KBPS`, ...audioExtrasSummary(values)]),
    },
    "audio/ogg": xiphAudio("libvorbis"),
    "audio/webm": xiphAudio("libopus"),
    "audio/flac": {
      options: [
        {
          kind: "range",
          key: "compression",
          label: L.compression,
          default: 5,
          min: 0,
          max: 12,
          step: 1,
          display: (value) => String(value),
          hint: HI.flacCompression,
          help: H.flacCompression,
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
      summary: (values) =>
        join(["FLAC", S.lossless, S.level(num(values, "compression") ?? 5), ...audioExtrasSummary(values)]),
    },
    "audio/wav": {
      options: [
        {
          kind: "choice",
          key: "depth",
          label: L.bitDepth,
          help: H.wavDepth,
          default: "pcm_s16le",
          choices: [
            { value: "pcm_s16le", label: C.bit16 },
            { value: "pcm_s24le", label: C.bit24 },
            { value: "pcm_f32le", label: C.bit32f },
          ],
        },
        SAMPLE_RATE,
        CHANNELS,
      ],
      lossless: () => true,
      toParams: (values) => ({ audioCodec: String(values.depth), ...audioExtras(values) }),
      summary: (values) => {
        const depth = { pcm_s16le: C.bit16, pcm_s24le: C.bit24, pcm_f32le: C.bit32f }[String(values.depth)];
        return join(["PCM", depth, ...audioExtrasSummary(values)]);
      },
    },

    "video/mp4": {
      options: [
        {
          kind: "choice",
          key: "codec",
          label: L.codec,
          default: "libx264",
          help: H.mp4Codec,
          choices: [
            { value: "libx264", label: "H.264" },
            { value: "libx265", label: "H.265" },
          ],
        },
        {
          kind: "range",
          key: "crf",
          label: L.crf,
          default: 23,
          min: 16,
          max: 40,
          step: 1,
          display: (value) => String(value),
          hint: HI.lowerIsBetter,
          help: H.x264Crf,
        },
        {
          kind: "choice",
          key: "preset",
          label: L.encoderSpeed,
          help: H.preset,
          advanced: true,
          default: "veryfast",
          choices: [
            { value: "ultrafast", label: "ULTRAFAST" },
            { value: "veryfast", label: "VERYFAST" },
            { value: "medium", label: "MEDIUM" },
          ],
        },
        AUDIO_TRACK,
        bitrates("audioBitrate", L.audioBitrate, [96, 128, 192, 256], 128, {
          advanced: true,
          help: H.mp4AudioBitrate,
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
          values.audio === "drop" ? S.noAudio : `AAC ${num(values, "audioBitrate")} KBPS`,
        ]),
    },
    "video/webm": {
      options: [
        {
          kind: "choice",
          key: "codec",
          label: L.codec,
          default: "libvpx-vp9",
          help: H.webmCodec,
          choices: [
            { value: "libvpx-vp9", label: "VP9" },
            { value: "libvpx", label: "VP8" },
          ],
        },
        {
          kind: "range",
          key: "crf",
          label: L.crf,
          default: 32,
          min: 15,
          max: 50,
          step: 1,
          display: (value) => String(value),
          hint: HI.lowerIsBetter,
          help: H.vp9Crf,
          when: (values) => values.codec === "libvpx-vp9",
        },
        bitrates("bitrate", L.bitrate, [500, 1000, 2000, 4000], 1000, {
          when: (values) => values.codec === "libvpx",
          help: H.vp8Bitrate,
        }),
        {
          kind: "choice",
          key: "speed",
          label: L.encoderSpeed,
          help: H.vpxSpeed,
          advanced: true,
          default: "fast",
          choices: [
            { value: "fast", label: C.fast },
            { value: "good", label: C.better },
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
          values.audio === "drop" ? S.noAudio : S.opusAudio,
        ]),
    },
    "video/ogg": {
      options: [
        {
          kind: "range",
          key: "quality",
          label: L.quality,
          default: 6,
          min: 0,
          max: 10,
          step: 1,
          display: (value) => `Q${value}`,
          hint: HI.tenIsBest,
          help: H.theoraQuality,
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
      summary: (values) =>
        join(["THEORA", `Q${num(values, "quality")}`, values.audio === "drop" ? S.noAudio : S.vorbisAudio]),
    },
  };
}

const cache = new WeakMap<FormatMessages, Readonly<Record<string, FormatSpec>>>();

/** Specs with copy in the given locale; built once per dictionary. */
export function formatSpecs(m: FormatMessages): Readonly<Record<string, FormatSpec>> {
  let specs = cache.get(m);
  if (!specs) {
    specs = buildSpecs(m);
    cache.set(m, specs);
  }
  return specs;
}

/** Locale-independent use (defaults, params). */
const BASE_SPECS = formatSpecs(en.formats);

export function defaultsFor(mime: string): FormatValues {
  const spec = BASE_SPECS[mime];
  if (!spec) return {};
  return Object.fromEntries(spec.options.map((option) => [option.key, option.default]));
}

/** Params for a conversion: locale-free, so stores can call it directly. */
export function paramsFor(mime: string, values: FormatValues): ConvertParams {
  return BASE_SPECS[mime]?.toParams(values) ?? {};
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
