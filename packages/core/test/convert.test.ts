import { describe, expect, it } from "vitest";
import { ConversionError, convert, identify, needsEngine, targetsFor } from "../src/index.ts";
import { imageSize, pngFixture } from "./helpers.ts";

describe("catalog", () => {
  it("identifies by MIME type and lists targets", () => {
    const png = new File([], "a.png", { type: "image/png" });
    expect(identify(png)).toBe("image/png");
    expect(targetsFor("image/png")).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("knows which pairs need the ffmpeg engine", () => {
    expect(needsEngine("image/png", "image/webp")).toBe(false);
    expect(needsEngine("audio/wav", "audio/mpeg")).toBe(true);
  });
});

describe("convert (canvas, in the worker)", () => {
  it("converts PNG to JPEG and WEBP", async () => {
    const file = await pngFixture();
    for (const to of ["image/jpeg", "image/webp"]) {
      const out = await convert({ file, to });
      expect(out.type).toBe(to);
      expect(await imageSize(out)).toEqual({ width: 8, height: 6 });
    }
  });

  it("scales and reports progress", async () => {
    const progress: number[] = [];
    const out = await convert({ file: await pngFixture(), to: "image/png", params: { scale: 0.5 } }, (pct) =>
      progress.push(pct),
    );
    expect(await imageSize(out)).toEqual({ width: 4, height: 3 });
    expect(progress.at(-1)).toBe(100);
  });

  it("rejects an unknown source with UNKNOWN_SOURCE", async () => {
    const error = await convert({ file: new Blob([]), to: "image/png" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConversionError);
    expect((error as ConversionError).code).toBe("UNKNOWN_SOURCE");
  });

  it("rejects an unsupported pair with UNSUPPORTED_FORMAT", async () => {
    const error = await convert({ file: await pngFixture(), to: "image/gif" }).catch((caught: unknown) => caught);
    expect((error as ConversionError).code).toBe("UNSUPPORTED_FORMAT");
  });
});
