## Project

Morfolo — a file converter that runs 100% on the client side (without uploading files to any server). A monorepo with two packages.

## Structure

morfolo/
├── packages/
│ └── core/ # Conversion engine: workers, WASM/Canvas adapters by format. No UI, no framework.
└── apps/
└── web/ # Single-page tool: drop zone + parameter tabs, no authentication, no other routes.

## Constraints

**Privacy and Architecture**

- MUST keep 100% of file processing on the client — NEVER send a user's file to a server, third-party API, or any analytics/logging endpoint
- `packages/core` MUST stay framework-agnostic — NEVER import React or any UI library there
- MUST run conversion work inside Web Workers — NEVER run it on the main thread
- MUST NOT use `localStorage` for file data, ever
- File data MUST live in memory (`File`/`Blob`) during a conversion — only use IndexedDB or OPFS if a task explicitly requires queueing or chunking large files

**Stack**

- `apps/web` MUST use Vite + React + TypeScript — NEVER introduce Next.js, Astro, or any other meta-framework
- MUST NOT add any routing library — single page, no other routes, no auth
- MUST use plain React state/hooks — NEVER add Redux, Zustand, or similar unless explicitly asked
- MUST use pnpm workspaces for the monorepo — NEVER add Turborepo, Nx, or other build orchestrators unless explicitly asked
- MUST use TypeScript strict mode in both packages
- MUST NOT use the `any` type
- MUST NOT bundle ffmpeg-core.wasm as a static asset (Workers limit: 25 MiB per file). Load it at runtime with toBlobURL from a CDN, with an exact pinned version kept in a single constant.
- Only @ffmpeg/ffmpeg and @ffmpeg/util are dependencies. NEVER add @ffmpeg/core or @ffmpeg/core-mt.

**Deploy**

- MUST target Cloudflare Workers with static assets (`@cloudflare/vite-plugin` + `wrangler`)
- `wrangler.jsonc` MUST set `"not_found_handling": "single-page-application"`

## Pending (DO NOT proceed—ask before moving forward with this)

- Testing: no framework or defined strategy yet
- Which format should be implemented first (images / documents / audio-video) within the "a little bit of everything" scope
