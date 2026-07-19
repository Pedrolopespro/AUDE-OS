"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const criarSchema = z.object({
  workspace_id: z.uuid(),
  nome: z.string().min(2, "Nome obrigatório"),
  tipo: z.enum(["funil", "campanha", "site", "outro"]),
  descricao: z.string().optional(),
});

const statusSchema = z.object({
  projeto_id: z.uuid(),
  status: z.enum(["ativo", "pausado", "concluido"]),
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

export async function criarProjeto(formData: FormData): Promise<void> {
  const usuario = await exigirStaff();
  const workspaceId = String(formData.get("workspace_id") ?? "");

  const parsed = criarSchema.safeParse({
    workspace_id: workspaceId,
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao") || undefined,
  });
  if (!parsed.success) {
    if (!workspaceId) redirect("/");
    redirect(`/w/${workspaceId}/projetos?erro=dados_invalidos`);
  }
  const dados = parsed.data;

  const supabase = await createClient();
  const { data: projeto, error } = await supabase
    .from("projeto")
    .insert({
      workspace_id: dados.workspace_id,
      nome: dados.nome,
      tipo: dados.tipo,
      descricao: dados.descricao ?? null,
      status: "ativo",
    })
    .select("id, nome, status")
    .single();
  if (error || !projeto) {
    redirect(`/w/${dados.workspace_id}/projetos?erro=criar_falhou`);
  }

  await supabase.from("historico").insert({
    workspace_id: dados.workspace_id,
    evento: "projeto_criado",
    detalhe: { nome: projeto.nome, status: projeto.status },
    usuario_id: usuario.id,
  });

  revalidatePath(`/w/${dados.workspace_id}/projetos`);
}

export async function atualizarStatusProjeto(formData: FormData): Promise<void> {
  const usuario = await exigirStaff();

  const parsed = statusSchema.safeParse({
    projeto_id: formData.get("projeto_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/");
  const { projeto_id, status } = parsed.data;

  const supabase = await createClient();
  const { data: projeto } = await supabase
    .from("projeto")
    .select("id, workspace_id, nome")
    .eq("id", projeto_id)
    .single();
  if (!projeto) redirect("/");

  await supabase
    .from("projeto")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("id", projeto_id);

  await supabase.from("historico").insert({
    workspace_id: projeto.workspace_id,
    evento: "projeto_status",
    detalhe: { nome: projeto.nome, status },
    usuario_id: usuario.id,
  });

  revalidatePath(`/w/${projeto.workspace_id}/projetos`);
}

export async function excluirProjeto(formData: FormData): Promise<void> {
  await exigirStaff();

  const projetoId = z.uuid().safeParse(formData.get("projeto_id"));
  if (!projetoId.success) redirect("/");

  const supabase = await createClient();
  const { data: projeto } = await supabase
    .from("projeto")
    .select("id, workspace_id")
    .eq("id", projetoId.data)
    .single();
  if (!projeto) redirect("/");

  await supabase.from("projeto").delete().eq("id", projetoId.data);

  revalidatePath(`/w/${projeto.workspace_id}/projetos`);
}
