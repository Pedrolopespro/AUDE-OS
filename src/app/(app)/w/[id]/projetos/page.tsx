import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  criarProjeto,
  atualizarStatusProjeto,
  excluirProjeto,
} from "@/lib/actions/projetos";

interface Projeto {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  descricao: string | null;
  created_at: string;
  atualizado_em: string | null;
}

const tipoLabel: Record<string, string> = {
  funil: "Funil",
  campanha: "Campanha",
  site: "Site",
  outro: "Outro",
};

const statusUi: Record<string, { label: string; classe: string }> = {
  ativo: { label: "Ativo", classe: "bg-emerald-100 text-emerald-800" },
  pausado: { label: "Pausado", classe: "bg-amber-100 text-amber-800" },
  concluido: { label: "Concluído", classe: "bg-gray-200 text-gray-600" },
};

const erroMsg: Record<string, string> = {
  dados_invalidos: "Preencha o nome do projeto (mínimo 2 caracteres) e o tipo.",
  criar_falhou: "Falha ao criar o projeto. Tente novamente.",
};

function BotaoStatus({
  projetoId,
  status,
  children,
}: {
  projetoId: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <form action={atualizarStatusProjeto}>
      <input type="hidden" name="projeto_id" value={projetoId} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-md border border-aude-stone px-3 py-1 text-xs font-medium transition hover:border-aude-petrol">
        {children}
      </button>
    </form>
  );
}

export default async function ProjetosPage({
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
    .select("id, cliente (id, nome)")
    .eq("id", id)
    .single();
  if (!workspace) notFound();

  const cliente = Array.isArray(workspace.cliente)
    ? workspace.cliente[0]
    : workspace.cliente;

  const { data: projetos } = await supabase
    .from("projeto")
    .select("id, nome, tipo, status, descricao, created_at, atualizado_em")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });

  const lista = (projetos ?? []) as Projeto[];

  return (
    <div>
      <div>
        <p className="text-xs uppercase tracking-wide text-aude-black/40">
          {cliente?.nome} · Workspace
        </p>
        <h1 className="font-display text-2xl font-semibold">Projetos</h1>
        <p className="mt-2 text-xs text-aude-black/40">
          <Link href={`/w/${id}`} className="underline">
            ← Voltar
          </Link>
        </p>
      </div>

      {erro && (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {erroMsg[erro] ?? "Algo deu errado."}
        </p>
      )}

      {ehStaff && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-aude-black/50">
            Novo projeto
          </h2>
          <form
            action={criarProjeto}
            className="mt-3 rounded-lg border border-aude-stone bg-white p-5"
          >
            <input type="hidden" name="workspace_id" value={id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                name="nome"
                required
                minLength={2}
                placeholder="Nome do projeto"
                className="rounded-md border border-aude-stone px-3 py-2 text-sm transition focus:border-aude-petrol focus:outline-none"
              />
              <select
                name="tipo"
                defaultValue="funil"
                className="rounded-md border border-aude-stone bg-white px-3 py-2 text-sm transition focus:border-aude-petrol focus:outline-none"
              >
                <option value="funil">Funil</option>
                <option value="campanha">Campanha</option>
                <option value="site">Site</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <textarea
              name="descricao"
              rows={2}
              placeholder="Descrição (opcional)"
              className="mt-3 w-full rounded-md border border-aude-stone px-3 py-2 text-sm transition focus:border-aude-petrol focus:outline-none"
            />
            <button className="mt-3 rounded-md bg-aude-black px-4 py-2 text-sm font-medium text-aude-white transition hover:bg-aude-navy">
              Criar projeto
            </button>
          </form>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-aude-black/50">
          Projetos ({lista.length})
        </h2>

        {lista.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-aude-stone bg-white p-10 text-center">
            <p className="text-sm font-medium text-aude-black/60">
              Nenhum projeto por aqui ainda.
            </p>
            <p className="mt-1 text-xs text-aude-black/40">
              {ehStaff
                ? "Crie o primeiro projeto deste cliente usando o formulário acima."
                : "Seu Guardião AUDE vai cadastrar os projetos deste workspace em breve."}
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {lista.map((p) => {
              const st = statusUi[p.status] ?? statusUi.ativo;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-aude-stone bg-white p-5 transition hover:border-aude-petrol"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{p.nome}</p>
                      <p className="mt-0.5 text-xs text-aude-black/50">
                        {tipoLabel[p.tipo] ?? p.tipo}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.classe}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  {p.descricao && (
                    <p className="mt-3 text-sm text-aude-black/70">{p.descricao}</p>
                  )}

                  <p className="mt-3 text-xs text-aude-black/40">
                    Criado em{" "}
                    {new Date(p.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {p.atualizado_em &&
                      ` · atualizado em ${new Date(p.atualizado_em).toLocaleDateString(
                        "pt-BR",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}`}
                  </p>

                  {ehStaff && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-aude-stone pt-3">
                      {p.status === "ativo" && (
                        <>
                          <BotaoStatus projetoId={p.id} status="pausado">
                            Pausar
                          </BotaoStatus>
                          <BotaoStatus projetoId={p.id} status="concluido">
                            Concluir
                          </BotaoStatus>
                        </>
                      )}
                      {p.status === "pausado" && (
                        <>
                          <BotaoStatus projetoId={p.id} status="ativo">
                            Reativar
                          </BotaoStatus>
                          <BotaoStatus projetoId={p.id} status="concluido">
                            Concluir
                          </BotaoStatus>
                        </>
                      )}
                      {p.status === "concluido" && (
                        <BotaoStatus projetoId={p.id} status="ativo">
                          Reativar
                        </BotaoStatus>
                      )}
                      <form action={excluirProjeto} className="ml-auto">
                        <input type="hidden" name="projeto_id" value={p.id} />
                        <button className="rounded-md border border-aude-stone px-3 py-1 text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50">
                          Excluir
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
