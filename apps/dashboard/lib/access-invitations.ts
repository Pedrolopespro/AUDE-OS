import { ensureDatabase } from "@/db/runtime";

function bytesToBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function createAccessToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashAccessToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function findAccessInvitation(rawToken: string) {
  if (!rawToken) return null;
  const db = await ensureDatabase();
  const tokenHash = await hashAccessToken(rawToken);
  return db
    .prepare(`
      SELECT i.id, i.email, i.name, i.role, i.client_id AS clientId,
             i.status, i.expires_at AS expiresAt, c.name AS clientName,
             CASE
               WHEN i.status = 'pending'
                AND i.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
               THEN 1 ELSE 0
             END AS available
      FROM access_invitations i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first<{
      id: string;
      email: string;
      name: string;
      role: string;
      clientId: string | null;
      clientName: string | null;
      status: string;
      expiresAt: string;
      available: number;
    }>();
}
