import { getDatabase } from "@/db/runtime";
import {
  createInvitationToken,
  hashInvitationToken,
} from "@/lib/crypto";
import { requireServiceAuthorization } from "@/lib/config";

export async function POST(request: Request) {
  try {
    await requireServiceAuthorization(request);
    const body = (await request.json()) as {
      clientId?: string;
      clientName?: string;
    };
    const clientId = body.clientId?.trim();
    const clientName = body.clientName?.trim();
    if (!clientId || !clientName) {
      return Response.json(
        { error: "Cliente incompleto para gerar o convite." },
        { status: 400 },
      );
    }

    const rawToken = createInvitationToken();
    const tokenHash = await hashInvitationToken(rawToken);
    const invitationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const db = await getDatabase();
    await db.batch([
      db
        .prepare(
          "UPDATE invitations SET status = 'replaced' WHERE client_id = ? AND status = 'pending'",
        )
        .bind(clientId),
      db
        .prepare(`
          INSERT INTO invitations
            (id, token_hash, client_id, client_name, status, expires_at)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `)
        .bind(invitationId, tokenHash, clientId, clientName, expiresAt),
    ]);

    const invitationUrl = new URL("/connect", request.url);
    invitationUrl.searchParams.set("token", rawToken);
    return Response.json({
      invitationUrl: invitationUrl.toString(),
      expiresAt,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o convite.",
      },
      { status: 401 },
    );
  }
}
