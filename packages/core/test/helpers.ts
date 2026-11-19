/** A small PNG drawn on the spot, so tests carry no binary fixtures. */
export async function pngFixture(width = 8, height = 6): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.fillStyle = "#2f3cff";
  ctx.fillRect(0, 0, width, height);
  return canvas.convertToBlob({ type: "image/png" });
}

/** Image size as decoded by the browser. */
export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
