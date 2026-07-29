import { getDatabase } from "@/db/runtime";
import {
  requireMetaConfiguration,
  requireServiceAuthorization,
} from "@/lib/config";
import { decryptAccessToken } from "@/lib/crypto";

type ConnectionRow = {
  username: string;
  account_name: string | null;
  account_type: string | null;
  profile_picture_url: string | null;
  followers_count: number;
  media_count: number;
  token_expires_at: string | null;
  last_synced_at: string;
  access_token_encrypted: string;
};

function publicConnection(row: ConnectionRow) {
  return {
    connected: true,
    username: row.username,
    accountName: row.account_name,
    accountType: row.account_type,
    profilePictureUrl: row.profile_picture_url,
    followersCount: row.followers_count,
    mediaCount: row.media_count,
    tokenExpiresAt: row.token_expires_at,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireServiceAuthorization(request);
    const { id } = await context.params;
    const db = await getDatabase();
    const connection = await db
      .prepare(`
        SELECT username, account_name, account_type, profile_picture_url,
               followers_count, media_count, token_expires_at, last_synced_at,
               access_token_encrypted
        FROM instagram_connections
        WHERE client_id = ?
      `)
      .bind(id)
      .first<ConnectionRow>();

    if (connection) return Response.json(publicConnection(connection));

    const pending = await db
      .prepare(`
        SELECT expires_at
        FROM invitations
        WHERE client_id = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(id)
      .first<{ expires_at: string }>();
    return Response.json({
      connected: false,
      invitationPending: Boolean(pending),
      invitationExpiresAt: pending?.expires_at ?? null,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Acesso interno recusado.",
      },
      { status: 401 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireServiceAuthorization(request);
    const { id } = await context.params;
    const db = await getDatabase();
    const connection = await db
      .prepare(`
        SELECT username, account_name, account_type, profile_picture_url,
               followers_count, media_count, token_expires_at, last_synced_at,
               access_token_encrypted
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
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set(
      "fields",
      "username,name,account_type,profile_picture_url,followers_count,media_count",
    );
    profileUrl.searchParams.set("access_token", accessToken);
    const profileResponse = await fetch(profileUrl);
    const profile = (await profileResponse.json()) as {
      username?: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (!profileResponse.ok || !profile.username) {
      throw new Error(
        profile.error?.message ?? "A Meta recusou a atualização dos dados.",
      );
    }

    await db
      .prepare(`
        UPDATE instagram_connections
        SET username = ?, account_name = ?, account_type = ?,
            profile_picture_url = ?, followers_count = ?, media_count = ?,
            last_synced_at = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `)
      .bind(
        profile.username,
        profile.name ?? null,
        profile.account_type ?? null,
        profile.profile_picture_url ?? null,
        profile.followers_count ?? 0,
        profile.media_count ?? 0,
        id,
      )
      .run();
    const updated = await db
      .prepare(`
        SELECT username, account_name, account_type, profile_picture_url,
               followers_count, media_count, token_expires_at, last_synced_at,
               access_token_encrypted
        FROM instagram_connections WHERE client_id = ?
      `)
      .bind(id)
      .first<ConnectionRow>();
    return Response.json(updated ? publicConnection(updated) : { connected: false });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os dados.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireServiceAuthorization(request);
    const { id } = await context.params;
    const db = await getDatabase();
    await db.batch([
      db
        .prepare("DELETE FROM instagram_connections WHERE client_id = ?")
        .bind(id),
      db
        .prepare(
          "UPDATE invitations SET status = 'revoked' WHERE client_id = ? AND status = 'pending'",
        )
        .bind(id),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível desconectar.",
      },
      { status: 500 },
    );
  }
}
