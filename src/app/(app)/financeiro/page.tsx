import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  cancelarContrato,
  criarContrato,
  gerarFatura,
  marcarFatura,
} from "@/lib/actions/financeiro";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const contratoCor: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800",
  atrasado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-200 text-gray-600",
};

const faturaCor: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  pago: "bg-emerald-100 text-emerald-800",
  atrasado: "bg-red-100 text-red-800",
};

const inputClass =
  "rounded-md border border-aude-stone bg-white px-3 py-1.5 text-sm outline-none transition focus:border-aude-petrol";

interface Fatura {
  id: string;
  competencia: string;
  valor: number;
  status: string;
}

interface Contrato {
  id: string;
  valor_mensal: number;
  ciclo_cobranca: string;
  status: string;
  data_inicio: string;
  fatura: Fatura[];
}

function formatarCompetencia(data: string) {
  return `${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

function formatarData(data: string) {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

export default async function FinanceiroPage() {
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
  if (!usuario || !["administrador", "guardiao"].includes(usuario.papel)) redirect("/");

  const { data: clientes } = await supabase
    .from("cliente")
    .select(
      "id, nome, status, contrato (id, valor_mensal, ciclo_cobranca, status, data_inicio, fatura (id, competencia, valor, status))"
    )
    .order("nome");

  const linhas = (clientes ?? []).map((cliente) => {
    const bruto = Array.isArray(cliente.contrato) ? cliente.contrato[0] : cliente.contrato;
    const contrato = (bruto ?? null) as Contrato | null;
    if (contrato) {
      contrato.fatura = [...(contrato.fatura ?? [])].sort((a, b) =>
        b.competencia.localeCompare(a.competencia)
      );
    }
    return { id: cliente.id, nome: cliente.nome, contrato };
  });

  const contratos = linhas.flatMap((l) => (l.contrato ? [l.contrato] : []));
  const faturas = contratos.flatMap((c) => c.fatura);
  const mrr = contratos
    .filter((c) => c.status === "ativo")
    .reduce((soma, c) => soma + Number(c.valor_mensal), 0);
  const totalPendente = faturas
    .filter((f) => f.status === "pendente")
    .reduce((soma, f) => soma + Number(f.valor), 0);
  const totalAtrasado = faturas
    .filter((f) => f.status === "atrasado")
    .reduce((soma, f) => soma + Number(f.valor), 0);

  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold">Financeiro</h1>
        <p className="mt-1 text-sm text-aude-black/60">
          Contratos e faturas — controle manual, sem gateway de pagamento.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-aude-stone bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-aude-black/50">MRR</p>
          <p className="mt-2 font-display text-2xl font-semibold">{brl.format(mrr)}</p>
          <p className="mt-1 text-xs text-aude-black/40">contratos ativos</p>
        </div>
        <div className="rounded-lg border border-aude-stone bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-aude-black/50">
            Pendente
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-700">
            {brl.format(totalPendente)}
          </p>
          <p className="mt-1 text-xs text-aude-black/40">faturas a receber</p>
        </div>
        <div className="rounded-lg border border-aude-stone bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-aude-black/50">
            Atrasado
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-red-700">
            {brl.format(totalAtrasado)}
          </p>
          <p className="mt-1 text-xs text-aude-black/40">faturas em atraso</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {linhas.map(({ id, nome, contrato }) => (
          <div key={id} className="rounded-lg border border-aude-stone bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{nome}</h2>
                {contrato ? (
                  <p className="mt-1 text-sm text-aude-black/60">
                    {brl.format(Number(contrato.valor_mensal))}/{contrato.ciclo_cobranca} · início{" "}
                    {formatarData(contrato.data_inicio)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-aude-black/40">Sem contrato</p>
                )}
              </div>
              {contrato && (
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${contratoCor[contrato.status] ?? ""}`}
                  >
                    {contrato.status}
                  </span>
                  {contrato.status !== "cancelado" && (
                    <form action={cancelarContrato}>
                      <input type="hidden" name="contrato_id" value={contrato.id} />
                      <button className="text-xs text-red-700/70 underline-offset-2 transition hover:text-red-700 hover:underline">
                        Cancelar contrato
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {!contrato && (
              <form action={criarContrato} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="cliente_id" value={id} />
                <div>
                  <label className="block text-xs font-medium text-aude-black/60">
                    Valor mensal (R$)
                  </label>
                  <input
                    name="valor_mensal"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    className={`mt-1 w-36 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-aude-black/60">Início</label>
                  <input
                    name="data_inicio"
                    type="date"
                    required
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
                <button className="rounded-md bg-aude-black px-4 py-2 text-sm font-medium text-aude-white transition hover:bg-aude-navy">
                  Criar contrato
                </button>
              </form>
            )}

            {contrato && (
              <>
                <div className="mt-4 divide-y divide-aude-stone/70 border-t border-aude-stone/70">
                  {contrato.fatura.map((fatura) => (
                    <div
                      key={fatura.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium tabular-nums">
                          {formatarCompetencia(fatura.competencia)}
                        </span>
                        <span className="text-sm text-aude-black/70 tabular-nums">
                          {brl.format(Number(fatura.valor))}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${faturaCor[fatura.status] ?? ""}`}
                        >
                          {fatura.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {(["pago", "atrasado", "pendente"] as const)
                          .filter((status) => status !== fatura.status)
                          .map((status) => (
                            <form key={status} action={marcarFatura}>
                              <input type="hidden" name="fatura_id" value={fatura.id} />
                              <input type="hidden" name="status" value={status} />
                              <button className="rounded border border-aude-stone px-2 py-1 text-xs text-aude-black/70 transition hover:border-aude-petrol hover:text-aude-black">
                                Marcar {status}
                              </button>
                            </form>
                          ))}
                      </div>
                    </div>
                  ))}
                  {contrato.fatura.length === 0 && (
                    <p className="py-3 text-sm text-aude-black/40">Nenhuma fatura gerada.</p>
                  )}
                </div>

                {contrato.status !== "cancelado" && (
                  <form
                    action={gerarFatura}
                    className="mt-3 flex flex-wrap items-end gap-3 border-t border-aude-stone/70 pt-4"
                  >
                    <input type="hidden" name="contrato_id" value={contrato.id} />
                    <div>
                      <label className="block text-xs font-medium text-aude-black/60">
                        Competência
                      </label>
                      <input
                        name="competencia"
                        type="month"
                        defaultValue={mesAtual}
                        required
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-aude-black/60">
                        Valor (R$)
                      </label>
                      <input
                        name="valor"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={brl.format(Number(contrato.valor_mensal))}
                        className={`mt-1 w-36 ${inputClass}`}
                      />
                    </div>
                    <button className="rounded-md border border-aude-stone px-4 py-2 text-sm font-medium transition hover:border-aude-petrol">
                      Gerar fatura
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        ))}

        {linhas.length === 0 && (
          <div className="rounded-lg border border-dashed border-aude-stone p-10 text-center text-sm text-aude-black/50">
            Nenhum cliente ainda. Cadastre um cliente para criar contratos.
          </div>
        )}
      </div>
    </div>
  );
}
