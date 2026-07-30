import { ensureDatabase } from "@/db/runtime";
import {
  accessErrorResponse,
  requireAdmin,
  requireAppUser,
  type AppRole,
} from "@/lib/access";
import {
  createAccessToken,
  hashAccessToken,
} from "@/lib/access-invitations";

const roles = new Set<AppRole>([
  "admin",
  "manager",
  "collaborator",
  "client",
]);

export async function GET(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    requireAdmin(currentUser);
    const db = await ensureDatabase();
    const [usersResult, invitationsResult] = await Promise.all([
      db
        .prepare(`
          SELECT u.id, u.email, u.name, u.role, u.status,
                 u.created_at AS createdAt, u.last_seen_at AS lastSeenAt,
                 GROUP_CONCAT(c.name, '|||') AS clientNames
          FROM app_users u
          LEFT JOIN client_memberships m ON m.user_id = u.id
          LEFT JOIN clients c ON c.id = m.client_id
          GROUP BY u.id
          ORDER BY
            CASE u.role
              WHEN 'admin' THEN 1
              WHEN 'manager' THEN 2
              WHEN 'collaborator' THEN 3
              ELSE 4
            END,
            u.name
        `)
        .all<{
          id: string;
          email: string;
          name: string;
          role: AppRole;
          status: string;
          createdAt: string;
          lastSeenAt: string | null;
          clientNames: string | null;
        }>(),
      db
        .prepare(`
          SELECT i.id, i.email, i.name, i.role, i.status,
                 i.expires_at AS expiresAt, i.created_at AS createdAt,
                 c.name AS clientName
          FROM access_invitations i
          LEFT JOIN clients c ON c.id = i.client_id
          WHERE i.status = 'pending'
          ORDER BY i.created_at DESC
        `)
        .all(),
    ]);

    return Response.json({
      users: (usersResult.results ?? []).map((user) => ({
        ...user,
        clientNames: user.clientNames?.split("|||").filter(Boolean) ?? [],
      })),
      invitations: invitationsResult.results ?? [],
    });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível carregar os acessos.");
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    requireAdmin(currentUser);
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: AppRole;
      clientId?: string | null;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const name = body.name?.trim() ?? "";
    const role = body.role;
    const clientId = body.clientId?.trim() || null;

    if (!name || !email || !email.includes("@")) {
      return Response.json(
        { error: "Informe nome e e-mail válidos." },
        { status: 400 },
      );
    }
    if (!role || !roles.has(role)) {
      return Response.json({ error: "Perfil de acesso inválido." }, { status: 400 });
    }
    if ((role === "client" || role === "collaborator") && !clientId) {
      return Response.json(
        { error: "Selecione o cliente vinculado a este acesso." },
        { status: 400 },
      );
    }

    const db = await ensureDatabase();
    if (clientId) {
      const client = await db
        .prepare("SELECT id FROM clients WHERE id = ? AND active = 1 LIMIT 1")
        .bind(clientId)
        .first();
      if (!client) {
        return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
      }
    }

    const rawToken = createAccessToken();
    const tokenHash = await hashAccessToken(rawToken);
    const invitationId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await db.batch([
      db
        .prepare(`
          UPDATE access_invitations
          SET status = 'replaced'
          WHERE email = ? AND status = 'pending'
            AND COALESCE(client_id, '') = COALESCE(?, '')
        `)
        .bind(email, clientId),
      db
        .prepare(`
          INSERT INTO access_invitations
            (id, token_hash, email, name, role, client_id, status,
             expires_at, invited_by)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `)
        .bind(
          invitationId,
          tokenHash,
          email,
          name,
          role,
          clientId,
          expiresAt,
          currentUser.id,
        ),
    ]);

    const invitationUrl = new URL("/accept-invite", request.url);
    invitationUrl.searchParams.set("token", rawToken);
    return Response.json(
      { invitationUrl: invitationUrl.toString(), expiresAt },
      { status: 201 },
    );
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível gerar o convite.");
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    requireAdmin(currentUser);
    const body = (await request.json()) as { invitationId?: string };
    if (!body.invitationId) {
      return Response.json({ error: "Convite inválido." }, { status: 400 });
    }
    const db = await ensureDatabase();
    await db
      .prepare(`
        UPDATE access_invitations
        SET status = 'revoked'
        WHERE id = ? AND status = 'pending'
      `)
      .bind(body.invitationId)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível cancelar o convite.");
  }
}
