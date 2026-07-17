import { google } from "googleapis";
import { authFromRefreshToken } from "@/lib/google/oauth";
import type { ConexaoAdapter, Propriedade, SnapshotResultado } from "./types";

function ultimosSeteDias() {
  const fim = new Date();
  fim.setDate(fim.getDate() - 1); // GSC tem defasagem de ~1 dia
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(inicio), endDate: fmt(fim) };
}

export const googleSearchConsoleAdapter: ConexaoAdapter = {
  provedor: "google_search_console",

  async listarPropriedades(refreshToken: string): Promise<Propriedade[]> {
    const auth = authFromRefreshToken(refreshToken);
    const webmasters = google.webmasters({ version: "v3", auth });
    const { data } = await webmasters.sites.list();
    return (data.siteEntry ?? [])
      .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
      .map((s) => ({ id: s.siteUrl!, nome: s.siteUrl! }));
  },

  async buscarSnapshot(refreshToken: string, propriedade: string): Promise<SnapshotResultado[]> {
    const auth = authFromRefreshToken(refreshToken);
    const webmasters = google.webmasters({ version: "v3", auth });
    const range = ultimosSeteDias();

    const [totais, porQuery, porPagina] = await Promise.all([
      webmasters.searchanalytics.query({
        siteUrl: propriedade,
        requestBody: { ...range },
      }),
      webmasters.searchanalytics.query({
        siteUrl: propriedade,
        requestBody: { ...range, dimensions: ["query"], rowLimit: 1 },
      }),
      webmasters.searchanalytics.query({
        siteUrl: propriedade,
        requestBody: { ...range, dimensions: ["page"], rowLimit: 1 },
      }),
    ]);

    const total = totais.data.rows?.[0];
    return [
      {
        metrica: "cliques_7d",
        valor: total?.clicks ?? 0,
        detalhe: {
          impressoes: total?.impressions ?? 0,
          principal_consulta: porQuery.data.rows?.[0]?.keys?.[0] ?? null,
          principal_pagina: porPagina.data.rows?.[0]?.keys?.[0] ?? null,
          periodo: range,
        },
      },
    ];
  },

  async revoke(refreshToken: string): Promise<void> {
    const auth = authFromRefreshToken(refreshToken);
    await auth.revokeToken(refreshToken);
  },
};
