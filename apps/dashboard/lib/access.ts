import { ensureDatabase } from "@/db/runtime";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export type AppRole = "admin" | "manager" | "collaborator" | "client";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: "active" | "disabled";
  clientIds: string[];
};

export class AccessError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 | 404 = 403,
  ) {
    super(message);
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function decodeHeaderName(headers: Headers) {
  const encoded = headers.get("oai-authenticated-user-full-name");
  if (
    !encoded ||
    headers.get("oai-authenticated-user-full-name-encoding") !==
      "percent-encoded-utf-8"
  ) {
    return null;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function chatGPTUserFromRequest(request: Request): ChatGPTUser | null {
  const email = request.headers.get("oai-authenticated-user-email");
  if (!email) return null;
  const fullName = decodeHeaderName(request.headers);
  return {
    email: normalizeEmail(email),
    fullName,
    displayName: fullName ?? email,
  };
}

async function adminEmails() {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as { AUDE_ADMIN_EMAILS?: string };
  return String(runtimeEnv.AUDE_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export async function resolveAppUser(
  identity: ChatGPTUser,
  options: { bootstrap?: boolean } = {},
): Promise<AppUser | null> {
  const db = await ensureDatabase();
  const email = normalizeEmail(identity.email);
  let user = await db
    .prepare(`
      SELECT id, email, name, role, status
      FROM app_users
      WHERE email = ?
      LIMIT 1
    `)
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      role: AppRole;
      status: "active" | "disabled";
    }>();

  if (!user && options.bootstrap) {
    const [{ total = 0 } = {}, recoveryEmails] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS total FROM app_users").first<{
        total: number;
      }>(),
      adminEmails(),
    ]);
    const isRecoveryAdmin = recoveryEmails.includes(email);
    const isFirstLocalAdmin =
      Number(total) === 0 && recoveryEmails.length === 0;
    if (isRecoveryAdmin || isFirstLocalAdmin) {
      const id = crypto.randomUUID();
      await db
        .prepare(`
          INSERT OR IGNORE INTO app_users
            (id, email, name, role, status, last_seen_at)
          VALUES (?, ?, ?, 'admin', 'active', CURRENT_TIMESTAMP)
        `)
        .bind(id, email, identity.fullName ?? identity.displayName)
        .run();
      user = await db
        .prepare(`
          SELECT id, email, name, role, status
          FROM app_users WHERE email = ? LIMIT 1
        `)
        .bind(email)
        .first();
    }
  }

  if (!user || user.status !== "active") return null;

  const memberships = await db
    .prepare(
      "SELECT client_id FROM client_memberships WHERE user_id = ? ORDER BY created_at",
    )
    .bind(user.id)
    .all<{ client_id: string }>();
  await db
    .prepare(
      "UPDATE app_users SET last_seen_at = CURRENT_TIMESTAMP, name = ? WHERE id = ?",
    )
    .bind(identity.fullName ?? user.name, user.id)
    .run();

  return {
    ...user,
    email: normalizeEmail(user.email),
    clientIds: (memberships.results ?? []).map((row) => row.client_id),
  };
}

export async function requireAppUser(request: Request) {
  const identity = chatGPTUserFromRequest(request);
  if (!identity) {
    throw new AccessError("Entre com seu usuário para continuar.", 401);
  }
  const user = await resolveAppUser(identity, { bootstrap: true });
  if (!user) {
    throw new AccessError("Seu usuário ainda não possui acesso à AUDE.", 403);
  }
  return user;
}

export function isAgencyLeader(user: AppUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canViewClient(user: AppUser, clientId: string) {
  return isAgencyLeader(user) || user.clientIds.includes(clientId);
}

export function canManageClient(user: AppUser) {
  return isAgencyLeader(user);
}

export function canManageContent(user: AppUser, clientId: string) {
  return (
    isAgencyLeader(user) ||
    (user.role === "collaborator" && user.clientIds.includes(clientId))
  );
}

export function requireClientView(user: AppUser, clientId: string) {
  if (!canViewClient(user, clientId)) {
    throw new AccessError("Você não tem acesso a este cliente.", 403);
  }
}

export function requireClientManagement(user: AppUser) {
  if (!canManageClient(user)) {
    throw new AccessError("Apenas a gestão da AUDE pode alterar clientes.", 403);
  }
}

export function requireContentManagement(user: AppUser, clientId: string) {
  if (!canManageContent(user, clientId)) {
    throw new AccessError("Seu acesso a este cliente é somente para consulta.", 403);
  }
}

export function requireAdmin(user: AppUser) {
  if (user.role !== "admin") {
    throw new AccessError("Apenas administradores gerenciam acessos.", 403);
  }
}

export function accessErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: fallback }, { status: 500 });
}
