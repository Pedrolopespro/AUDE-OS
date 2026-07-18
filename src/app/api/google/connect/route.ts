import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl, GOOGLE_SCOPES } from "@/lib/google/oauth";

// Inicia o OAuth incremental para conectar Search Console ou GA4 a um workspace.
// Separado do login: o consent de dados só é pedido a quem conecta, não a todo usuário.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provedor = searchParams.get("provedor");

  // login: fluxo público de entrada — sem sessão nem workspace
  if (provedor === "login") {
    return NextResponse.redirect(getAuthUrl({ workspaceId: "", provedor: "login" }));
  }

  const workspaceId = searchParams.get("workspace");
  if (!workspaceId || !provedor || !GOOGLE_SCOPES[provedor]) {
    return NextResponse.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: usuario } = await supabase
    .from("usuario")
    .select("papel")
    .eq("id", user.id)
    .single();
  if (!usuario || !["administrador", "guardiao"].includes(usuario.papel)) {
    return NextResponse.json({ erro: "Apenas Guardiões conectam contas" }, { status: 403 });
  }

  return NextResponse.redirect(getAuthUrl({ workspaceId, provedor }));
}
