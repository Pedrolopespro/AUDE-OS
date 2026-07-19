import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface UsuarioResumo {
  nome: string | null;
  email: string | null;
}

interface ItemHistorico {
  id: string;
  evento: string;
  detalhe: Record<string, unknown> | null;
  created_at: string;
  usuario: UsuarioResumo | UsuarioResumo[] | null;
}

const provedorLabel: Record<string, string> = {
  google_search_console: "Search Console",
  google_ga4: "Google Analytics 4",
  google_ads: "Google Ads",
  metricool: "Metricool",
};

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Primeiro valor de texto não vazio entre as chaves informadas. */
function texto(d: Record<string, unknown>, ...chaves: string[]): string | null {
  for (const chave of chaves) {
    const v = d[chave];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Resumo genérico do jsonb: até 3 pares chave: valor de tipos simples. */
function resumoGenerico(d: Record<string, unknown>): string | null {
  const pares = Object.entries(d)
    .filter(
      ([, v]) =>
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    )
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`);
  return pares.length ? pares.join(" · ") : null;
}

/** Label humano pra evento desconhecido: "projeto_arquivado" → "Projeto arquivado". */
function humanizar(evento: string): string {
  const limpo = evento.replace(/_/g, " ").trim();
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : "Evento";
}

interface InfoEvento {
  label: string;
  resumo: string | null;
  cor: string; // classe de fundo do ponto na linha do tempo
  icone: string;
}

function infoEvento(
  evento: string,
  detalhe: Record<string, unknown> | null
): InfoEvento {
  const d = detalhe ?? {};

  switch (evento) {
    case "cliente_criado":
      return {
        label: "Cliente criado",
        resumo: texto(d, "nome"),
        cor: "bg-aude-petrol",
        icone: "＋",
      };

    case "conexao_criada": {
      const provedor = texto(d, "provedor");
      const nomeProvedor = provedor
        ? provedorLabel[provedor] ?? provedor
        : "de integração";
      return {
        label: `Conexão ${nomeProvedor} conectada`,
        resumo: texto(d, "propriedade_nome", "propriedade"),
        cor: "bg-aude-navy",
        icone: "⇄",
      };
    }

    case "projeto_criado": {
      const nome = texto(d, "nome", "titulo");
      return {
        label: nome ? `Projeto criado: ${nome}` : "Projeto criado",
        resumo: texto(d, "status"),
        cor: "bg-aude-bordeaux",
        icone: "▸",
      };
    }

    case "projeto_status": {
      const nome = texto(d, "nome", "titulo", "projeto");
      const de = texto(d, "de", "status_anterior");
      const para = texto(d, "para", "status", "status_novo");
      return {
        label: nome
          ? `Status do projeto atualizado: ${nome}`
          : "Status do projeto atualizado",
        resumo:
          de && para ? `${de} → ${para}` : para ? `Novo status: ${para}` : resumoGenerico(d),
        cor: "bg-aude-bordeaux",
        icone: "→",
      };
    }

    case "conhecimento_criado": {
      const titulo = texto(d, "titulo", "nome");
      return {
        label: titulo
          ? `Conhecimento adicionado: ${titulo}`
          : "Conhecimento adicionado",
        resumo: texto(d, "tipo", "categoria"),
        cor: "bg-amber-600",
        icone: "✎",
      };
    }

    default:
      // Evento desconhecido — trata de forma genérica com o próprio texto do evento.
      return {
        label: humanizar(evento),
        resumo: resumoGenerico(d),
        cor: "bg-aude-black/40",
        icone: "•",
      };
  }
}

function nomeAutor(usuario: ItemHistorico["usuario"]): string {
  const u = Array.isArray(usuario) ? usuario[0] : usuario;
  return u?.nome ?? u?.email ?? "Sistema";
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, cliente (id, nome)")
    .eq("id", id)
    .single();
  if (!workspace) notFound();

  const cliente = Array.isArray(workspace.cliente)
    ? workspace.cliente[0]
    : workspace.cliente;

  const { data: historico } = await supabase
    .from("historico")
    .select("id, evento, detalhe, created_at, usuario:usuario_id (nome, email)")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const itens = (historico ?? []) as unknown as ItemHistorico[];

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-aude-black/40">
            Histórico
          </p>
          <h1 className="font-display text-2xl font-semibold">
            {cliente?.nome ?? "Workspace"}
          </h1>
          <p className="mt-1 text-sm text-aude-black/60">
            Linha do tempo de tudo o que aconteceu neste workspace.
          </p>
        </div>
        <Link
          href={`/w/${id}`}
          className="rounded-md border border-aude-stone px-3 py-1.5 text-xs font-medium transition hover:border-aude-petrol"
        >
          ← Voltar
        </Link>
      </div>

      <section className="mt-8">
        {itens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-aude-stone bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium">Nada por aqui ainda</p>
            <p className="mt-1 text-xs text-aude-black/50">
              Quando algo acontecer neste workspace — conexões, projetos,
              conhecimento — aparece nesta linha do tempo.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-aude-stone bg-white px-6 py-6 sm:px-8">
            <ol className="ml-3 border-l border-aude-stone">
              {itens.map((item) => {
                const info = infoEvento(item.evento, item.detalhe);
                return (
                  <li key={item.id} className="relative pb-8 pl-8 last:pb-0">
                    <span
                      aria-hidden
                      className={`absolute -left-[12.5px] top-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] leading-none text-aude-white ring-4 ring-white ${info.cor}`}
                    >
                      {info.icone}
                    </span>
                    <p className="text-sm font-medium">{info.label}</p>
                    {info.resumo && (
                      <p className="mt-0.5 text-xs text-aude-black/60">
                        {info.resumo}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-aude-black/40">
                      por {nomeAutor(item.usuario)} ·{" "}
                      {fmtDataHora.format(new Date(item.created_at))}
                    </p>
                  </li>
                );
              })}
            </ol>
            {itens.length === 100 && (
              <p className="mt-6 border-t border-aude-stone pt-4 text-center text-xs text-aude-black/40">
                Mostrando os 100 eventos mais recentes.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
