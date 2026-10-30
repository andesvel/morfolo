// Post-build fixes tsc does not do on its own:
// 1. The worker URL in convert.js is a string literal, so it still names the
//    .ts source; point it at the emitted .js worker.
// 2. Declaration files keep relative ".ts" specifiers; rewrite them to ".js"
//    so consumers without allowImportingTsExtensions resolve them.
// Fails loudly if the worker pattern ever stops matching.
import { readdir, readFile, writeFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);

const convert = new URL("convert.js", dist);
const source = await readFile(convert, "utf8");
const workerFrom = '"./worker/conversion.worker.ts"';
if (!source.includes(workerFrom)) {
  throw new Error(`fix-dist: ${workerFrom} not found in dist/convert.js`);
}
await writeFile(convert, source.replace(workerFrom, '"./worker/conversion.worker.js"'));

const relativeTs = /(from\s+|import\(\s*)(["'])(\.{1,2}\/[^"']+)\.ts\2/g;
for (const entry of await readdir(dist, { recursive: true })) {
  if (!entry.endsWith(".d.ts")) continue;
  const file = new URL(entry, dist);
  const text = await readFile(file, "utf8");
  const fixed = text.replace(relativeTs, (_, lead, quote, path) => `${lead}${quote}${path}.js${quote}`);
  if (fixed !== text) await writeFile(file, fixed);
}
