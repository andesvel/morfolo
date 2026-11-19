import { afterAll, describe, expect, it } from "vitest";
import {
  ConversionError,
  clearEngineCache,
  configureEngine,
  convert,
  engineStatus,
  isEngineCached,
  warmupEngine,
} from "../src/index.ts";
import { wavFixture } from "./helpers.ts";

// These tests download the ffmpeg core (~32 MB) once, from jsDelivr: a
// non-default origin, which is what configureEngine exists for.
const VERSION = "0.12.9";
const MIRROR = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${VERSION}/dist/esm/`;

afterAll(async () => {
  await clearEngineCache();
  configureEngine({});
});

describe("ffmpeg engine", { timeout: 120_000 }, () => {
  it("fails to load from a dead origin with ENGINE_LOAD_FAILED, and can be reconfigured", async () => {
    configureEngine({ baseURL: "http://127.0.0.1:9/core" });
    const error = await warmupEngine().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConversionError);
    expect((error as ConversionError).code).toBe("ENGINE_LOAD_FAILED");
    expect(engineStatus()).toBe("error");
  });

  it("loads from a configured origin and caches under its URLs", async () => {
    configureEngine({ version: VERSION, baseURL: MIRROR });
    expect(await isEngineCached()).toBe(false);
    await warmupEngine();
    expect(engineStatus()).toBe("ready");
    expect(await isEngineCached()).toBe(true);

    const cache = await caches.open(`morfolo-ffmpeg-${VERSION}`);
    const urls = (await cache.keys()).map((request) => request.url);
    expect(urls).toContain(`${MIRROR}ffmpeg-core.wasm`);
  });

  it("refuses to be reconfigured while loaded", () => {
    expect(() => configureEngine({})).toThrow(/before the ffmpeg engine loads/);
  });

  it("converts WAV to MP3", async () => {
    const out = await convert({ file: wavFixture(), to: "audio/mpeg", params: { bitrateKbps: 64 } });
    expect(out.type).toBe("audio/mpeg");
    expect(out.size).toBeGreaterThan(0);
  });

  it("kills a running job on abort, then reloads for the next one", async () => {
    // ffmpeg reports audio progress only at the end, so abort on a timer.
    // Two minutes of audio take well over the delay to encode.
    const controller = new AbortController();
    const running = convert({ file: wavFixture(120, 44_100), to: "audio/mpeg", signal: controller.signal });
    setTimeout(() => controller.abort(), 150);
    const error = await running.catch((caught: unknown) => caught);
    expect((error as ConversionError).code).toBe("ABORTED");
    expect(engineStatus()).toBe("idle");

    const next = await convert({ file: wavFixture(), to: "audio/ogg" });
    expect(next.size).toBeGreaterThan(0);
    expect(engineStatus()).toBe("ready");
  });

  it("drops a queued job on abort without touching the one running", async () => {
    const controller = new AbortController();
    const first = convert({ file: wavFixture(5, 44_100), to: "audio/mpeg" });
    const queued = convert({ file: wavFixture(), to: "audio/mpeg", signal: controller.signal });
    controller.abort();
    expect(((await queued.catch((caught: unknown) => caught)) as ConversionError).code).toBe("ABORTED");
    expect((await first).size).toBeGreaterThan(0);
  });

  it("clears the cache and unloads", async () => {
    await clearEngineCache();
    expect(engineStatus()).toBe("idle");
    expect(await isEngineCached()).toBe(false);
  });
});
