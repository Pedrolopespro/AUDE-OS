type ConnectorEnvironment = {
  INSTAGRAM_CONNECTOR_URL?: string;
  CONNECTOR_SHARED_SECRET?: string;
};

async function connectorEnvironment() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as ConnectorEnvironment;
}

export async function connectorRequest(
  path: string,
  init: RequestInit = {},
) {
  const { INSTAGRAM_CONNECTOR_URL, CONNECTOR_SHARED_SECRET } =
    await connectorEnvironment();
  if (!INSTAGRAM_CONNECTOR_URL || !CONNECTOR_SHARED_SECRET) {
    throw new Error("O portal de conexão ainda não foi configurado.");
  }

  const url = new URL(path, INSTAGRAM_CONNECTOR_URL);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${CONNECTOR_SHARED_SECRET}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}
