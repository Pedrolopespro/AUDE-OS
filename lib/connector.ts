type ConnectorEnvironment = {
  INSTAGRAM_CONNECTOR_URL?: string;
  CONNECTOR_SHARED_SECRET?: string;
  CONNECTOR_SITES_BYPASS_TOKEN?: string;
};

async function connectorEnvironment() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as ConnectorEnvironment;
}

export async function connectorRequest(
  path: string,
  init: RequestInit = {},
) {
  const {
    INSTAGRAM_CONNECTOR_URL,
    CONNECTOR_SHARED_SECRET,
    CONNECTOR_SITES_BYPASS_TOKEN,
  } = await connectorEnvironment();
  if (
    !INSTAGRAM_CONNECTOR_URL ||
    !CONNECTOR_SHARED_SECRET ||
    !CONNECTOR_SITES_BYPASS_TOKEN
  ) {
    throw new Error("O portal de conexão ainda não foi configurado.");
  }

  const url = new URL(path, INSTAGRAM_CONNECTOR_URL);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${CONNECTOR_SHARED_SECRET}`);
  headers.set(
    "OAI-Sites-Authorization",
    `Bearer ${CONNECTOR_SITES_BYPASS_TOKEN}`,
  );
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error("O portal de conexão está temporariamente indisponível.");
  }
}

export async function connectorJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; status: number }> {
  const response = await connectorRequest(path, init);
  const body = await response.text();
  try {
    return {
      data: JSON.parse(body) as T,
      status: response.status,
    };
  } catch {
    throw new Error("O portal de conexão enviou uma resposta inválida.");
  }
}
