import { ensureDatabase } from "@/db/runtime";
import {
  callbackUrl,
  encryptAccessToken,
  getMetaSecrets,
} from "@/lib/meta";

type ShortTokenResponse = {
  access_token?: string;
  user_id?: number;
  error_message?: string;
};

type LongTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

type InstagramProfile = {
  user_id?: string;
  id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  error?: { message?: string };
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const denied = requestUrl.searchParams.get("error");
  const returnUrl = new URL("/", request.url);
  let clientId: string | null = null;

  try {
    if (denied) throw new Error("A autorização do Instagram foi cancelada.");
    if (!code || !state) throw new Error("A resposta do Instagram está incompleta.");

    const db = await ensureDatabase();
    const stateRow = await db
      .prepare(`
        SELECT client_id
        FROM meta_oauth_states
        WHERE state = ? AND created_at >= datetime('now', '-15 minutes')
      `)
      .bind(state)
      .first<{ client_id: string }>();
    if (!stateRow) throw new Error("A autorização expirou. Tente conectar novamente.");
    clientId = stateRow.client_id;
    returnUrl.searchParams.set("client", clientId);
    returnUrl.searchParams.set("service", "social-media");

    await db
      .prepare("DELETE FROM meta_oauth_states WHERE state = ?")
      .bind(state)
      .run();

    const { appId, appSecret, encryptionKey } = await getMetaSecrets();
    const tokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(request),
      code,
    });
    const shortResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      },
    );
    const shortToken = (await shortResponse.json()) as ShortTokenResponse;
    if (!shortResponse.ok || !shortToken.access_token) {
      throw new Error(
        shortToken.error_message ?? "O Instagram não entregou um token válido.",
      );
    }

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl);
    const longToken = (await longResponse.json()) as LongTokenResponse;
    const accessToken = longToken.access_token ?? shortToken.access_token;
    if (!longResponse.ok && !longToken.access_token) {
      throw new Error(
        longToken.error?.message ?? "Não foi possível ampliar a sessão do Instagram.",
      );
    }

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set(
      "fields",
      "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
    );
    profileUrl.searchParams.set("access_token", accessToken);
    const profileResponse = await fetch(profileUrl);
    const profile = (await profileResponse.json()) as InstagramProfile;
    const instagramUserId =
      String(profile.user_id ?? profile.id ?? shortToken.user_id ?? "");
    if (!profileResponse.ok || !instagramUserId || !profile.username) {
      throw new Error(
        profile.error?.message ?? "Não foi possível identificar a conta do Instagram.",
      );
    }

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null;
    const encryptedToken = await encryptAccessToken(accessToken, encryptionKey);

    await db
      .prepare(`
        INSERT INTO instagram_connections (
          client_id, instagram_user_id, username, account_name, account_type,
          profile_picture_url, access_token_encrypted, token_expires_at,
          followers_count, media_count, connected_at, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(client_id) DO UPDATE SET
          instagram_user_id = excluded.instagram_user_id,
          username = excluded.username,
          account_name = excluded.account_name,
          account_type = excluded.account_type,
          profile_picture_url = excluded.profile_picture_url,
          access_token_encrypted = excluded.access_token_encrypted,
          token_expires_at = excluded.token_expires_at,
          followers_count = excluded.followers_count,
          media_count = excluded.media_count,
          connected_at = CURRENT_TIMESTAMP,
          last_synced_at = CURRENT_TIMESTAMP
      `)
      .bind(
        clientId,
        instagramUserId,
        profile.username,
        profile.name ?? null,
        profile.account_type ?? null,
        profile.profile_picture_url ?? null,
        encryptedToken,
        expiresAt,
        profile.followers_count ?? 0,
        profile.media_count ?? 0,
      )
      .run();

    returnUrl.searchParams.set("instagram", "connected");
  } catch (error) {
    returnUrl.searchParams.set(
      "instagram_error",
      error instanceof Error ? error.message : "Não foi possível conectar o Instagram.",
    );
  }

  return Response.redirect(returnUrl, 302);
}
