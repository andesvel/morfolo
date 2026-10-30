# DESIGN (apps/web)

Tokens live in src/styles/tokens.css. Never hardcode values.

## Direction
Swiss grid + raw brutalism. Take from Swiss: a visible hairline grid (4 columns over max-w-6xl, `--color-rule`), asymmetric indented display type, big section numbers (01 / 02 / 03), hollow ghost type behind heroes (`.text-ghost`). Take from brutalism/cyber: the page as a grid of bordered cells, mono metadata in cell corners, corner brackets on the drop zone, registration crosses, one signal block per view.

## Grid alignment
- The background grid (GridLines) is 4 columns over max-w-6xl: a left hairline per column plus a right one on the last.
- Views use the full max-w-6xl width with NO horizontal padding on the container. Text blocks add `GUTTER` (lib/grid.ts); bordered blocks run edge to edge.
- Rows of cells use `CELLS` on the row and `CELL` on each cell (left + bottom border, right edge drawn by a pseudo-element). Column starts then sit on the exact grid pixels. Cell counts per row must divide the grid: 4, 2 or 1 (or 3 inside a 3-column span). When a row can end short (dynamic lists like ALL TO), complete it with `fillerClasses()` empty cells so every real cell is closed.
- Interactive content (tabs, queue, choosers, panels, inputs, secondary buttons) sits on a `bone` fill so it never collides with the lines. Display titles stay on the bare grid.
- Text drawn straight on the page wraps its words in `<span className="cut">`: a bone background per line that cuts the hairlines behind it.

## Hero
- Full height under the sticky header on every screen (`hero-fill`). The display size is bounded by viewport height (`min(13vw, 16svh)`) so text and the scroll cue always fit.
- Signal accents, all on grid coordinates: a signal block over the last column with the real format counts, 8px signal squares where interior grid lines meet the hero's top edge, and the signal scroll-cue box.

## Notifications
- sonner, `unstyled` and redrawn: square, 2px ink border, shadow-hard-md, bone surface, mono uppercase title, body description. Bottom-right, 16px from the edges on mobile.
- Each type has its own icon shape in a square box (check, X, triangle, info, spinner); success fills the box with signal, error and warning tint border and icon. Error also gets an error border on the toast.
- Fire them through `notify.*` only, so wording stays localized: one summary per run ("3 FILES CONVERTED", with a ZIP action when 2 or more), one error per failed file, unsupported files on add, engine loaded/failed, cache cleared, queue cleared, preferences reset, zip progress.

## Zip
- `ZIP · N` appears in the queue header only when 2 or more results exist; a single file downloads from its row.
- Built client-side with fflate (stored, no recompression), duplicate names become "name (2).ext", file name `morfolo-YYYY-MM-DD-HHMM.zip`.

## Registration marks
`<RegisterMarks at={[...]} edge>`: 8px signal squares centered where grid lines cross a rule.
- Header: one on the logo cell's bottom-left corner, centered on the intersection of the first grid line and the rule below the logo (header bottom on md+, logo/nav rule on mobile). It lives in the header, so it stays put on scroll and on every view.
- Convert and Settings: on the left end of each section header rule.
- Nowhere else: not on the landing's content rows (tried, too busy), not next to the active tab, not on the footer, never inside content.

## Help
- Tooltips: `<Hint label>` is a square "?" next to a label; opens on hover, focus and tap. Every format option carries a `help` string in lib/format-options.ts; section headers and settings rows take `help` too.
- Landing FAQ: radix accordion in a bordered box over the last 3 columns. Answers state only what the app really does.

## Selection
Page text is not selectable (`user-select: none` on body). Inputs and `.selectable` opt back in: file names, output names and error messages.

## Kickers and numbering
- No kicker above view titles (the header already says where you are). Numbers only for real order: the convert flow sections (01 INPUT to 04 RUN), the HOW steps, and the nav.

## Palette
- `bone*` tokens are a frosted, muted gray (the color only, never a blur). `ink*` are near-black neutrals. `--signal` is electric blue, the only accent.
- `--color-rule` is the hairline color for the background grid.
- `--color-signal-tint` is a faint, slightly saturated signal (oklch mix) and means DISABLED on buttons, always with a dashed border so the state is not color-only; text on it is `--color-on-signal-tint`. Dark uses a lighter mix toward the light gray. `--color-hazard` is the drop zone stripe color (the tint in light, a calmer mid-tone in dark).
- `--color-on-signal` is the text color on signal fills, light in both themes. `--color-scrim` is the dialog backdrop (black at 70%).

## Themes
- Light (default tokens) and dark (`:root[data-theme="dark"]`), plus AUTO. The inline script in index.html sets `data-theme` and `lang` before first paint; lib/theme.ts keeps them in sync.
- Dark inverts the neutrals: bone becomes graphite (#121316 family), ink becomes the light gray. Inverted surfaces (header strip, footer, tooltips, active nav) stay inverted, so they read light on dark.
- Signal is a lighter blue in dark (#4855FF) to hold contrast on the dark surface and under light text. Error/success/warning get lighter dark values.
- Toggles: compact AUTO/LIGHT/DARK cycle and EN/ES switch in the header strip; full controls in Settings > Interface.

## Language
- EN and ES. Display copy is written per locale (the Spanish hero is "ENTRA. / SALE."), not machine-shortened. Spanish display type gets slightly looser leading (`:lang(es) .display`) so accented capitals don't touch the line above.

## Views
Hash-routed with wouter: `#/` index (landing), `#/convert`, `#/settings`. Header and footer are shared. Each view opens with a mono kicker ("02 · TOOL"), a display title ending in a period, and a short body paragraph.

## Motion
- Tokens: `--duration-fast` 160ms, `--duration-base` 330ms, `--duration-slow` 400ms, `--stagger` 65ms.
- The view-transition overlay ignores pointer events, so the header stays clickable mid-transition; a new navigation supersedes the running one.
- View changes: View Transitions API. Header, footer and grid have their own `view-transition-name` and do not animate. The old view leaves in `fast` (fade + blur 6px), the new one enters in `base`. The nav indicator bar slides between items in `slow`.
- Entry: `.reveal` (or `<Reveal i={n}>`) fades in from blur 10px and 0.75rem below, staggered by `--stagger`.
- Height changes: `collapse-box` (grid rows 0fr/1fr) grows on mount through @starting-style and collapses with `data-open="false"`. Queue rows play it before the store drops them (`leaving` in the conversion store).
- Blur exists only inside these animations. `prefers-reduced-motion` makes everything instant.

## Icons
lucide-react, square caps and miter joins (global rule in app.css). Used as marks: Plus (registration), Crosshair, ArrowUpRight, ArrowRight, ArrowDown, X, Asterisk, Cpu. Always next to text or with an aria-label.

## Type
- Display/headings: Archivo Black, uppercase, tight tracking. Section titles end with a period ("CONVERT."). Use clamp() for big sizes.
- Label: JetBrains Mono Medium 11px, uppercase, tracking 8%. For field labels, metadata, tabs.
- Detail: JetBrains Mono 13px/150%. Numbers (file size, percent): JetBrains Mono Medium 18px.
- Body: system sans 16px/155% (14px small). Button: system sans bold 14px, uppercase, tracking 6%.

## Components
- Top bar: bone bg, 1px ink bottom border. Wordmark left (display font), nav/tabs center (label style, active item bold), utility link right with arrow glyph. Optional black strip above or below with tiny mono text.
- Footer: black bar, bone mono text, left = (c) year + license, right = privacy note. Copy MUST be precise: "files stay on your device", NEVER "nothing leaves your device" (the ffmpeg core is fetched from a CDN).
- Section header: "NN · TITLE" left and "NN / TT" right, both label style, with a 1px ink rule below and generous space before the content.
- Field: label above (label style, "· OPTIONAL" suffix when needed), input below (square, bone bg, ink border, ~56px tall, 16px text, horizontal padding 16-20px), helper text under it in label style. Short related fields share a row (2-3 columns, 16px gap, 24px between rows). Border 2px per the kit's foundations (the screenshot looks thinner: verify in Figma). Focus: 2px ink outline (proposed). Error: error-colored border plus a text message prefixed "ERROR:" (proposed).
- Disabled buttons that block a flow explain why: the RUN button is wrapped in a `<Tooltip>` (disabled buttons get no hover) naming what is missing (no files, which files lack a format, running, all done), and the same sentence shows under it for touch.
- Buttons: primary = signal fill, bone text (solid actions: RESET, CLEAR CACHE, per-row CONVERT); secondary = transparent, 2px ink border, ink text; accent = signal fill, bone text. Square, uppercase. End-of-flow CTA is full width (~72px) and names the action, e.g. "CONVERT — WAV → MP3". Hover = the button lifts up-left by the shadow offset and shadow-hard-sm appears where it was (`ease-press`, --duration-fast); pressed = back to rest with no shadow. Full-bleed buttons (dialog footer, ghost) stay flat.
- Badge: mono 11px uppercase, square. Three styles: ink fill, signal fill, outline.
- Selectable option (target format): 1px ink border box, title uppercase bold, mono sub-label, value right-aligned. Selected = signal fill with bone text plus a SELECTED label or bold weight (color never carries the state alone). Same for codec/option chips, active switches (which also print ON) and the nav indicator bar.
- Panel (file list / queue / result): bone-soft bg, 1px ink border, mono header with "§" prefix, row separators 1px bone-deep. Row = name (truncate with ellipsis, full name in title attr; the kit's own mockup clips a long name), mono meta (SIZE · FORMAT), right-aligned status or percent.
- Progress (proposed): square box with 2px ink border and ink fill, mono percent on the right, text label "CONVERTING 42%". Indeterminate = striped pattern.
- Elevation: shadow-hard-sm/md/lg on cards; shadow-hard-signal on the drop zone while dragging over it.
- Drop zone: `pattern-hazard` (wide diagonal stripes in `--color-hazard` over bone-soft). Title is `display-lg` (`display-md` when compact). Its icon and texts sit on bone-soft fills so they cut the stripes. Corners ink; signal while dragging.
