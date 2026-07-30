"use client";

import { useEffect, useMemo, useState } from "react";

type InsightPeriod = 7 | 30 | 90;

type InsightsPayload = {
  connected: true;
  cached?: boolean;
  period: {
    days: number;
    since: string;
    until: string;
  };
  syncedAt: string;
  summary: {
    followers: number;
    mediaCount: number;
    views: number | null;
    reach: number | null;
    interactions: number | null;
    accountsEngaged: number | null;
    profileViews: number | null;
    websiteClicks: number | null;
    netFollows: number | null;
  };
  series: Array<{
    date: string;
    views: number;
    reach: number;
    interactions: number;
  }>;
  audience: {
    gender: Array<{ label: string; value: number }>;
    age: Array<{ label: string; value: number }>;
    countries: Array<{ label: string; value: number }>;
    cities: Array<{ label: string; value: number }>;
    note: string | null;
  };
  activeHours: Array<{ hour: number; value: number }>;
  bestTimes: Array<{
    weekday: number;
    hour: number;
    score: number;
    source: "audience" | "content";
  }>;
  topMedia: Array<{
    id: string;
    caption: string;
    mediaType: string;
    permalink: string | null;
    thumbnailUrl: string | null;
    timestamp: string;
    likes: number;
    comments: number;
    views: number | null;
    reach: number | null;
    saves: number | null;
    shares: number | null;
    interactions: number;
    engagementRate: number | null;
  }>;
  availability: {
    accountInsights: boolean;
    audience: boolean;
    activeHours: boolean;
    mediaInsights: boolean;
  };
  warnings: string[];
};

type InstagramIdentity = {
  username: string;
  accountName: string | null;
  profilePictureUrl: string | null;
  followersCount: number;
  mediaCount: number;
  lastSyncedAt: string;
};

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullNumber = new Intl.NumberFormat("pt-BR");
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("A análise recebeu uma resposta inválida. Tente atualizar.");
  }
}

function metricValue(value: number | null, suffix = "") {
  return value == null ? "—" : `${compactNumber.format(value)}${suffix}`;
}

function formatMetricLabel(label: string) {
  const labels: Record<string, string> = {
    F: "Mulheres",
    M: "Homens",
    U: "Não informado",
    FEMALE: "Mulheres",
    MALE: "Homens",
    UNKNOWN: "Não informado",
    BR: "Brasil",
  };
  return labels[label.toUpperCase()] ?? label;
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "violet" | "green" | "orange";
}) {
  return (
    <article className={`insight-summary-card ${tone}`}>
      <div>
        <span>{label}</span>
        <i aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function aggregateSeries(
  series: InsightsPayload["series"],
  maximumColumns = 30,
) {
  if (series.length <= maximumColumns) return series;
  const groupSize = Math.ceil(series.length / maximumColumns);
  const groups = [];
  for (let index = 0; index < series.length; index += groupSize) {
    const slice = series.slice(index, index + groupSize);
    groups.push({
      date: slice[0].date,
      views: slice.reduce((sum, item) => sum + item.views, 0),
      reach: slice.reduce((sum, item) => sum + item.reach, 0),
      interactions: slice.reduce((sum, item) => sum + item.interactions, 0),
    });
  }
  return groups;
}

function PerformanceChart({
  series,
}: {
  series: InsightsPayload["series"];
}) {
  const points = aggregateSeries(series);
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [
      point.views,
      point.reach,
      point.interactions,
    ]),
  );
  const hasData = points.some(
    (point) => point.views || point.reach || point.interactions,
  );

  if (!hasData) {
    return (
      <div className="insight-empty compact">
        <span aria-hidden="true">↗</span>
        <strong>Aguardando dados de desempenho</strong>
        <p>
          Assim que a Meta registrar atividade no período, a evolução diária
          aparecerá aqui.
        </p>
      </div>
    );
  }

  return (
    <div
      className="performance-chart"
      role="img"
      aria-label="Gráfico de visualizações, alcance e interações no período"
    >
      <div className="chart-axis" aria-hidden="true">
        <span>{compactNumber.format(maximum)}</span>
        <span>{compactNumber.format(Math.round(maximum / 2))}</span>
        <span>0</span>
      </div>
      <div className="performance-columns">
        {points.map((point, index) => (
          <div
            className="performance-column"
            key={`${point.date}-${index}`}
            title={`${new Date(`${point.date}T12:00:00`).toLocaleDateString(
              "pt-BR",
            )}: ${fullNumber.format(point.views)} visualizações, ${fullNumber.format(
              point.reach,
            )} de alcance e ${fullNumber.format(point.interactions)} interações`}
          >
            <i
              className="views"
              style={{ height: `${Math.max(2, (point.views / maximum) * 100)}%` }}
            />
            <i
              className="reach"
              style={{ height: `${Math.max(2, (point.reach / maximum) * 100)}%` }}
            />
            <i
              className="interactions"
              style={{
                height: `${Math.max(2, (point.interactions / maximum) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="chart-dates" aria-hidden="true">
        <span>
          {new Date(`${points[0].date}T12:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </span>
        <span>
          {new Date(
            `${points[points.length - 1].date}T12:00:00`,
          ).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
    </div>
  );
}

function RankingBars({
  title,
  items,
  limit = 6,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  limit?: number;
}) {
  const visible = items.slice(0, limit);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="audience-ranking" aria-label={title}>
      <h4>{title}</h4>
      {visible.length ? (
        <div className="audience-bars">
          {visible.map((item) => {
            const percentage = total ? (item.value / total) * 100 : 0;
            return (
              <div className="audience-bar" key={item.label}>
                <div>
                  <span>{formatMetricLabel(item.label)}</span>
                  <strong>{percentage.toFixed(1).replace(".", ",")}%</strong>
                </div>
                <i>
                  <b style={{ width: `${Math.max(2, percentage)}%` }} />
                </i>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="audience-unavailable">Ainda não disponível para esta conta.</p>
      )}
    </section>
  );
}

function ActiveHours({
  hours,
}: {
  hours: InsightsPayload["activeHours"];
}) {
  const maximum = Math.max(1, ...hours.map((item) => item.value));
  if (!hours.length) return null;
  return (
    <div
      className="active-hours-chart"
      role="img"
      aria-label="Quantidade relativa de seguidores ativos por horário"
    >
      {Array.from({ length: 24 }, (_, hour) => {
        const value = hours.find((item) => item.hour === hour)?.value ?? 0;
        return (
          <div
            key={hour}
            title={`${String(hour).padStart(2, "0")}:00 — ${fullNumber.format(
              value,
            )} seguidores ativos`}
          >
            <i style={{ height: `${Math.max(3, (value / maximum) * 100)}%` }} />
            {hour % 3 === 0 && <span>{String(hour).padStart(2, "0")}h</span>}
          </div>
        );
      })}
    </div>
  );
}

function BestTimes({
  times,
}: {
  times: InsightsPayload["bestTimes"];
}) {
  if (!times.length) {
    return (
      <div className="insight-empty compact">
        <span aria-hidden="true">◷</span>
        <strong>Sem histórico suficiente</strong>
        <p>Publique alguns conteúdos para formar uma recomendação confiável.</p>
      </div>
    );
  }
  return (
    <div className="best-time-list">
      {times.map((item, index) => (
        <div key={`${item.weekday}-${item.hour}-${index}`}>
          <span>{index + 1}</span>
          <div>
            <strong>
              {item.weekday >= 0 ? `${weekdays[item.weekday]}, ` : ""}
              {String(item.hour).padStart(2, "0")}:00
            </strong>
            <small>
              {item.source === "audience"
                ? "Pico de seguidores ativos"
                : "Melhor média dos conteúdos publicados"}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopMedia({
  media,
}: {
  media: InsightsPayload["topMedia"];
}) {
  if (!media.length) {
    return (
      <div className="insight-empty">
        <span aria-hidden="true">▦</span>
        <strong>Nenhuma publicação encontrada</strong>
        <p>
          As publicações recentes aparecerão aqui com alcance, interações e taxa
          de engajamento.
        </p>
      </div>
    );
  }
  return (
    <div className="top-media-list">
      {media.slice(0, 8).map((item, index) => {
        const content = (
          <>
            <span className="media-position">{index + 1}</span>
            <span className="media-thumbnail">
              {item.thumbnailUrl ? (
                // The URL is returned by the connected Instagram account.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" loading="lazy" />
              ) : (
                <i aria-hidden="true">IG</i>
              )}
            </span>
            <span className="media-copy">
              <strong>{item.caption}</strong>
              <small>
                {item.mediaType.replaceAll("_", " ")} ·{" "}
                {new Date(item.timestamp).toLocaleDateString("pt-BR")}
              </small>
            </span>
            <span className="media-stat">
              <strong>{fullNumber.format(item.interactions)}</strong>
              <small>Interações</small>
            </span>
            <span className="media-stat">
              <strong>{metricValue(item.reach)}</strong>
              <small>Alcance</small>
            </span>
            <span className="media-stat engagement">
              <strong>{metricValue(item.engagementRate, "%")}</strong>
              <small>Engajamento</small>
            </span>
          </>
        );
        return item.permalink ? (
          <a
            className="top-media-row"
            href={item.permalink}
            target="_blank"
            rel="noreferrer"
            key={item.id}
            aria-label={`Abrir publicação: ${item.caption}`}
          >
            {content}
          </a>
        ) : (
          <div className="top-media-row" key={item.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function InstagramInsightsPanel({
  clientId,
  instagram,
}: {
  clientId: string;
  instagram: InstagramIdentity;
}) {
  const [period, setPeriod] = useState<InsightPeriod>(30);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ days: String(period) });
      if (force) query.set("refresh", "1");
      const response = await fetch(
        `/api/clients/${clientId}/instagram/insights?${query.toString()}`,
      );
      const payload = await jsonResponse<InsightsPayload & { error?: string }>(
        response,
      );
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os insights.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ days: String(period) });
    fetch(`/api/clients/${clientId}/instagram/insights?${query.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await jsonResponse<InsightsPayload & { error?: string }>(
          response,
        );
        if (!response.ok) throw new Error(payload.error);
        setData(payload);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível carregar os insights.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clientId, period]);

  const audienceTotal = useMemo(
    () =>
      data
        ? data.audience.gender.reduce((sum, item) => sum + item.value, 0)
        : 0,
    [data],
  );

  if (loading && !data) {
    return (
      <div className="insights-loading" role="status" aria-live="polite">
        <i />
        <div>
          <strong>Consultando a Meta</strong>
          <span>Organizando métricas, público e conteúdos recentes...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="insight-error" role="alert">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Não foi possível carregar a análise</strong>
          <p>{error}</p>
          <button type="button" onClick={() => void load(true)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="instagram-insights">
      <div className="insights-toolbar">
        <div className="connected-account">
          <span className="connected-avatar">
            {instagram.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={instagram.profilePictureUrl} alt="" />
            ) : (
              instagram.username.slice(0, 2).toUpperCase()
            )}
          </span>
          <div>
            <strong>@{instagram.username}</strong>
            <span>{instagram.accountName ?? "Conta profissional conectada"}</span>
          </div>
          <i>Conectado</i>
        </div>
        <div className="insights-controls">
          <label>
            <span>Período</span>
            <select
              value={period}
              onChange={(event) => {
                setLoading(true);
                setData(null);
                setError("");
                setPeriod(Number(event.target.value) as InsightPeriod)
              }}
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <span aria-hidden="true">↻</span>
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="insights-inline-error" role="alert">
          {error} Os últimos dados disponíveis continuam visíveis.
        </p>
      )}

      <section className="insights-summary" aria-label="Resumo do Instagram">
        <SummaryCard
          label="Seguidores"
          value={metricValue(data.summary.followers)}
          detail={
            data.summary.netFollows == null
              ? "Total atual do perfil"
              : `${data.summary.netFollows >= 0 ? "+" : ""}${fullNumber.format(
                  data.summary.netFollows,
                )} no período`
          }
          tone="blue"
        />
        <SummaryCard
          label="Visualizações"
          value={metricValue(data.summary.views)}
          detail={`Conteúdo visto nos últimos ${data.period.days} dias`}
          tone="violet"
        />
        <SummaryCard
          label="Alcance acumulado"
          value={metricValue(data.summary.reach)}
          detail="Soma do alcance diário informado pela Meta"
          tone="green"
        />
        <SummaryCard
          label="Interações"
          value={metricValue(data.summary.interactions)}
          detail={
            data.summary.accountsEngaged == null
              ? "Curtidas, comentários, salvos e compartilhamentos"
              : `${metricValue(
                  data.summary.accountsEngaged,
                )} contas engajadas`
          }
          tone="orange"
        />
      </section>

      <section className="insights-primary-grid">
        <article className="panel insight-chart-panel">
          <div className="insight-panel-head">
            <div>
              <span className="eyebrow">DESEMPENHO</span>
              <h3>Evolução no período</h3>
            </div>
            <div className="chart-legend" aria-label="Legenda do gráfico">
              <span className="views">Visualizações</span>
              <span className="reach">Alcance</span>
              <span className="interactions">Interações</span>
            </div>
          </div>
          <PerformanceChart series={data.series} />
          <div className="secondary-insight-metrics">
            <div>
              <span>Visitas ao perfil</span>
              <strong>{metricValue(data.summary.profileViews)}</strong>
            </div>
            <div>
              <span>Cliques no link</span>
              <strong>{metricValue(data.summary.websiteClicks)}</strong>
            </div>
            <div>
              <span>Publicações no perfil</span>
              <strong>{metricValue(data.summary.mediaCount)}</strong>
            </div>
          </div>
        </article>

        <article className="panel best-times-panel">
          <div className="insight-panel-head">
            <div>
              <span className="eyebrow">PLANEJAMENTO</span>
              <h3>Melhores horários</h3>
            </div>
          </div>
          <BestTimes times={data.bestTimes} />
          <p className="insight-source-note">
            {data.availability.activeHours
              ? "Baseado na atividade dos seguidores informada pela Meta."
              : "Estimativa baseada no desempenho das publicações recentes."}
          </p>
        </article>
      </section>

      {data.activeHours.length > 0 && (
        <article className="panel active-hours-panel">
          <div className="insight-panel-head">
            <div>
              <span className="eyebrow">PÚBLICO ONLINE</span>
              <h3>Quando os seguidores estão mais ativos</h3>
            </div>
            <span className="data-context">Horário local da conta</span>
          </div>
          <ActiveHours hours={data.activeHours} />
        </article>
      )}

      <section className="insights-audience-grid">
        <article className="panel audience-panel">
          <div className="insight-panel-head">
            <div>
              <span className="eyebrow">PÚBLICO</span>
              <h3>Quem acompanha o perfil</h3>
            </div>
            {audienceTotal > 0 && (
              <span className="data-context">
                Amostra: {fullNumber.format(audienceTotal)}
              </span>
            )}
          </div>
          {data.availability.audience ? (
            <div className="audience-grid">
              <RankingBars title="Gênero" items={data.audience.gender} />
              <RankingBars title="Faixa etária" items={data.audience.age} />
              <RankingBars title="Principais países" items={data.audience.countries} />
              <RankingBars title="Principais cidades" items={data.audience.cities} />
            </div>
          ) : (
            <div className="insight-empty compact">
              <span aria-hidden="true">◎</span>
              <strong>Composição do público protegida pela Meta</strong>
              <p>
                {data.audience.note ??
                  "Esta conta ainda não atingiu o volume mínimo para exibir dados demográficos."}
              </p>
            </div>
          )}
        </article>
      </section>

      <article className="panel top-content-panel">
        <div className="insight-panel-head">
          <div>
            <span className="eyebrow">CONTEÚDOS</span>
            <h3>Melhores publicações recentes</h3>
          </div>
          <span className="data-context">Ordenado por interações</span>
        </div>
        <TopMedia media={data.topMedia} />
      </article>

      {data.warnings.length > 0 && (
        <aside className="insights-notes" aria-label="Disponibilidade dos dados">
          <strong>Sobre os dados exibidos</strong>
          <ul>
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </aside>
      )}
      <p className="insights-updated">
        Dados fornecidos pela API oficial do Instagram. Atualizado em{" "}
        {new Date(data.syncedAt).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })}
        {data.cached ? " · cache seguro de até 15 minutos" : ""}.
      </p>
    </div>
  );
}
