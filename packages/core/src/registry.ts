import type { ConversionAdapter } from "./adapters/types.ts";

const adapters: ConversionAdapter[] = [];

export function registerAdapter(adapter: ConversionAdapter): void {
  adapters.push(adapter);
}

export function findAdapter(
  from: string,
  to: string,
): ConversionAdapter | undefined {
  return adapters.find(
    (adapter) => adapter.from.includes(from) && adapter.to.includes(to),
  );
}
