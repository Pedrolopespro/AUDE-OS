type GoogleAdsEnvironment = {
  GOOGLE_ADS_DEVELOPER_TOKEN?: string;
  GOOGLE_ADS_OAUTH_CLIENT_ID?: string;
  GOOGLE_ADS_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_ADS_OAUTH_REFRESH_TOKEN?: string;
  GOOGLE_ADS_API_VERSION?: string;
};

type GoogleAdsRestRow = {
  customer?: {
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
  };
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
  };
  segments?: {
    date?: string;
  };
  metrics?: {
    costMicros?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
};

type GoogleAdsStreamChunk = {
  results?: GoogleAdsRestRow[];
};

export class GoogleAdsConfigurationError extends Error {
  constructor(
    message: string,
    public code:
      | "credentials_required"
      | "oauth_failed"
      | "google_ads_api_failed",
    public status: number,
  ) {
    super(message);
  }
}

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const date = (value: Date) => value.toISOString().slice(0, 10);
  return { start: date(start), end: date(end) };
}

function safeGoogleError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message.slice(0, 300);
  }
  return "";
}

async function runtimeEnvironment() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as GoogleAdsEnvironment;
}

async function accessToken(environment: GoogleAdsEnvironment) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: environment.GOOGLE_ADS_OAUTH_CLIENT_ID ?? "",
      client_secret: environment.GOOGLE_ADS_OAUTH_CLIENT_SECRET ?? "",
      refresh_token: environment.GOOGLE_ADS_OAUTH_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new GoogleAdsConfigurationError(
      payload?.error_description?.slice(0, 300) ??
        "Não foi possível autenticar a conexão com o Google Ads.",
      "oauth_failed",
      502,
    );
  }
  return payload.access_token;
}

export async function googleAdsCredentialsConfigured() {
  try {
    const environment = await runtimeEnvironment();
    return Boolean(
      environment.GOOGLE_ADS_DEVELOPER_TOKEN &&
        environment.GOOGLE_ADS_OAUTH_CLIENT_ID &&
        environment.GOOGLE_ADS_OAUTH_CLIENT_SECRET &&
        environment.GOOGLE_ADS_OAUTH_REFRESH_TOKEN,
    );
  } catch {
    return false;
  }
}

export async function fetchGoogleAdsPerformance({
  managerCustomerId,
  customerId,
  days,
}: {
  managerCustomerId: string;
  customerId: string;
  days: 7 | 30 | 90;
}) {
  const environment = await runtimeEnvironment();
  if (
    !environment.GOOGLE_ADS_DEVELOPER_TOKEN ||
    !environment.GOOGLE_ADS_OAUTH_CLIENT_ID ||
    !environment.GOOGLE_ADS_OAUTH_CLIENT_SECRET ||
    !environment.GOOGLE_ADS_OAUTH_REFRESH_TOKEN
  ) {
    throw new GoogleAdsConfigurationError(
      "As credenciais da API Google Ads ainda não foram configuradas.",
      "credentials_required",
      503,
    );
  }

  const token = await accessToken(environment);
  const range = dateRange(days);
  const query = `
    SELECT
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      campaign.id,
      campaign.name,
      campaign.status,
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date ASC
  `;
  const apiVersion = environment.GOOGLE_ADS_API_VERSION || "v25";
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "developer-token": environment.GOOGLE_ADS_DEVELOPER_TOKEN,
        "login-customer-id": managerCustomerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(25_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | GoogleAdsStreamChunk[]
    | Record<string, unknown>
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    const detail = safeGoogleError(payload);
    throw new GoogleAdsConfigurationError(
      detail || "O Google Ads não conseguiu retornar os indicadores desta conta.",
      "google_ads_api_failed",
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }

  const rows = payload.flatMap((chunk) => chunk.results ?? []);
  const campaigns = new Map<
    string,
    {
      id: string;
      name: string;
      status: string;
      cost: number;
      impressions: number;
      clicks: number;
      conversions: number;
      conversionValue: number;
    }
  >();
  const daily = new Map<
    string,
    {
      date: string;
      cost: number;
      impressions: number;
      clicks: number;
      conversions: number;
      conversionValue: number;
    }
  >();

  let accountName = "";
  let currencyCode = "BRL";
  let timeZone = "America/Sao_Paulo";

  for (const row of rows) {
    accountName ||= row.customer?.descriptiveName ?? "";
    currencyCode = row.customer?.currencyCode ?? currencyCode;
    timeZone = row.customer?.timeZone ?? timeZone;
    const cost = toNumber(row.metrics?.costMicros) / 1_000_000;
    const impressions = toNumber(row.metrics?.impressions);
    const clicks = toNumber(row.metrics?.clicks);
    const conversions = toNumber(row.metrics?.conversions);
    const conversionValue = toNumber(row.metrics?.conversionsValue);
    const campaignId = row.campaign?.id ?? "unknown";
    const campaign = campaigns.get(campaignId) ?? {
      id: campaignId,
      name: row.campaign?.name ?? "Campanha sem nome",
      status: row.campaign?.status ?? "UNKNOWN",
      cost: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
    };
    campaign.cost += cost;
    campaign.impressions += impressions;
    campaign.clicks += clicks;
    campaign.conversions += conversions;
    campaign.conversionValue += conversionValue;
    campaigns.set(campaignId, campaign);

    const dayKey = row.segments?.date;
    if (dayKey) {
      const day = daily.get(dayKey) ?? {
        date: dayKey,
        cost: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
      };
      day.cost += cost;
      day.impressions += impressions;
      day.clicks += clicks;
      day.conversions += conversions;
      day.conversionValue += conversionValue;
      daily.set(dayKey, day);
    }
  }

  const campaignList = [...campaigns.values()]
    .map((campaign) => ({
      ...campaign,
      cpa: campaign.conversions > 0 ? campaign.cost / campaign.conversions : null,
      roas: campaign.cost > 0 ? campaign.conversionValue / campaign.cost : null,
    }))
    .sort((a, b) => b.cost - a.cost);
  const summary = campaignList.reduce(
    (total, campaign) => ({
      cost: total.cost + campaign.cost,
      impressions: total.impressions + campaign.impressions,
      clicks: total.clicks + campaign.clicks,
      conversions: total.conversions + campaign.conversions,
      conversionValue: total.conversionValue + campaign.conversionValue,
    }),
    { cost: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 },
  );

  return {
    accountName,
    currencyCode,
    timeZone,
    range,
    summary: {
      ...summary,
      cpa: summary.conversions > 0 ? summary.cost / summary.conversions : null,
      roas: summary.cost > 0 ? summary.conversionValue / summary.cost : null,
    },
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    campaigns: campaignList,
    syncedAt: new Date().toISOString(),
  };
}
