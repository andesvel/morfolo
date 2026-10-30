## Project

Morfolo — a file converter that runs 100% on the client side (without uploading files to any server). A monorepo with two packages.

## Structure

morfolo/
├── packages/
│ └── core/ # Conversion engine: workers, WASM/Canvas adapters by format. No UI, no framework.
└── apps/
└── web/ # SPA with three hash-routed views (landing, convert, settings), no authentication.

## Constraints

**Privacy and Architecture**

- MUST keep 100% of file processing on the client — NEVER send a user's file to a server, third-party API, or any analytics/logging endpoint
- `packages/core` MUST stay framework-agnostic — NEVER import React or any UI library there
- `packages/core` is published to npm as `@morfolo/core` under MPL-2.0 (the rest of the repo is AGPL-3.0). Its public API is everything exported from `src/index.ts`; changing or removing an export is a breaking change (`feat!:`)
- Core builds with `tsc -p tsconfig.build.json` plus `scripts/fix-dist.mjs` (worker URL and `.d.ts` specifiers). The `@morfolo/source` export condition points at `src/` and is used only by the web dev server and its typecheck; the web production build consumes `dist/`, exactly what ships
- Canvas adapters MUST run inside our Web Worker. ffmpeg.wasm adapters MUST run on the main thread (FFmpeg spawns its own internal Worker). NEVER import anything from adapters/wasm/ inside worker/.
- MUST NOT use `localStorage` for file data, ever
- File data MUST live in memory (`File`/`Blob`) during a conversion — only use IndexedDB or OPFS if a task explicitly requires queueing or chunking large files

**Stack**

- `apps/web` MUST use Vite + React + TypeScript — NEVER introduce Next.js, Astro, or any other meta-framework
- Routing: wouter with hash location (`#/`, `#/convert`, `#/settings`). Three views only: landing, convert, settings. No auth, no server routes
- Shared state: Zustand stores in apps/web/src/stores (conversion queue, settings incl. theme and locale, engine). Local UI state stays in React hooks. NEVER add Redux or another state library
- Keep dependencies lean: add a package only when a task needs it. Notifications use sonner (restyled via `components/ui/sonner.tsx`, always through `lib/notify.ts`); zips use fflate, built in memory with stored entries
- MUST use pnpm workspaces for the monorepo — NEVER add Turborepo, Nx, or other build orchestrators unless explicitly asked
- MUST use TypeScript strict mode in both packages
- MUST NOT use the `any` type
- MUST NOT bundle ffmpeg-core.wasm as a static asset (Workers limit: 25 MiB per file). Load it at runtime with toBlobURL from a CDN, with an exact pinned version kept in a single constant.
- Only @ffmpeg/ffmpeg and @ffmpeg/util are dependencies. NEVER add @ffmpeg/core or @ffmpeg/core-mt.

**Design**

- Read apps/web/DESIGN.md before touching any UI. It holds the tokens, type scale and component specs.
- Styling: Tailwind CSS v4. UI primitives: shadcn/ui components copied into apps/web/src/components/ui and restyled. Add only the components a task needs. NEVER touch packages/core for UI.
- Visual language: raw brutalism on a Swiss grid (visible hairline grid, asymmetric display type, numbered sections). Hard borders; shadows, if any, are hard offsets with zero blur. NEVER use gradients, glass/backdrop-blur or any static blur, or emojis as icons. `filter: blur()` is allowed ONLY inside entry/exit animations.
- Palette: ink neutrals, a muted frosted-gray surface (the `bone` tokens; "frosted" is the color, never a blur) and ONE accent token (--signal, electric blue). Colors MUST go through tokens; NEVER hardcode hex values in components. NEVER use shadcn's --accent as the brand color (it is the hover background token).
- On a --signal fill, text MUST be bone, NEVER ink. Focus ring is ink.
- Radius 0 everywhere, no exceptions.
- Spacing: Tailwind default scale only. NEVER use arbitrary values like p-[13px].
- Fonts: Archivo Black (display), JetBrains Mono (labels/metadata), system sans stack for body. NEVER add Inter. Self-hosted woff2, latin subset, only the weights used. NEVER load fonts or assets from third-party CDNs (the pinned ffmpeg core is the only documented exception).
- States (loading, progress, error, success, disabled, selected) MUST NOT rely on color alone: use text labels, inversion, or patterns.
- Motion: functional and unhurried (160-400ms via the --duration-* tokens, ease-out or linear). Layout changes (rows added/removed, panels opening) animate their height instead of jumping. View changes use the View Transitions API; entering text and elements may fade in from a small blur. NEVER bounce or spring. Everything MUST collapse to instant under prefers-reduced-motion.
- Icons: lucide-react only, square caps and miter joins, used as structural marks (crosshairs, arrows, registration marks, section glyphs). Never as illustrations, never as the only carrier of meaning. Brand marks lucide lacks (the GitHub mark) use the official simple-icons SVG, never a redraw.
- Anti-slop: NEVER add decorative status dots, fake screenshots, hand-rolled SVG illustrations, or em-dashes in UI copy. The landing view introduces the tool with real data (supported formats, privacy note); no invented features, stats or testimonials.
- Two themes, light and dark, plus AUTO (follows the OS). Dark redefines the same tokens under `:root[data-theme="dark"]` in tokens.css; components never branch on theme. Text on a signal fill uses `text-on-signal` (light in both themes), never `text-bone`.
- i18n: English and Spanish only, typed dictionaries in apps/web/src/i18n (`en.ts` defines the shape, `es.ts` must match it). Every UI string goes through `useMessages()` (or `getMessages()` outside React). No i18n library. File names and ffmpeg error output are never translated.

**Deploy**

- MUST target Cloudflare Workers with static assets (`@cloudflare/vite-plugin` + `wrangler`)
- `wrangler.jsonc` MUST set `"not_found_handling": "single-page-application"`

**Branches and releases**

- Flow: `feat/*`, `fix/*`, `ci/*`... → PR to `dev` → PR `dev` → `main`. `main` is production; every push there deploys to `morfolo.andesvel.workers.dev`. Both branches are protected by rulesets (PR required, `ci` must pass, no force push or deletion; `main` accepts merge commits only)
- Commits MUST follow Conventional Commits (commitlint runs on every PR): `fix` = patch, `feat` = minor, `feat!` or a `BREAKING CHANGE:` footer = major (minor while 0.x). Scope with `core` or `web` when the change is package-specific
- NEVER bump versions or edit CHANGELOGs by hand: release-please (the `morfolo-release` GitHub App) opens the Release PR on `main`, tags `core-vX.Y.Z` / `web-vX.Y.Z`, publishes `@morfolo/core` to npm with provenance, and syncs `main` back into `dev`

## Pending (DO NOT proceed—ask before moving forward with this)

- Testing: no framework or defined strategy yet
