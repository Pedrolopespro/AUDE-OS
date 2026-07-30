import { ensureDatabase } from "@/db/runtime";
import {
  accessErrorResponse,
  chatGPTUserFromRequest,
  AccessError,
  type AppRole,
} from "@/lib/access";
import { findAccessInvitation } from "@/lib/access-invitations";

const rolePriority: Record<AppRole, number> = {
  client: 1,
  collaborator: 2,
  manager: 3,
  admin: 4,
};

export async function POST(request: Request) {
  try {
    const identity = chatGPTUserFromRequest(request);
    if (!identity) {
      throw new AccessError("Entre com seu usuário para aceitar o convite.", 401);
    }
    const body = (await request.json()) as { token?: string };
    const invitation = await findAccessInvitation(body.token ?? "");
    if (!invitation || invitation.status !== "pending") {
      return Response.json(
        { error: "Este convite não está mais disponível." },
        { status: 410 },
      );
    }
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      return Response.json({ error: "Este convite expirou." }, { status: 410 });
    }
    if (invitation.email.toLowerCase() !== identity.email.toLowerCase()) {
      return Response.json(
        {
          error: `Este convite foi enviado para ${invitation.email}. Entre com esse mesmo e-mail.`,
        },
        { status: 403 },
      );
    }

    const role = invitation.role as AppRole;
    const db = await ensureDatabase();
    const existing = await db
      .prepare("SELECT id, role FROM app_users WHERE email = ? LIMIT 1")
      .bind(identity.email.toLowerCase())
      .first<{ id: string; role: AppRole }>();
    const userId = existing?.id ?? crypto.randomUUID();
    const finalRole =
      existing && rolePriority[existing.role] > rolePriority[role]
        ? existing.role
        : role;
    const statements = [
      db
        .prepare(`
          INSERT INTO app_users (id, email, name, role, status, last_seen_at)
          VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
          ON CONFLICT(email) DO UPDATE SET
            name = excluded.name,
            role = excluded.role,
            status = 'active',
            last_seen_at = CURRENT_TIMESTAMP
        `)
        .bind(
          userId,
          identity.email.toLowerCase(),
          invitation.name || identity.displayName,
          finalRole,
        ),
      db
        .prepare(`
          UPDATE access_invitations
          SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'
        `)
        .bind(invitation.id),
    ];
    if (invitation.clientId) {
      statements.splice(
        1,
        0,
        db
          .prepare(`
            INSERT OR IGNORE INTO client_memberships
              (id, user_id, client_id)
            VALUES (?, ?, ?)
          `)
          .bind(crypto.randomUUID(), userId, invitation.clientId),
      );
    }
    await db.batch(statements);

    return Response.json({ ok: true, redirectTo: "/" });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível aceitar o convite.");
  }
}
