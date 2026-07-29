import { ensureDatabase } from "@/db/runtime";
import { callbackUrl, getMetaAppId, instagramScopes } from "@/lib/meta";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const db = await ensureDatabase();
    const client = await db
      .prepare("SELECT id FROM clients WHERE id = ? LIMIT 1")
      .bind(id)
      .first<{ id: string }>();
    if (!client) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const state = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          "DELETE FROM meta_oauth_states WHERE created_at < datetime('now', '-15 minutes')",
        ),
      db
        .prepare(
          "INSERT INTO meta_oauth_states (state, client_id) VALUES (?, ?)",
        )
        .bind(state, id),
    ]);

    const authorization = new URL("https://www.instagram.com/oauth/authorize");
    authorization.searchParams.set("client_id", await getMetaAppId());
    authorization.searchParams.set("redirect_uri", callbackUrl(request));
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("scope", instagramScopes.join(","));
    authorization.searchParams.set("state", state);
    authorization.searchParams.set("enable_fb_login", "0");
    authorization.searchParams.set("force_authentication", "1");

    return Response.redirect(authorization, 302);
  } catch (error) {
    const url = new URL("/", request.url);
    url.searchParams.set("client", id);
    url.searchParams.set("service", "social-media");
    url.searchParams.set(
      "instagram_error",
      error instanceof Error ? error.message : "Não foi possível iniciar a conexão.",
    );
    return Response.redirect(url, 302);
  }
}
