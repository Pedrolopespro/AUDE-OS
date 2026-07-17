import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  listarPropriedadesDaConexao,
  selecionarPropriedade,
} from "@/lib/actions/conexoes";

const provedorLabel: Record<string, string> = {
  google_search_console: "Search Console",
  google_ga4: "Google Analytics 4",
};

export default async function SelecionarPropriedadePage({
  params,
}: {
  params: Promise<{ id: string; conexaoId: string }>;
}) {
  const { id, conexaoId } = await params;

  const supabase = await createClient();
  const { data: conexao } = await supabase
    .from("conexao")
    .select("id, provedor, workspace_id")
    .eq("id", conexaoId)
    .eq("workspace_id", id)
    .single();
  if (!conexao) notFound();

  const propriedades = await listarPropriedadesDaConexao(conexaoId);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">
        Selecionar propriedade — {provedorLabel[conexao.provedor] ?? conexao.provedor}
      </h1>
      <p className="mt-1 text-sm text-[--color-aude-black]/60">
        A conta Google conectada tem acesso a estas propriedades. Escolha a do cliente.
      </p>

      <div className="mt-8 space-y-2">
        {propriedades.map((p) => (
          <form key={p.id} action={selecionarPropriedade}>
            <input type="hidden" name="conexao_id" value={conexaoId} />
            <input type="hidden" name="propriedade" value={p.id} />
            <input type="hidden" name="propriedade_nome" value={p.nome} />
            <button className="w-full rounded-lg border border-[--color-aude-stone] bg-white px-5 py-3 text-left text-sm transition hover:border-[--color-aude-petrol] hover:shadow-sm">
              {p.nome}
            </button>
          </form>
        ))}

        {propriedades.length === 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Nenhuma propriedade encontrada nessa conta. Verifique o acesso no Google e reconecte.
          </p>
        )}
      </div>
    </div>
  );
}
