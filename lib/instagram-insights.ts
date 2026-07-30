type GraphError = {
  error?: {
    code?: number;
    message?: string;
    error_subcode?: number;
  };
};

type InsightValue = {
  end_time?: string;
  value?: number | Record<string, number>;
};

type BreakdownResult = {
  dimension_values?: string[];
  value?: number;
};

type InsightItem = {
  name?: string;
  values?: InsightValue[];
  total_value?: {
    value?: number;
    breakdowns?: Array<{
      dimension_keys?: string[];
      results?: BreakdownResult[];
    }>;
  };
};

type InsightsResponse = GraphError & {
  data?: InsightItem[];
};

type MediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type MediaResponse = GraphError & {
  data?: MediaItem[];
};

type NormalizedPoint = {
  date: string;
  value: number;
};

export type InstagramInsightsPayload = {
  connected: true;
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

function graphUrl(path: string, accessToken: string) {
  const url = new URL(path, "https://graph.instagram.com");
  url.searchParams.set("access_token", accessToken);
  return url;
}

async function graphJson<T extends GraphError>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await response.json()) as T;
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "A Meta não forneceu esta métrica.");
  }
  return body;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function insightNumber(item?: InsightItem | null) {
  const total = item?.total_value?.value;
  if (typeof total === "number") return total;
  const values = item?.values ?? [];
  const numbers = values
    .map((entry) => entry.value)
    .filter((value): value is number => typeof value === "number");
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

function insightSeries(item?: InsightItem | null): NormalizedPoint[] {
  return (item?.values ?? [])
    .filter(
      (entry): entry is InsightValue & { end_time: string; value: number } =>
        typeof entry.end_time === "string" && typeof entry.value === "number",
    )
    .map((entry) => ({
      date: isoDay(new Date(new Date(entry.end_time).getTime() - 1)),
      value: entry.value,
    }));
}

async function accountMetric(
  instagramUserId: string,
  accessToken: string,
  metric: string,
  since: string,
  until: string,
) {
  const url = graphUrl(`/${instagramUserId}/insights`, accessToken);
  url.searchParams.set("metric", metric);
  url.searchParams.set("period", "day");
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("metric_type", "time_series");
  try {
    const result = await graphJson<InsightsResponse>(url);
    return result.data?.[0] ?? null;
  } catch {
    url.searchParams.delete("metric_type");
    try {
      const result = await graphJson<InsightsResponse>(url);
      return result.data?.[0] ?? null;
    } catch {
      return null;
    }
  }
}

function breakdownValues(item?: InsightItem) {
  const results = item?.total_value?.breakdowns?.[0]?.results ?? [];
  return results
    .map((result) => ({
      label: result.dimension_values?.join(" · ") ?? "",
      value: Number(result.value ?? 0),
    }))
    .filter((item) => item.label && item.value > 0)
    .sort((a, b) => b.value - a.value);
}

async function audienceBreakdown(
  instagramUserId: string,
  accessToken: string,
  breakdown: "age" | "city" | "country" | "gender",
) {
  const url = graphUrl(`/${instagramUserId}/insights`, accessToken);
  url.searchParams.set("metric", "follower_demographics");
  url.searchParams.set("period", "lifetime");
  url.searchParams.set("timeframe", "last_30_days");
  url.searchParams.set("metric_type", "total_value");
  url.searchParams.set("breakdown", breakdown);
  try {
    const result = await graphJson<InsightsResponse>(url);
    return breakdownValues(result.data?.[0]);
  } catch {
    return [];
  }
}

async function onlineFollowers(
  instagramUserId: string,
  accessToken: string,
) {
  const url = graphUrl(`/${instagramUserId}/insights`, accessToken);
  url.searchParams.set("metric", "online_followers");
  url.searchParams.set("period", "lifetime");
  try {
    const result = await graphJson<InsightsResponse>(url);
    const value = result.data?.[0]?.values?.[0]?.value;
    if (!value || typeof value !== "object") return [];
    return Object.entries(value)
      .map(([hour, followers]) => ({
        hour: Number(hour),
        value: Number(followers),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.hour) &&
          item.hour >= 0 &&
          item.hour <= 23 &&
          item.value >= 0,
      )
      .sort((a, b) => a.hour - b.hour);
  } catch {
    return [];
  }
}

async function mediaInsights(mediaId: string, accessToken: string) {
  const metricSets = [
    "views,reach,saved,shares,total_interactions",
    "reach,saved,shares,total_interactions",
    "reach,saved",
  ];
  for (const metrics of metricSets) {
    const url = graphUrl(`/${mediaId}/insights`, accessToken);
    url.searchParams.set("metric", metrics);
    try {
      const result = await graphJson<InsightsResponse>(url);
      const values = new Map(
        (result.data ?? []).map((item) => [item.name ?? "", insightNumber(item)]),
      );
      return values;
    } catch {
      // Media types expose different insight sets; try the next compatible set.
    }
  }
  return new Map<string, number | null>();
}

async function recentMedia(
  instagramUserId: string,
  accessToken: string,
  followers: number,
) {
  const url = graphUrl(`/${instagramUserId}/media`, accessToken);
  url.searchParams.set(
    "fields",
    [
      "id",
      "caption",
      "media_type",
      "media_product_type",
      "permalink",
      "media_url",
      "thumbnail_url",
      "timestamp",
      "like_count",
      "comments_count",
    ].join(","),
  );
  url.searchParams.set("limit", "18");
  try {
    const result = await graphJson<MediaResponse>(url);
    const media = (result.data ?? []).filter((item) => item.id && item.timestamp);
    const insightResults = await Promise.all(
      media.map((item) => mediaInsights(item.id, accessToken)),
    );
    return media
      .map((item, index) => {
        const values = insightResults[index];
        const likes = Number(item.like_count ?? 0);
        const comments = Number(item.comments_count ?? 0);
        const saves = values.get("saved") ?? null;
        const shares = values.get("shares") ?? null;
        const totalInteractions = values.get("total_interactions");
        const interactions =
          totalInteractions ??
          likes + comments + Number(saves ?? 0) + Number(shares ?? 0);
        const reach = values.get("reach") ?? null;
        const engagementBase = reach && reach > 0 ? reach : followers;
        return {
          id: item.id,
          caption: item.caption?.trim() || "Publicação sem legenda",
          mediaType: item.media_product_type ?? item.media_type ?? "MEDIA",
          permalink: item.permalink ?? null,
          thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
          timestamp: item.timestamp!,
          likes,
          comments,
          views: values.get("views") ?? null,
          reach,
          saves,
          shares,
          interactions,
          engagementRate:
            engagementBase > 0
              ? Number(((interactions / engagementBase) * 100).toFixed(2))
              : null,
        };
      })
      .sort((a, b) => b.interactions - a.interactions);
  } catch {
    return [];
  }
}

function combineSeries(
  metrics: Record<"views" | "reach" | "interactions", InsightItem | null>,
  since: Date,
  until: Date,
) {
  const maps = {
    views: new Map(insightSeries(metrics.views).map((item) => [item.date, item.value])),
    reach: new Map(insightSeries(metrics.reach).map((item) => [item.date, item.value])),
    interactions: new Map(
      insightSeries(metrics.interactions).map((item) => [item.date, item.value]),
    ),
  };
  const points = [];
  for (
    let cursor = new Date(since);
    cursor.getTime() <= until.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = isoDay(cursor);
    points.push({
      date,
      views: maps.views.get(date) ?? 0,
      reach: maps.reach.get(date) ?? 0,
      interactions: maps.interactions.get(date) ?? 0,
    });
  }
  return points;
}

function bestContentTimes(
  topMedia: InstagramInsightsPayload["topMedia"],
) {
  const grouped = new Map<
    string,
    { weekday: number; hour: number; total: number; count: number }
  >();
  for (const media of topMedia) {
    const date = new Date(media.timestamp);
    const weekday = date.getDay();
    const hour = date.getHours();
    const key = `${weekday}-${hour}`;
    const current = grouped.get(key) ?? { weekday, hour, total: 0, count: 0 };
    current.total += media.interactions;
    current.count += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((item) => ({
      weekday: item.weekday,
      hour: item.hour,
      score: Math.round(item.total / item.count),
      source: "content" as const,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function bestAudienceTimes(activeHours: Array<{ hour: number; value: number }>) {
  return [...activeHours]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({
      weekday: -1,
      hour: item.hour,
      score: item.value,
      source: "audience" as const,
    }));
}

export async function fetchInstagramInsights({
  instagramUserId,
  accessToken,
  followers,
  mediaCount,
  days,
}: {
  instagramUserId: string;
  accessToken: string;
  followers: number;
  mediaCount: number;
  days: number;
}): Promise<InstagramInsightsPayload> {
  const untilDate = new Date();
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - days + 1);
  sinceDate.setUTCHours(0, 0, 0, 0);
  const since = isoDay(sinceDate);
  const until = isoDay(untilDate);

  const metricNames = {
    views: "views",
    reach: "reach",
    interactions: "total_interactions",
    accountsEngaged: "accounts_engaged",
    profileViews: "profile_views",
    websiteClicks: "website_clicks",
    netFollows: "follows_and_unfollows",
  } as const;
  const metricEntries = await Promise.all(
    Object.entries(metricNames).map(async ([key, metric]) => [
      key,
      await accountMetric(instagramUserId, accessToken, metric, since, until),
    ]),
  );
  const metrics = Object.fromEntries(metricEntries) as Record<
    keyof typeof metricNames,
    InsightItem | null
  >;

  const [gender, age, countries, cities, activeHours, topMedia] =
    await Promise.all([
      audienceBreakdown(instagramUserId, accessToken, "gender"),
      audienceBreakdown(instagramUserId, accessToken, "age"),
      audienceBreakdown(instagramUserId, accessToken, "country"),
      audienceBreakdown(instagramUserId, accessToken, "city"),
      onlineFollowers(instagramUserId, accessToken),
      recentMedia(instagramUserId, accessToken, followers),
    ]);

  const accountInsights = Object.values(metrics).some(Boolean);
  const audienceAvailable = Boolean(
    gender.length || age.length || countries.length || cities.length,
  );
  const mediaInsightsAvailable = topMedia.some(
    (item) => item.reach != null || item.views != null || item.saves != null,
  );
  const warnings: string[] = [];
  if (!accountInsights) {
    warnings.push(
      "A Meta ainda não liberou métricas de desempenho para este perfil ou período.",
    );
  }
  if (!audienceAvailable) {
    warnings.push(
      "Dados demográficos exigem volume mínimo de público e atividade definido pela Meta.",
    );
  }
  if (!activeHours.length && !topMedia.length) {
    warnings.push(
      "Ainda não há histórico suficiente para recomendar horários de publicação.",
    );
  }

  return {
    connected: true,
    period: { days, since, until },
    syncedAt: new Date().toISOString(),
    summary: {
      followers,
      mediaCount,
      views: insightNumber(metrics.views),
      reach: insightNumber(metrics.reach),
      interactions: insightNumber(metrics.interactions),
      accountsEngaged: insightNumber(metrics.accountsEngaged),
      profileViews: insightNumber(metrics.profileViews),
      websiteClicks: insightNumber(metrics.websiteClicks),
      netFollows: insightNumber(metrics.netFollows),
    },
    series: combineSeries(
      {
        views: metrics.views,
        reach: metrics.reach,
        interactions: metrics.interactions,
      },
      sinceDate,
      untilDate,
    ),
    audience: {
      gender,
      age,
      countries: countries.slice(0, 8),
      cities: cities.slice(0, 8),
      note: audienceAvailable
        ? null
        : "A Meta oculta a composição do público quando a conta não atinge o volume mínimo necessário.",
    },
    activeHours,
    bestTimes: activeHours.length
      ? bestAudienceTimes(activeHours)
      : bestContentTimes(topMedia),
    topMedia: topMedia.slice(0, 12),
    availability: {
      accountInsights,
      audience: audienceAvailable,
      activeHours: Boolean(activeHours.length),
      mediaInsights: mediaInsightsAvailable,
    },
    warnings,
  };
}
