import { getDatabase } from "@/db/runtime";
import { hashInvitationToken } from "./crypto";

export type InvitationRow = {
  id: string;
  client_id: string;
  client_name: string;
  status: string;
  expires_at: string;
};

export async function findInvitation(rawToken: string) {
  if (!rawToken || rawToken.length < 32) return null;
  const tokenHash = await hashInvitationToken(rawToken);
  const db = await getDatabase();
  return db
    .prepare(`
      SELECT id, client_id, client_name, status, expires_at
      FROM invitations
      WHERE token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first<InvitationRow>();
}

export function invitationAvailability(invitation: InvitationRow | null) {
  if (!invitation) return "invalid";
  if (invitation.status === "connected") return "connected";
  if (invitation.status !== "pending") return "invalid";
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return "expired";
  return "pending";
}
