"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const contratoSchema = z.object({
  cliente_id: z.uuid(),
  valor_mensal: z.coerce.number().positive(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

const faturaSchema = z.object({
  contrato_id: z.uuid(),
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Competência inválida"),
  valor: z.coerce.number().positive().optional(),
});

const marcarSchema = z.object({
  fatura_id: z.uuid(),
  status: z.enum(["pendente", "pago", "atrasado"]),
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

export async function criarContrato(formData: FormData): Promise<void> {
  await exigirStaff();

  const parsed = contratoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    valor_mensal: formData.get("valor_mensal"),
    data_inicio: formData.get("data_inicio"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("contrato").insert({
    cliente_id: parsed.data.cliente_id,
    valor_mensal: parsed.data.valor_mensal,
    data_inicio: parsed.data.data_inicio,
    status: "ativo",
  });

  revalidatePath("/financeiro");
}

export async function gerarFatura(formData: FormData): Promise<void> {
  await exigirStaff();

  const parsed = faturaSchema.safeParse({
    contrato_id: formData.get("contrato_id"),
    competencia: formData.get("competencia"),
    valor: formData.get("valor") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const competencia = `${parsed.data.competencia}-01`;

  // valor default = valor_mensal do contrato
  let valor = parsed.data.valor;
  if (valor == null) {
    const { data: contrato } = await supabase
      .from("contrato")
      .select("valor_mensal")
      .eq("id", parsed.data.contrato_id)
      .single();
    if (!contrato) return;
    valor = Number(contrato.valor_mensal);
  }

  // evita fatura duplicada para a mesma competência
  const { data: existente } = await supabase
    .from("fatura")
    .select("id")
    .eq("contrato_id", parsed.data.contrato_id)
    .eq("competencia", competencia)
    .maybeSingle();
  if (existente) return;

  await supabase.from("fatura").insert({
    contrato_id: parsed.data.contrato_id,
    competencia,
    valor,
    status: "pendente",
  });

  revalidatePath("/financeiro");
}

export async function marcarFatura(formData: FormData): Promise<void> {
  await exigirStaff();

  const parsed = marcarSchema.safeParse({
    fatura_id: formData.get("fatura_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: fatura } = await supabase
    .from("fatura")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.fatura_id)
    .select("contrato_id")
    .single();

  // sincroniza status do contrato: alguma fatura atrasada => atrasado; senão ativo
  if (fatura) {
    const { data: contrato } = await supabase
      .from("contrato")
      .select("id, status")
      .eq("id", fatura.contrato_id)
      .single();
    if (contrato && contrato.status !== "cancelado") {
      const { count } = await supabase
        .from("fatura")
        .select("id", { count: "exact", head: true })
        .eq("contrato_id", fatura.contrato_id)
        .eq("status", "atrasado");
      const novoStatus = (count ?? 0) > 0 ? "atrasado" : "ativo";
      if (novoStatus !== contrato.status) {
        await supabase.from("contrato").update({ status: novoStatus }).eq("id", contrato.id);
      }
    }
  }

  revalidatePath("/financeiro");
}

export async function cancelarContrato(formData: FormData): Promise<void> {
  await exigirStaff();

  const parsed = z.uuid().safeParse(formData.get("contrato_id"));
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("contrato").update({ status: "cancelado" }).eq("id", parsed.data);

  revalidatePath("/financeiro");
}
