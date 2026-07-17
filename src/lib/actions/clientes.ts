"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const clienteSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  segmento: z.string().optional(),
  site: z.string().optional(),
  convite_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

export interface ActionState {
  erro?: string;
}

async function exigirStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, papel, agencia_id, nome")
    .eq("id", user.id)
    .single();

  if (!usuario || !["administrador", "guardiao"].includes(usuario.papel)) {
    redirect("/");
  }
  return usuario;
}

export async function criarCliente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const usuario = await exigirStaff();

  const parsed = clienteSchema.safeParse({
    nome: formData.get("nome"),
    segmento: formData.get("segmento") || undefined,
    site: formData.get("site") || undefined,
    convite_email: formData.get("convite_email") || "",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  const admin = createAdminClient();

  const { data: cliente, error } = await admin
    .from("cliente")
    .insert({
      agencia_id: usuario.agencia_id,
      nome: dados.nome,
      segmento: dados.segmento ?? null,
      site: dados.site ?? null,
      guardiao_id: usuario.id,
      convite_email: dados.convite_email || null,
    })
    .select("id")
    .single();

  if (error || !cliente) return { erro: `Falha ao criar cliente: ${error?.message}` };

  const { data: workspace, error: wsError } = await admin
    .from("workspace")
    .insert({ cliente_id: cliente.id })
    .select("id")
    .single();

  if (wsError || !workspace) return { erro: `Falha ao criar workspace: ${wsError?.message}` };

  // guardião responsável já entra vinculado ao workspace
  await admin.from("usuario_workspace").insert({
    usuario_id: usuario.id,
    workspace_id: workspace.id,
  });

  await admin.from("historico").insert({
    workspace_id: workspace.id,
    evento: "cliente_criado",
    detalhe: { nome: dados.nome },
    usuario_id: usuario.id,
  });

  if (dados.convite_email) {
    await enviarConvite(cliente.id, dados.convite_email, dados.nome);
  }

  revalidatePath("/");
  redirect(`/w/${workspace.id}`);
}

export async function enviarConvite(
  clienteId: string,
  email: string,
  nomeCliente: string
): Promise<{ erro?: string }> {
  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: email,
      subject: `${nomeCliente}, seu Workspace na AUDE está pronto`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0B0B0C;">
          <h1 style="font-size: 22px;">AUDE</h1>
          <p>Olá! O Workspace de <strong>${nomeCliente}</strong> foi criado no AUDE OS.</p>
          <p>Você terá visão em tempo real das conexões e resultados digitais da sua empresa. Quem opera é o seu Guardião AUDE — você acompanha tudo.</p>
          <p style="margin: 32px 0;">
            <a href="${siteUrl}/login" style="background: #0B0B0C; color: #F7F7F5; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Acessar com Google
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">Use este e-mail (${email}) ao entrar com o Google para que o acesso seja reconhecido automaticamente.</p>
        </div>
      `,
    });

    await admin.from("cliente").update({ convite_status: "enviado" }).eq("id", clienteId);
    return {};
  } catch (err: unknown) {
    return { erro: err instanceof Error ? err.message : "Falha ao enviar convite" };
  }
}

export async function reenviarConvite(clienteId: string): Promise<void> {
  await exigirStaff();
  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("cliente")
    .select("id, nome, convite_email")
    .eq("id", clienteId)
    .single();
  if (cliente?.convite_email) {
    await enviarConvite(cliente.id, cliente.convite_email, cliente.nome);
  }
  revalidatePath("/");
}
