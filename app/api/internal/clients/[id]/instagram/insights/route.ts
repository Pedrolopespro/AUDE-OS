import { getDatabase } from "@/db/runtime";
import {
  requireMetaConfiguration,
  requireServiceAuthorization,
} from "@/lib/config";
import { decryptAccessToken } from "@/lib/crypto";
import { fetchInstagramInsights } from "@/lib/instagram-insights";

type ConnectionRow = {
  instagram_user_id: string;
  access_token_encrypted: string;
  followers_count: number;
  media_count: number;
};

const allowedPeriods = new Set([7, 30, 90]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireServiceAuthorization(request);
    const { id } = await context.params;
    const requestUrl = new URL(request.url);
    const requestedDays = Number(requestUrl.searchParams.get("days") ?? 30);
    const days = allowedPeriods.has(requestedDays) ? requestedDays : 30;
    const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
    const db = await getDatabase();

    if (!forceRefresh) {
      const cached = await db
        .prepare(`
          SELECT payload_json
          FROM instagram_insights_cache
          WHERE client_id = ? AND period_days = ?
            AND fetched_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          LIMIT 1
        `)
        .bind(id, days)
        .first<{ payload_json: string }>();
      if (cached?.payload_json) {
        return Response.json({
          ...JSON.parse(cached.payload_json),
          cached: true,
        });
      }
    }

    const connection = await db
      .prepare(`
        SELECT instagram_user_id, access_token_encrypted,
               followers_count, media_count
        FROM instagram_connections
        WHERE client_id = ?
      `)
      .bind(id)
      .first<ConnectionRow>();
    if (!connection) {
      return Response.json({ error: "Instagram não conectado." }, { status: 404 });
    }

    const { encryptionKey } = await requireMetaConfiguration();
    const accessToken = await decryptAccessToken(
      connection.access_token_encrypted,
      encryptionKey,
    );
    const payload = await fetchInstagramInsights({
      instagramUserId: connection.instagram_user_id,
      accessToken,
      followers: Number(connection.followers_count ?? 0),
      mediaCount: Number(connection.media_count ?? 0),
      days,
    });

    await db
      .prepare(`
        INSERT INTO instagram_insights_cache
          (client_id, period_days, payload_json, fetched_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(client_id, period_days) DO UPDATE SET
          payload_json = excluded.payload_json,
          fetched_at = CURRENT_TIMESTAMP
      `)
      .bind(id, days, JSON.stringify(payload))
      .run();

    return Response.json({ ...payload, cached: false });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os insights.",
      },
      { status: 502 },
    );
  }
}
