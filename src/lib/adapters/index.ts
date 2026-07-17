import type { ConexaoAdapter, Provedor } from "./types";
import { googleSearchConsoleAdapter } from "./google-search-console";
import { googleGa4Adapter } from "./google-ga4";
import { metricoolAdapter } from "./metricool";

const registry: Partial<Record<Provedor, ConexaoAdapter>> = {
  google_search_console: googleSearchConsoleAdapter,
  google_ga4: googleGa4Adapter,
  metricool: metricoolAdapter,
};

export function getAdapter(provedor: Provedor): ConexaoAdapter {
  const adapter = registry[provedor];
  if (!adapter) throw new Error(`Adapter não implementado: ${provedor}`);
  return adapter;
}

export type { ConexaoAdapter, Provedor } from "./types";
