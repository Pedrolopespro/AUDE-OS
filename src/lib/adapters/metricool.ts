import type { ConexaoAdapter, Propriedade, SnapshotResultado } from "./types";

// Fase 2 — stub. O Metricool entra como camada de integração para
// Instagram / LinkedIn / Meta Ads / Google Maps, consumido via API
// (plano Free com cliente piloto primeiro; Advanced só com receita).
export const metricoolAdapter: ConexaoAdapter = {
  provedor: "metricool",

  async listarPropriedades(): Promise<Propriedade[]> {
    throw new Error("Metricool: Fase 2 — não faz parte do MVP");
  },

  async buscarSnapshot(): Promise<SnapshotResultado[]> {
    throw new Error("Metricool: Fase 2 — não faz parte do MVP");
  },

  async revoke(): Promise<void> {
    throw new Error("Metricool: Fase 2 — não faz parte do MVP");
  },
};
