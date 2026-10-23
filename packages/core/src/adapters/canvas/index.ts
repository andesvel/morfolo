import type { ConversionAdapter } from "../types.ts";

export const canvasAdapters: readonly ConversionAdapter[] = [
  {
    id: "canvas-adapter",
    kind: "canvas",
    from: ["image/png", "image/jpeg", "image/webp", "image/bmp"],
    to: ["image/png", "image/jpeg", "image/webp"],
    convert: async (file, to, params, onProgress) => {
      const imageBitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2D context from canvas");
      }
      if (to === "image/jpeg") {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(imageBitmap, 0, 0);

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
