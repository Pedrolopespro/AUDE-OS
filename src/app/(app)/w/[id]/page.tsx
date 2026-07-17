import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarMetricas } from "@/lib/actions/conexoes";

interface Conexao {
  id: string;
  provedor: string;
  status: string;
  propriedade: string | null;
  propriedade_nome: string | null;
  conectado_em: string | null;
}

interface Snapshot {
  fonte: string;
  metrica: string;
  valor: number;
  detalhe: Record<string, unknown> | null;
  data: string;
}

const provedorLabel: Record<string, string> = {
  google_search_console: "Search Console",
  google_ga4: "Google Analytics 4",
  google_ads: "Google Ads",
  metricool: "Metricool",
};

const statusUi: Record<string, { label: string; classe: string }> = {
  conectado: { label: "Conectado", classe: "bg-emerald-100 text-emerald-800" },
  expirado: { label: "Expirado", classe: "bg-amber-100 text-amber-800" },
  erro: { label: "Erro", classe: "bg-red-100 text-red-800" },
  nao_conectado: { label: "Não conectado", classe: "bg-gray-200 text-gray-600" },
};

const erroMsg: Record<string, string> = {
  oauth_negado: "Conexão cancelada no Google.",
  sem_refresh_token: "O Google não devolveu credencial. Tente novamente (o consent será repetido).",
  salvar_conexao: "Falha ao salvar a conexão.",
  sem_propriedades: "Nenhuma propriedade disponível nessa conta Google.",
  oauth_falhou: "Falha na conexão com o Google.",
};

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("papel")
    .eq("id", user.id)
    .single();
  const ehStaff = ["administrador", "guardiao"].includes(usuario?.papel ?? "");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, cliente (id, nome, segmento, site, status)")
    .eq("id", id)
    .single();
  if (!workspace) notFound();

  const cliente = Array.isArray(workspace.cliente)
    ? workspace.cliente[0]
    : workspace.cliente;

  const { data: conexoes } = await supabase
    .from("conexao")
    .select("id, provedor, status, propriedade, propriedade_nome, conectado_em")
    .eq("workspace_id", id);

  // último snapshot por fonte+métrica
  const { data: snapshots } = await supabase
    .from("snapshot")
    .select("fonte, metrica, valor, detalhe, data")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const ultimoPorChave = new Map<string, Snapshot>();
  for (const s of (snapshots ?? []) as Snapshot[]) {
    const chave = `${s.fonte}:${s.metrica}`;
    if (!ultimoPorChave.has(chave)) ultimoPorChave.set(chave, s);
  }
  const ga4 = ultimoPorChave.get("google_ga4:sessoes_7d");
  const gsc = ultimoPorChave.get("google_search_console:cliques_7d");

  const conexaoPor = (provedor: string): Conexao | undefined =>
    (conexoes as Conexao[] | null)?.find((c) => c.provedor === provedor);

  const provedoresMvp = ["google_search_console", "google_ga4"];

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[--color-aude-black]/40">
            Workspace
          </p>
          <h1 className="font-display text-2xl font-semibold">{cliente?.nome}</h1>
          <p className="mt-1 text-sm text-[--color-aude-black]/60">
            {cliente?.segmento ?? "—"} {cliente?.site ? `· ${cliente.site}` : ""}
          </p>
        </div>
        {ehStaff && (
          <form action={atualizarMetricas}>
            <input type="hidden" name="workspace_id" value={id} />
            <button className="rounded-md border border-[--color-aude-stone] px-3 py-1.5 text-xs font-medium transition hover:border-[--color-aude-petrol]">
              ↻ Atualizar métricas
            </button>
          </form>
        )}
      </div>

      {erro && (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {erroMsg[erro] ?? "Algo deu errado."}
        </p>
      )}

      {/* Card de resumo real — item 8 do MVP */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[--color-aude-black]/50">
          Últimos 7 dias
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-[--color-aude-navy] p-6 text-[--color-aude-white]">
            <p className="text-xs uppercase tracking-wide text-white/50">Sessões (GA4)</p>
            <p className="mt-2 font-display text-4xl font-semibold">
              {ga4 ? Number(ga4.valor).toLocaleString("pt-BR") : "—"}
            </p>
            <p className="mt-2 text-xs text-white/60">
              {ga4?.detalhe?.principal_pagina
                ? `Principal página: ${ga4.detalhe.principal_pagina}`
                : "Conecte o GA4 para ver dados reais"}
            </p>
          </div>
          <div className="rounded-lg bg-[--color-aude-petrol] p-6 text-[--color-aude-white]">
            <p className="text-xs uppercase tracking-wide text-white/50">
              Cliques na busca (Search Console)
            </p>
            <p className="mt-2 font-display text-4xl font-semibold">
              {gsc ? Number(gsc.valor).toLocaleString("pt-BR") : "—"}
            </p>
            <p className="mt-2 text-xs text-white/60">
              {gsc?.detalhe?.principal_consulta
                ? `Principal consulta: “${gsc.detalhe.principal_consulta}”`
                : "Conecte o Search Console para ver dados reais"}
            </p>
          </div>
        </div>
      </section>

      {/* Status das conexões — itens 4–7 do MVP */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[--color-aude-black]/50">
          Conexões
        </h2>
        <div className="mt-3 divide-y divide-[--color-aude-stone] rounded-lg border border-[--color-aude-stone] bg-white">
          {provedoresMvp.map((provedor) => {
            const conexao = conexaoPor(provedor);
            const st = statusUi[conexao?.status ?? "nao_conectado"];
            return (
              <div key={provedor} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{provedorLabel[provedor]}</p>
                  <p className="mt-0.5 text-xs text-[--color-aude-black]/50">
                    {conexao?.propriedade_nome ?? conexao?.propriedade ?? "Nenhuma propriedade selecionada"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.classe}`}>
                    {st.label}
                  </span>
                  {ehStaff && (
                    <a
                      href={`/api/google/connect?workspace=${id}&provedor=${provedor}`}
                      className="rounded-md border border-[--color-aude-stone] px-3 py-1 text-xs font-medium transition hover:border-[--color-aude-petrol]"
                    >
                      {conexao?.status === "conectado" ? "Reconectar" : "Conectar"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Fase 2 — visível, desabilitado */}
          <div className="flex items-center justify-between px-5 py-4 opacity-50">
            <div>
              <p className="text-sm font-medium">Metricool (Instagram, LinkedIn, Meta Ads, GMB)</p>
              <p className="mt-0.5 text-xs text-[--color-aude-black]/50">Fase 2</p>
            </div>
            <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
              Em breve
            </span>
          </div>
        </div>
      </section>

      {/* Abas futuras do Workspace — item 9 do MVP (estrutura criada, vazia) */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[--color-aude-black]/50">
          Estrutura do Workspace
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["Site", "Conhecimento", "Projetos", "Relatórios"].map((aba) => (
            <div
              key={aba}
              className="rounded-lg border border-dashed border-[--color-aude-stone] p-4 text-center text-xs text-[--color-aude-black]/40"
            >
              {aba}
              <br />
              <span className="text-[10px]">próximas fases</span>
            </div>
          ))}
        </div>
      </section>

      {ehStaff && (
        <p className="mt-10 text-xs text-[--color-aude-black]/40">
          <Link href="/" className="underline">
            ← Voltar para clientes
          </Link>
        </p>
      )}
    </div>
  );
}
