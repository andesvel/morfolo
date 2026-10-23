// Main thread only. Must never be imported from worker/.
import { canvasAdapters } from "./adapters/canvas/index.ts";
import { wasmAdapters } from "./adapters/wasm/index.ts";
import { canonicalize } from "./formats.ts";

const targetsBySource = new Map<string, Set<string>>();

for (const adapters of [canvasAdapters, wasmAdapters]) {
  for (const adapter of adapters) {
    for (const from of adapter.from) {
      let targets = targetsBySource.get(from);
      if (!targets) {
        targets = new Set<string>();
        targetsBySource.set(from, targets);
      }
      for (const to of adapter.to) {
        targets.add(to);
      }
    }
  }
}

export function targetsFor(from: string): readonly string[] {
  const canonical = canonicalize(from) ?? from;
  const targets = targetsBySource.get(canonical);
  return targets ? [...targets].sort() : [];
}
