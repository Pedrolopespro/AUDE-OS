import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  criarConhecimento,
  atualizarConhecimento,
  excluirConhecimento,
} from "@/lib/actions/conhecimento";

interface ItemConhecimento {
  id: string;
  titulo: string;
  tipo: string;
  conteudo: string | null;
  created_at: string;
  atualizado_em: string;
  autor: { nome: string } | { nome: string }[] | null;
}

const tipos = ["briefing", "acesso", "decisao", "outro"] as const;

const tipoUi: Record<string, { label: string; plural: string; badge: string }> = {
  briefing: { label: "Briefing", plural: "Briefings", badge: "bg-aude-navy/10 text-aude-navy" },
  acesso: { label: "Acesso", plural: "Acessos", badge: "bg-amber-100 text-amber-800" },
  decisao: { label: "Decisão", plural: "Decisões", badge: "bg-aude-petrol/10 text-aude-petrol" },
  outro: { label: "Outro", plural: "Outros", badge: "bg-gray-200 text-gray-600" },
};

const erroMsg: Record<string, string> = {
  validacao: "Preencha o título (mínimo 2 caracteres) e o tipo.",
  salvar: "Falha ao salvar. Tente novamente.",
};

const inputClass =
  "mt-1 w-full rounded-md border border-aude-stone bg-white px-3 py-2 text-sm outline-none transition focus:border-aude-petrol";

const AVISO_SENHAS = "Não guarde senhas aqui — registre onde elas estão.";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nomeAutor(item: ItemConhecimento): string | null {
  const autor = Array.isArray(item.autor) ? item.autor[0] : item.autor;
  return autor?.nome ?? null;
}

function CamposConhecimento({
  item,
  tipoInicial,
}: {
  item?: ItemConhecimento;
  tipoInicial?: string;
}) {
  return (
    <>
      <div>
        <label className="text-sm font-medium">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={item?.titulo}
          className={inputClass}
          placeholder="Ex.: Briefing inicial do site"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tipo</label>
        <select
          name="tipo"
          defaultValue={item?.tipo ?? tipoInicial ?? "briefing"}
          className={inputClass}
        >
          {tipos.map((t) => (
            <option key={t} value={t}>
              {tipoUi[t].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Conteúdo</label>
        <textarea
          name="conteudo"
          rows={5}
          defaultValue={item?.conteudo ?? ""}
          className={inputClass}
          placeholder={`Ex.: login do WordPress está no 1Password (cofre do cliente)`}
        />
        <p className="mt-1 text-xs text-amber-700">{AVISO_SENHAS}</p>
      </div>
    </>
  );
}

function CardItem({
  item,
  ehStaff,
  workspaceId,
  tipoFiltro,
}: {
  item: ItemConhecimento;
  ehStaff: boolean;
  workspaceId: string;
  tipoFiltro?: string;
}) {
  const ui = tipoUi[item.tipo] ?? tipoUi.outro;
  const autor = nomeAutor(item);
  const editado = item.atualizado_em !== item.created_at;
  const hrefEditar = `/w/${workspaceId}/conhecimento?${new URLSearchParams({
    ...(tipoFiltro ? { tipo: tipoFiltro } : {}),
    editar: item.id,
  }).toString()}`;

  return (
    <article className="rounded-lg border border-aude-stone bg-white p-5 transition hover:border-aude-petrol">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{item.titulo}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ui.badge}`}>
            {ui.label}
          </span>
        </div>
        {ehStaff && (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={hrefEditar}
              className="rounded-md border border-aude-stone px-2.5 py-1 text-xs font-medium transition hover:border-aude-petrol"
            >
              Editar
            </Link>
            <form action={excluirConhecimento}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="tipo_filtro" value={tipoFiltro ?? ""} />
              <button className="rounded-md border border-aude-stone px-2.5 py-1 text-xs font-medium text-red-700 transition hover:border-red-300">
                Excluir
              </button>
            </form>
          </div>
        )}
      </div>

      {item.conteudo && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-aude-black/70">{item.conteudo}</p>
      )}

      <p className="mt-3 text-xs text-aude-black/40">
        Criado em {formatarData(item.created_at)}
        {autor ? ` por ${autor}` : ""}
        {editado ? ` · editado em ${formatarData(item.atualizado_em)}` : ""}
      </p>
    </article>
  );
}

export default async function ConhecimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; editar?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { tipo, editar, erro } = await searchParams;
  const tipoFiltro = (tipos as readonly string[]).includes(tipo ?? "") ? tipo : undefined;

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
    .select("id, cliente (id, nome, segmento, site)")
    .eq("id", id)
    .single();
  if (!workspace) notFound();

  const cliente = Array.isArray(workspace.cliente)
    ? workspace.cliente[0]
    : workspace.cliente;

  let query = supabase
    .from("conhecimento")
    .select("id, titulo, tipo, conteudo, created_at, atualizado_em, autor:criado_por (nome)")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  if (tipoFiltro) query = query.eq("tipo", tipoFiltro);

  const { data } = await query;
  const itens = (data ?? []) as unknown as ItemConhecimento[];
  const itemEmEdicao = ehStaff ? itens.find((i) => i.id === editar) : undefined;

  const grupos: [string, ItemConhecimento[]][] = tipoFiltro
    ? [[tipoFiltro, itens]]
    : tipos
        .map((t): [string, ItemConhecimento[]] => [t, itens.filter((i) => i.tipo === t)])
        .filter(([, lista]) => lista.length > 0);

  return (
    <div>
      <p className="text-xs text-aude-black/40">
        <Link href={`/w/${id}`} className="underline">
          ← Voltar ao workspace
        </Link>
      </p>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-aude-black/40">Conhecimento</p>
        <h1 className="font-display text-2xl font-semibold">{cliente?.nome}</h1>
        <p className="mt-1 text-sm text-aude-black/60">
          Base de conhecimento do cliente: briefings, decisões e onde ficam os acessos.
        </p>
      </div>

      {erro && (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {erroMsg[erro] ?? "Algo deu errado."}
        </p>
      )}

      {/* Filtro por tipo */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href={`/w/${id}/conhecimento`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !tipoFiltro
              ? "bg-aude-black text-aude-white"
              : "border border-aude-stone bg-white hover:border-aude-petrol"
          }`}
        >
          Todos
        </Link>
        {tipos.map((t) => (
          <Link
            key={t}
            href={`/w/${id}/conhecimento?tipo=${t}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tipoFiltro === t
                ? "bg-aude-black text-aude-white"
                : "border border-aude-stone bg-white hover:border-aude-petrol"
            }`}
          >
            {tipoUi[t].plural}
          </Link>
        ))}
      </div>

      {/* Novo item (staff) */}
      {ehStaff && (
        <section className="mt-6 rounded-lg border border-aude-stone bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-aude-black/50">
            Novo item
          </h2>
          <form action={criarConhecimento} className="mt-4 space-y-4">
            <input type="hidden" name="workspace_id" value={id} />
            <input type="hidden" name="tipo_filtro" value={tipoFiltro ?? ""} />
            <CamposConhecimento tipoInicial={tipoFiltro} />
            <button className="rounded-md bg-aude-black px-4 py-2 text-sm font-medium text-aude-white transition hover:bg-aude-navy">
              Adicionar ao conhecimento
            </button>
          </form>
        </section>
      )}

      {/* Lista agrupada por tipo */}
      {itens.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-aude-stone bg-white p-10 text-center">
          <p className="text-sm font-medium">Nada por aqui ainda</p>
          <p className="mt-1 text-xs text-aude-black/50">
            {tipoFiltro
              ? `Nenhum item do tipo “${tipoUi[tipoFiltro].label}” registrado neste workspace.`
              : ehStaff
                ? "Registre o primeiro briefing, uma decisão importante ou onde ficam os acessos deste cliente."
                : "Seu Guardião AUDE ainda não registrou conhecimento neste workspace."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {grupos.map(([t, lista]) => (
            <section key={t}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-aude-black/50">
                {tipoUi[t].plural}
                <span className="ml-2 font-normal text-aude-black/30">{lista.length}</span>
              </h2>
              <div className="mt-3 space-y-3">
                {lista.map((item) =>
                  itemEmEdicao?.id === item.id ? (
                    <form
                      key={item.id}
                      action={atualizarConhecimento}
                      className="space-y-4 rounded-lg border border-aude-petrol bg-white p-5"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="tipo_filtro" value={tipoFiltro ?? ""} />
                      <CamposConhecimento item={item} />
                      <div className="flex items-center gap-2">
                        <button className="rounded-md bg-aude-black px-4 py-2 text-sm font-medium text-aude-white transition hover:bg-aude-navy">
                          Salvar alterações
                        </button>
                        <Link
                          href={`/w/${id}/conhecimento${tipoFiltro ? `?tipo=${tipoFiltro}` : ""}`}
                          className="rounded-md border border-aude-stone px-4 py-2 text-sm font-medium transition hover:border-aude-petrol"
                        >
                          Cancelar
                        </Link>
                      </div>
                    </form>
                  ) : (
                    <CardItem
                      key={item.id}
                      item={item}
                      ehStaff={ehStaff}
                      workspaceId={id}
                      tipoFiltro={tipoFiltro}
                    />
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
