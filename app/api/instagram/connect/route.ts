import { getDatabase } from "@/db/runtime";
import {
  instagramScopes,
  oauthCallbackUrl,
  requireMetaConfiguration,
} from "@/lib/config";
import {
  findInvitation,
  invitationAvailability,
} from "@/lib/invitations";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawToken = requestUrl.searchParams.get("token") ?? "";
  const invitation = await findInvitation(rawToken);
  if (!invitation || invitationAvailability(invitation) !== "pending") {
    return Response.redirect(new URL("/error?reason=invite", request.url), 302);
  }

  try {
    const { appId } = await requireMetaConfiguration();
    const state = crypto.randomUUID();
    const db = await getDatabase();
    await db.batch([
      db.prepare(
        "DELETE FROM oauth_states WHERE created_at < datetime('now', '-20 minutes')",
      ),
      db
        .prepare(
          "INSERT INTO oauth_states (state, invitation_id) VALUES (?, ?)",
        )
        .bind(state, invitation.id),
    ]);

    const authorization = new URL("https://www.instagram.com/oauth/authorize");
    authorization.searchParams.set("client_id", appId);
    authorization.searchParams.set("redirect_uri", oauthCallbackUrl(request));
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("scope", instagramScopes.join(","));
    authorization.searchParams.set("state", state);
    authorization.searchParams.set("force_reauth", "true");
    return Response.redirect(authorization, 302);
  } catch {
    return Response.redirect(new URL("/error?reason=config", request.url), 302);
  }
}
