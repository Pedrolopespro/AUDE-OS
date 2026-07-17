import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeState, exchangeCode } from "@/lib/google/oauth";
import { encrypt } from "@/lib/crypto";
import { getAdapter, type Provedor } from "@/lib/adapters";
import { atualizarSnapshot } from "@/lib/services/snapshot";

// Callback do OAuth de conexão (Search Console / GA4).
// Salva o refresh token cifrado; se houver 1 propriedade, auto-seleciona e
// já grava o primeiro Snapshot; se houver várias, manda para a tela de escolha.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const state = stateRaw ? decodeState(stateRaw) : null;
  if (!state) {
    return NextResponse.redirect(new URL("/?erro=state_invalido", request.url));
  }
  const voltarPara = `/w/${state.workspaceId}`;

  if (oauthError || !code) {
    return NextResponse.redirect(new URL(`${voltarPara}?erro=oauth_negado`, request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL(`${voltarPara}?erro=sem_refresh_token`, request.url));
    }

    const admin = createAdminClient();
    const provedor = state.provedor as Provedor;

    const { data: conexao, error } = await admin
      .from("conexao")
      .upsert(
        {
          workspace_id: state.workspaceId,
          provedor,
          canal: null,
          credencial_cifrada: encrypt(tokens.refresh_token),
          status: "conectado",
          conectado_por: user.id,
          conectado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "workspace_id,provedor,canal" }
      )
      .select("id")
      .single();

    if (error || !conexao) {
      return NextResponse.redirect(new URL(`${voltarPara}?erro=salvar_conexao`, request.url));
    }

    // lista propriedades já no callback: 1 => auto-seleciona; N => tela de escolha
    const adapter = getAdapter(provedor);
    const propriedades = await adapter.listarPropriedades(tokens.refresh_token);

    if (propriedades.length === 1) {
      await admin
        .from("conexao")
        .update({ propriedade: propriedades[0].id, propriedade_nome: propriedades[0].nome })
        .eq("id", conexao.id);
      await atualizarSnapshot(conexao.id);
      await admin.from("historico").insert({
        workspace_id: state.workspaceId,
        evento: "conexao_criada",
        detalhe: { provedor, propriedade: propriedades[0].id },
        usuario_id: user.id,
      });
      return NextResponse.redirect(new URL(voltarPara, request.url));
    }

    if (propriedades.length === 0) {
      await admin.from("conexao").update({ status: "erro" }).eq("id", conexao.id);
      return NextResponse.redirect(new URL(`${voltarPara}?erro=sem_propriedades`, request.url));
    }

    return NextResponse.redirect(
      new URL(`/w/${state.workspaceId}/conexoes/${conexao.id}/selecionar`, request.url)
    );
  } catch {
    return NextResponse.redirect(new URL(`${voltarPara}?erro=oauth_falhou`, request.url));
  }
}
