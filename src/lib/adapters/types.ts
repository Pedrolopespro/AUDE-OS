// Camada de adapter de Conexao — isola o fornecedor concreto (Google nativo,
// Metricool) do resto do sistema. Trocar de fornecedor = trocar de adapter.

export type Provedor =
  | "google_search_console"
  | "google_ga4"
  | "google_ads"
  | "metricool";

export interface Propriedade {
  id: string;
  nome: string;
}

export interface SnapshotResultado {
  metrica: string;
  valor: number;
  detalhe?: Record<string, unknown>;
}

export interface ConexaoAdapter {
  provedor: Provedor;

  /** Lista as propriedades disponíveis para a credencial (sites GSC, properties GA4). */
  listarPropriedades(refreshToken: string): Promise<Propriedade[]>;

  /**
   * Busca as métricas do card de resumo (últimos 7 dias) para a propriedade.
   * Mesma chamada valida a conexão: sucesso => conectado; falha => expirado/erro.
   */
  buscarSnapshot(refreshToken: string, propriedade: string): Promise<SnapshotResultado[]>;

  /** Revoga a credencial no fornecedor. A saída é espelho da entrada (fase 3). */
  revoke(refreshToken: string): Promise<void>;
}
