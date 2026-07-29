import { getDatabase } from "@/db/runtime";
import {
  oauthCallbackUrl,
  requireMetaConfiguration,
} from "@/lib/config";
import { encryptAccessToken } from "@/lib/crypto";

type ShortTokenResponse = {
  access_token?: string;
  user_id?: number;
  error_message?: string;
};

type LongTokenResponse = {
  access_token?: string;
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

  try {
    if (denied) throw new Error("cancelled");
    if (!code || !state) throw new Error("incomplete");

    const db = await getDatabase();
    const stateRow = await db
      .prepare(`
        SELECT s.invitation_id, i.client_id, i.client_name, i.status, i.expires_at
        FROM oauth_states s
        JOIN invitations i ON i.id = s.invitation_id
        WHERE s.state = ? AND s.created_at >= datetime('now', '-20 minutes')
      `)
      .bind(state)
      .first<{
        invitation_id: string;
        client_id: string;
        client_name: string;
        status: string;
        expires_at: string;
      }>();
    if (
      !stateRow ||
      stateRow.status !== "pending" ||
      new Date(stateRow.expires_at).getTime() <= Date.now()
    ) {
      throw new Error("expired");
    }

    await db
      .prepare("DELETE FROM oauth_states WHERE state = ?")
      .bind(state)
      .run();

    const { appId, appSecret, encryptionKey } =
      await requireMetaConfiguration();
    const shortResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri: oauthCallbackUrl(request),
          code,
        }),
      },
    );
    const shortToken = (await shortResponse.json()) as ShortTokenResponse;
    if (!shortResponse.ok || !shortToken.access_token) {
      throw new Error(shortToken.error_message ?? "token");
    }

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl);
    const longToken = (await longResponse.json()) as LongTokenResponse;
    const accessToken = longToken.access_token ?? shortToken.access_token;
    if (!longResponse.ok && !longToken.access_token) {
      throw new Error(longToken.error?.message ?? "long_token");
    }

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set(
      "fields",
      "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
    );
    profileUrl.searchParams.set("access_token", accessToken);
    const profileResponse = await fetch(profileUrl);
    const profile = (await profileResponse.json()) as InstagramProfile;
    const instagramUserId = String(
      profile.user_id ?? profile.id ?? shortToken.user_id ?? "",
    );
    if (!profileResponse.ok || !instagramUserId || !profile.username) {
      throw new Error(profile.error?.message ?? "profile");
    }

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null;
    const encryptedToken = await encryptAccessToken(accessToken, encryptionKey);

    await db.batch([
      db
        .prepare(`
          INSERT INTO instagram_connections (
            client_id, client_name, instagram_user_id, username, account_name,
            account_type, profile_picture_url, access_token_encrypted,
            token_expires_at, followers_count, media_count, connected_at,
            last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(client_id) DO UPDATE SET
            client_name = excluded.client_name,
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
          stateRow.client_id,
          stateRow.client_name,
          instagramUserId,
          profile.username,
          profile.name ?? null,
          profile.account_type ?? null,
          profile.profile_picture_url ?? null,
          encryptedToken,
          expiresAt,
          profile.followers_count ?? 0,
          profile.media_count ?? 0,
        ),
      db
        .prepare(
          "UPDATE invitations SET status = 'connected', connected_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(stateRow.invitation_id),
    ]);

    const success = new URL("/success", request.url);
    success.searchParams.set("client", stateRow.client_name);
    success.searchParams.set("username", profile.username);
    return Response.redirect(success, 302);
  } catch (error) {
    const failure = new URL("/error", request.url);
    failure.searchParams.set(
      "reason",
      error instanceof Error ? error.message : "unknown",
    );
    return Response.redirect(failure, 302);
  }
}
