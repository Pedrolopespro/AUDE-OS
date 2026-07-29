import {
  findInvitation,
  invitationAvailability,
} from "@/lib/invitations";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const invitation = await findInvitation(token);
  const status = invitationAvailability(invitation);

  if (!invitation || status === "invalid") {
    return Response.json(
      { status: "invalid", error: "Este convite não é válido." },
      { status: 404 },
    );
  }

  return Response.json({
    status,
    clientName: invitation.client_name,
    expiresAt: invitation.expires_at,
  });
}
