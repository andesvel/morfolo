import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Tests run in a real browser: the engine needs Workers, OffscreenCanvas,
// Cache Storage and WebAssembly, none of which a DOM emulation provides.
export default defineConfig({
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg"] },
  test: {
    include: ["test/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
