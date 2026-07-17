import { google } from "googleapis";
import { createHmac, timingSafeEqual } from "crypto";

export const GOOGLE_SCOPES: Record<string, string[]> = {
  google_search_console: ["https://www.googleapis.com/auth/webmasters.readonly"],
  google_ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
};

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/google/callback`
  );
}

// state assinado (HMAC) para o round-trip do OAuth — evita CSRF/troca de workspace
interface OAuthState {
  workspaceId: string;
  provedor: string;
}

function sign(data: string): string {
  return createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY!)
    .update(data)
    .digest("base64url");
}

export function encodeState(state: OAuthState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeState(raw: string): OAuthState | null {
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export function getAuthUrl(state: OAuthState): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    // sem prompt=consent o Google só devolve refresh_token no primeiro consent;
    // com ele, reconectar sempre gera refresh_token novo
    prompt: "consent",
    scope: GOOGLE_SCOPES[state.provedor],
    state: encodeState(state),
  });
}

export async function exchangeCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function authFromRefreshToken(refreshToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
