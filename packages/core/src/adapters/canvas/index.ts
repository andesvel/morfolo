import type { ConversionAdapter } from "../types.ts";

export const canvasAdapters: readonly ConversionAdapter[] = [
  {
    id: "canvas-adapter",
    kind: "canvas",
    from: ["image/png", "image/jpeg", "image/webp", "image/bmp"],
    to: ["image/png", "image/jpeg", "image/webp"],
    convert: async (file, to, params, onProgress) => {
      const imageBitmap = await createImageBitmap(file);
      const scale =
        typeof params?.scale === "number" && params.scale > 0 && params.scale <= 1
          ? params.scale
          : 1;
      const width = Math.max(1, Math.round(imageBitmap.width * scale));
      const height = Math.max(1, Math.round(imageBitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2D context from canvas");
      }
      if (to === "image/jpeg") {
        // JPEG has no alpha: transparent pixels land on this matte.
        ctx.fillStyle = params?.matte === "black" ? "black" : "white";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imageBitmap, 0, 0, width, height);
      imageBitmap.close();

      const blob = await canvas.convertToBlob({
        type: to,
        quality:
          typeof params?.qualityValue === "number"
            ? params.qualityValue
            : undefined,
      });
      onProgress?.(100);
      return blob;
    },
  },
];
