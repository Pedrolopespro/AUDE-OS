import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Calcula o status do cliente a partir do Snapshot (Fase 4 do plano):
 * queda de sessões GA4 > 20% entre o snapshot atual e um de >= 7 dias antes
 * => "critico"; caso contrário => "ativo". Status "encerrado" (offboarding)
 * e "pausado" (decisão manual) nunca são sobrescritos.
 */
export async function recalcularStatusCliente(workspaceId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: workspace } = await admin
    .from("workspace")
    .select("cliente_id, cliente (status)")
    .eq("id", workspaceId)
    .single();
  if (!workspace) return;

  const clienteAtual = Array.isArray(workspace.cliente)
    ? workspace.cliente[0]
    : workspace.cliente;
  if (!clienteAtual || ["encerrado", "pausado"].includes(clienteAtual.status)) return;

  const { data: snapshots } = await admin
    .from("snapshot")
    .select("valor, data")
    .eq("workspace_id", workspaceId)
    .eq("fonte", "google_ga4")
    .eq("metrica", "sessoes_7d")
    .order("data", { ascending: false })
    .limit(30);

  let novoStatus = "ativo";
  if (snapshots && snapshots.length >= 2) {
    const atual = snapshots[0];
    const corte = new Date(atual.data);
    corte.setDate(corte.getDate() - 7);
    const anterior = snapshots.find((s) => new Date(s.data) <= corte);
    if (anterior && Number(anterior.valor) > 0) {
      const variacao = (Number(atual.valor) - Number(anterior.valor)) / Number(anterior.valor);
      if (variacao < -0.2) novoStatus = "critico";
    }
  }

  if (novoStatus !== clienteAtual.status) {
    await admin.from("cliente").update({ status: novoStatus }).eq("id", workspace.cliente_id);
    await admin.from("historico").insert({
      workspace_id: workspaceId,
      evento: "status_calculado",
      detalhe: { de: clienteAtual.status, para: novoStatus },
    });
  }
}
