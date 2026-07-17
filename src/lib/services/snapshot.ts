import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { getAdapter, type Provedor } from "@/lib/adapters";

/**
 * Atualiza o snapshot de uma conexão: busca métricas dos últimos 7 dias
 * via adapter, grava em `snapshot` e ajusta o status da conexão.
 * A mesma chamada que valida a conexão alimenta o card de resumo (item 8 do MVP).
 */
export async function atualizarSnapshot(conexaoId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: conexao, error } = await admin
    .from("conexao")
    .select("id, workspace_id, provedor, propriedade, credencial_cifrada, status")
    .eq("id", conexaoId)
    .single();

  if (error || !conexao?.credencial_cifrada || !conexao.propriedade) return;

  const adapter = getAdapter(conexao.provedor as Provedor);

  try {
    const refreshToken = decrypt(conexao.credencial_cifrada);
    const resultados = await adapter.buscarSnapshot(refreshToken, conexao.propriedade);

    if (resultados.length > 0) {
      await admin.from("snapshot").insert(
        resultados.map((r) => ({
          workspace_id: conexao.workspace_id,
          fonte: conexao.provedor,
          metrica: r.metrica,
          valor: r.valor,
          detalhe: r.detalhe ?? null,
        }))
      );
    }

    await admin
      .from("conexao")
      .update({ status: "conectado", atualizado_em: new Date().toISOString() })
      .eq("id", conexao.id);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : String(err);
    // invalid_grant = token revogado/expirado; o resto é erro genérico
    const status = mensagem.includes("invalid_grant") ? "expirado" : "erro";
    await admin
      .from("conexao")
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq("id", conexao.id);
  }
}
