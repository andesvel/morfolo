# @morfolo/core

Client-side file conversion for the browser. Images are converted with the Canvas API inside a Web Worker; audio and video with [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) on the main thread. Files never leave the device: there is no server and no upload.

This is the engine behind [Morfolo](https://morfolo.andesvel.workers.dev). It has no UI and no framework dependency.

> **Status: 0.x.** The API can change between minor versions until 1.0. See the [roadmap](../../README.md#roadmap).

## Install

```bash
npm install @morfolo/core
```

## Usage

```ts
import { convert, identify, targetsFor } from "@morfolo/core";

const from = identify(file); // "image/png", or undefined if unsupported
const targets = targetsFor(from); // ["image/jpeg", "image/png", "image/webp"]

const webp = await convert(
  { file, to: "image/webp", params: { qualityValue: 0.8 } },
  (pct) => console.log(`${pct}%`),
);
```

`convert` returns a `Blob`. It picks the adapter by source and target type: Canvas for images, ffmpeg.wasm for audio and video.

### The ffmpeg engine

Audio and video need the ffmpeg core (about 32 MB). It is fetched at runtime from unpkg, pinned to an exact version, and stored in Cache Storage after the first download.

```ts
import { needsEngine, isEngineCached, warmupEngine, clearEngineCache } from "@morfolo/core";

if (needsEngine("audio/wav", "audio/mpeg") && !(await isEngineCached())) {
  // ask the user before downloading 32 MB
}
await warmupEngine((pct) => console.log(pct)); // optional: load ahead of the first conversion
await clearEngineCache(); // delete the cached core and unload it
```

If your site sets a Content Security Policy, allow `connect-src https://unpkg.com`, `script-src blob: 'wasm-unsafe-eval'` and `worker-src blob:`.

### Parameters

`params` is a flat object. Unknown keys are ignored, and codec names outside an allowlist are dropped, so ffmpeg falls back to the container default.

| Target | Keys |
|---|---|
| JPEG, WEBP | `qualityValue` (0 to 1), `scale` (0 to 1), `matte` (`"white"`, `"black"`; JPEG only) |
| PNG | `scale` |
| Audio | `audioCodec`, `bitrateKbps`, `audioQuality`, `compressionLevel`, `sampleRate`, `channels` |
| Video | `videoCodec`, `crf`, `bitrateKbps`, `videoQuality`, `preset`, `vpxSpeed`, `dropAudio`, `audioCodec`, `audioBitrateKbps` |

Typed per-format parameters are planned before 1.0.

### Errors

Failures reject with a `ConversionError`, which carries a `code` (`"UNSUPPORTED_FORMAT"`, `"UNKNOWN_SOURCE"`, `"CONVERSION_FAILED"`) and, for ffmpeg, the tail of its log.

## Bundler notes

- The Canvas worker is loaded with `new URL("./worker/conversion.worker.js", import.meta.url)`. Vite and webpack 5 bundle this pattern natively; other bundlers may need a plugin.
- With Vite, exclude ffmpeg from dependency pre-bundling, as ffmpeg.wasm recommends, so its own worker resolves:

  ```ts
  // vite.config.ts
  export default { optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] } };
  ```

## Supported formats

| Kind | Input | Output |
|---|---|---|
| Image | PNG, JPG, WEBP, BMP | PNG, JPG, WEBP |
| Audio | MP3, WAV, FLAC, OGG, AAC, M4A, WEBA | MP3, WAV, FLAC, OGG, AAC, M4A (AAC or ALAC), WEBA |
| Video | MP4, WEBM, OGV | MP4 (H.264, H.265), WEBM (VP9, VP8), OGV (Theora) |

## License

[MPL-2.0](./LICENSE). You can use it in closed-source apps; changes to this package's own files must stay open. The Morfolo web app is AGPL-3.0.

The ffmpeg core it downloads is distributed by the ffmpeg.wasm project under its own license (GPL, as it includes x264 and x265).
