"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { getAdapter, type Provedor } from "@/lib/adapters";
import { atualizarSnapshot } from "@/lib/services/snapshot";

async function exigirStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, papel")
    .eq("id", user.id)
    .single();
  if (!usuario || !["administrador", "guardiao"].includes(usuario.papel)) redirect("/");
  return usuario;
}

export async function selecionarPropriedade(formData: FormData): Promise<void> {
  const usuario = await exigirStaff();
  const conexaoId = String(formData.get("conexao_id"));
  const propriedade = String(formData.get("propriedade"));
  const propriedadeNome = String(formData.get("propriedade_nome") ?? propriedade);

  const admin = createAdminClient();
  const { data: conexao } = await admin
    .from("conexao")
    .select("id, workspace_id, provedor")
    .eq("id", conexaoId)
    .single();
  if (!conexao) redirect("/");

  await admin
    .from("conexao")
    .update({ propriedade, propriedade_nome: propriedadeNome })
    .eq("id", conexaoId);

  await atualizarSnapshot(conexaoId);

  await admin.from("historico").insert({
    workspace_id: conexao.workspace_id,
    evento: "conexao_criada",
    detalhe: { provedor: conexao.provedor, propriedade },
    usuario_id: usuario.id,
  });

  revalidatePath(`/w/${conexao.workspace_id}`);
  redirect(`/w/${conexao.workspace_id}`);
}

export async function listarPropriedadesDaConexao(conexaoId: string) {
  await exigirStaff();
  const admin = createAdminClient();
  const { data: conexao } = await admin
    .from("conexao")
    .select("id, provedor, credencial_cifrada")
    .eq("id", conexaoId)
    .single();
  if (!conexao?.credencial_cifrada) return [];

  const adapter = getAdapter(conexao.provedor as Provedor);
  try {
    return await adapter.listarPropriedades(decrypt(conexao.credencial_cifrada));
  } catch {
    return [];
  }
}

export async function atualizarMetricas(formData: FormData): Promise<void> {
  await exigirStaff();
  const workspaceId = String(formData.get("workspace_id"));
  const admin = createAdminClient();

  const { data: conexoes } = await admin
    .from("conexao")
    .select("id")
    .eq("workspace_id", workspaceId)
    .not("propriedade", "is", null);

  for (const c of conexoes ?? []) {
    await atualizarSnapshot(c.id);
  }
  revalidatePath(`/w/${workspaceId}`);
}
