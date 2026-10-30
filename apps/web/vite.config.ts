import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// Dev server: resolve @morfolo/core to its TypeScript source for instant edits.
// Production build: resolve to packages/core/dist, the exact files published to npm.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    conditions: command === "serve" ? ["@morfolo/source", ...defaultClientConditions] : [...defaultClientConditions],
  },
}));
