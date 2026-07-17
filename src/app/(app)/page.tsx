import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const statusCor: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800",
  pausado: "bg-amber-100 text-amber-800",
  critico: "bg-red-100 text-red-800",
  encerrado: "bg-gray-200 text-gray-600",
};

export default async function Dashboard() {
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

  // cliente cai direto no próprio workspace
  if (usuario?.papel === "cliente") {
    const { data: vinculo } = await supabase
      .from("usuario_workspace")
      .select("workspace_id")
      .eq("usuario_id", user.id)
      .limit(1)
      .single();
    if (vinculo) redirect(`/w/${vinculo.workspace_id}`);
    return (
      <p className="text-sm text-[--color-aude-black]/60">
        Seu Workspace ainda não foi vinculado. Fale com seu Guardião AUDE.
      </p>
    );
  }

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nome, segmento, site, status, convite_email, convite_status, workspace (id)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clientes</h1>
          <p className="mt-1 text-sm text-[--color-aude-black]/60">
            Workspaces sob a guarda da AUDE
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="rounded-md bg-[--color-aude-black] px-4 py-2 text-sm font-medium text-[--color-aude-white] transition hover:bg-[--color-aude-navy]"
        >
          + Novo cliente
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(clientes ?? []).map((cliente) => {
          const ws = Array.isArray(cliente.workspace)
            ? cliente.workspace[0]
            : cliente.workspace;
          return (
            <Link
              key={cliente.id}
              href={ws ? `/w/${ws.id}` : "#"}
              className="rounded-lg border border-[--color-aude-stone] bg-white p-5 transition hover:border-[--color-aude-petrol] hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-medium">{cliente.nome}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCor[cliente.status] ?? ""}`}
                >
                  {cliente.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[--color-aude-black]/50">
                {cliente.segmento ?? "—"} {cliente.site ? `· ${cliente.site}` : ""}
              </p>
              {cliente.convite_email && (
                <p className="mt-3 text-xs text-[--color-aude-black]/40">
                  Convite: {cliente.convite_email} ({cliente.convite_status})
                </p>
              )}
            </Link>
          );
        })}

        {(clientes ?? []).length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-[--color-aude-stone] p-10 text-center text-sm text-[--color-aude-black]/50">
            Nenhum cliente ainda. Comece cadastrando o primeiro.
          </div>
        )}
      </div>
    </div>
  );
}
