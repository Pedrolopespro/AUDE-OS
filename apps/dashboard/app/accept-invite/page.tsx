import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { findAccessInvitation } from "@/lib/access-invitations";
import { AcceptInviteCard } from "./accept-invite-card";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor da agência",
  collaborator: "Colaborador",
  client: "Cliente",
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
  const identity = await requireChatGPTUser(returnTo);
  const invitation = await findAccessInvitation(token);
  const available = Boolean(invitation?.available);

  return (
    <AcceptInviteCard
      token={token}
      email={invitation?.email ?? ""}
      signedInEmail={identity.email}
      name={invitation?.name ?? ""}
      roleLabel={roleLabels[invitation?.role ?? ""] ?? "Usuário"}
      clientName={invitation?.clientName ?? null}
      available={available}
    />
  );
}
