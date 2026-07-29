type ConnectorEnvironment = {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  CONNECTOR_SHARED_SECRET?: string;
  AUDE_DASHBOARD_URL?: string;
};

export const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

export async function connectorEnvironment() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as ConnectorEnvironment;
}

export async function requireMetaConfiguration() {
  const environment = await connectorEnvironment();
  if (
    !environment.META_APP_ID ||
    !environment.META_APP_SECRET ||
    !environment.TOKEN_ENCRYPTION_KEY
  ) {
    throw new Error("A integração da AUDE ainda não foi configurada.");
  }
  return {
    appId: environment.META_APP_ID,
    appSecret: environment.META_APP_SECRET,
    encryptionKey: environment.TOKEN_ENCRYPTION_KEY,
  };
}

export async function requireServiceAuthorization(request: Request) {
  const { CONNECTOR_SHARED_SECRET } = await connectorEnvironment();
  const authorization = request.headers.get("authorization");
  if (
    !CONNECTOR_SHARED_SECRET ||
    authorization !== `Bearer ${CONNECTOR_SHARED_SECRET}`
  ) {
    throw new Error("Acesso interno não autorizado.");
  }
}

export function oauthCallbackUrl(request: Request) {
  return new URL("/api/meta/instagram/callback", request.url).toString();
}
