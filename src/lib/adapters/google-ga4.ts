import { google } from "googleapis";
import { authFromRefreshToken } from "@/lib/google/oauth";
import type { ConexaoAdapter, Propriedade, SnapshotResultado } from "./types";

export const googleGa4Adapter: ConexaoAdapter = {
  provedor: "google_ga4",

  async listarPropriedades(refreshToken: string): Promise<Propriedade[]> {
    const auth = authFromRefreshToken(refreshToken);
    const admin = google.analyticsadmin({ version: "v1beta", auth });
    const { data } = await admin.accountSummaries.list({ pageSize: 200 });
    const props: Propriedade[] = [];
    for (const conta of data.accountSummaries ?? []) {
      for (const p of conta.propertySummaries ?? []) {
        // p.property = "properties/123456"
        props.push({ id: p.property!, nome: `${p.displayName} (${conta.displayName})` });
      }
    }
    return props;
  },

  async buscarSnapshot(refreshToken: string, propriedade: string): Promise<SnapshotResultado[]> {
    const auth = authFromRefreshToken(refreshToken);
    const analyticsData = google.analyticsdata({ version: "v1beta", auth });

    const [totais, porPagina] = await Promise.all([
      analyticsData.properties.runReport({
        property: propriedade,
        requestBody: {
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        },
      }),
      analyticsData.properties.runReport({
        property: propriedade,
        requestBody: {
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "1",
        },
      }),
    ]);

    const row = totais.data.rows?.[0];
    return [
      {
        metrica: "sessoes_7d",
        valor: Number(row?.metricValues?.[0]?.value ?? 0),
        detalhe: {
          usuarios_ativos: Number(row?.metricValues?.[1]?.value ?? 0),
          principal_pagina: porPagina.data.rows?.[0]?.dimensionValues?.[0]?.value ?? null,
        },
      },
    ];
  },

  async revoke(refreshToken: string): Promise<void> {
    const auth = authFromRefreshToken(refreshToken);
    await auth.revokeToken(refreshToken);
  },
};
