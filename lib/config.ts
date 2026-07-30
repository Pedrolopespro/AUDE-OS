type ConnectorEnvironment = {
  DATABASE_URL?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  CONNECTOR_SHARED_SECRET?: string;
  AUDE_DASHBOARD_URL?: string;
  APP_BASE_URL?: string;
};

export const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

export function connectorEnvironment(): ConnectorEnvironment {
  return process.env as ConnectorEnvironment;
}

export function requireMetaConfiguration() {
  const environment = connectorEnvironment();
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

export function requireServiceAuthorization(request: Request) {
  const { CONNECTOR_SHARED_SECRET } = connectorEnvironment();
  const authorization = request.headers.get("authorization");
  if (
    !CONNECTOR_SHARED_SECRET ||
    authorization !== `Bearer ${CONNECTOR_SHARED_SECRET}`
  ) {
    throw new Error("Acesso interno não autorizado.");
  }
}

export function oauthCallbackUrl(request: Request) {
  return publicUrl("/api/meta/instagram/callback", request);
}

export function publicUrl(path: string, request: Request) {
  const configuredBase = connectorEnvironment().APP_BASE_URL?.trim();
  return new URL(path, configuredBase || request.url).toString();
}
