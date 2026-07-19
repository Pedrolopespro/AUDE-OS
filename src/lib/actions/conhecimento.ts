"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TIPOS = ["briefing", "acesso", "decisao", "outro"] as const;

const conhecimentoSchema = z.object({
  titulo: z.string().min(2, "Título obrigatório"),
  tipo: z.enum(TIPOS),
  conteudo: z.string().optional(),
});

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

// filtro ativo na tela (?tipo=) — preservado nos redirects pós-ação
function sufixoFiltro(formData: FormData): string {
  const filtro = String(formData.get("tipo_filtro") ?? "");
  return (TIPOS as readonly string[]).includes(filtro) ? `?tipo=${filtro}` : "";
}

export async function criarConhecimento(formData: FormData): Promise<void> {
  const usuario = await exigirStaff();
  const workspaceId = String(formData.get("workspace_id"));

  const parsed = conhecimentoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo"),
    conteudo: formData.get("conteudo") || undefined,
  });
  if (!parsed.success) {
    redirect(`/w/${workspaceId}/conhecimento?erro=validacao`);
  }
  const dados = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("conhecimento").insert({
    workspace_id: workspaceId,
    titulo: dados.titulo,
    tipo: dados.tipo,
    conteudo: dados.conteudo ?? null,
    criado_por: usuario.id,
  });
  if (error) redirect(`/w/${workspaceId}/conhecimento?erro=salvar`);

  await admin.from("historico").insert({
    workspace_id: workspaceId,
    evento: "conhecimento_criado",
    detalhe: { titulo: dados.titulo, tipo: dados.tipo },
    usuario_id: usuario.id,
  });

  revalidatePath(`/w/${workspaceId}/conhecimento`);
  redirect(`/w/${workspaceId}/conhecimento${sufixoFiltro(formData)}`);
}

export async function atualizarConhecimento(formData: FormData): Promise<void> {
  await exigirStaff();
  const id = String(formData.get("id"));

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("conhecimento")
    .select("id, workspace_id")
    .eq("id", id)
    .single();
  if (!item) redirect("/");

  const parsed = conhecimentoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo"),
    conteudo: formData.get("conteudo") || undefined,
  });
  if (!parsed.success) {
    redirect(`/w/${item.workspace_id}/conhecimento?erro=validacao`);
  }
  const dados = parsed.data;

  const { error } = await admin
    .from("conhecimento")
    .update({
      titulo: dados.titulo,
      tipo: dados.tipo,
      conteudo: dados.conteudo ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) redirect(`/w/${item.workspace_id}/conhecimento?erro=salvar`);

  revalidatePath(`/w/${item.workspace_id}/conhecimento`);
  redirect(`/w/${item.workspace_id}/conhecimento${sufixoFiltro(formData)}`);
}

export async function excluirConhecimento(formData: FormData): Promise<void> {
  await exigirStaff();
  const id = String(formData.get("id"));

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("conhecimento")
    .select("id, workspace_id")
    .eq("id", id)
    .single();
  if (!item) redirect("/");

  const { error } = await admin.from("conhecimento").delete().eq("id", id);
  if (error) redirect(`/w/${item.workspace_id}/conhecimento?erro=salvar`);

  revalidatePath(`/w/${item.workspace_id}/conhecimento`);
  redirect(`/w/${item.workspace_id}/conhecimento${sufixoFiltro(formData)}`);
}
