"use client";

import { useActionState } from "react";
import { criarCliente, type ActionState } from "@/lib/actions/clientes";

const inputClass =
  "mt-1 w-full rounded-md border border-aude-stone bg-white px-3 py-2 text-sm outline-none transition focus:border-aude-petrol";

export default function NovoClientePage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    criarCliente,
    {}
  );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">Novo cliente</h1>
      <p className="mt-1 text-sm text-aude-black/60">
        Cria o cliente, o Workspace e (opcional) envia o convite por e-mail.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <input name="nome" required className={inputClass} placeholder="Ex.: KMON VIP" />
        </div>
        <div>
          <label className="text-sm font-medium">Segmento</label>
          <input name="segmento" className={inputClass} placeholder="Ex.: Mobilidade executiva" />
        </div>
        <div>
          <label className="text-sm font-medium">Site</label>
          <input name="site" className={inputClass} placeholder="https://…" />
        </div>
        <div>
          <label className="text-sm font-medium">E-mail do cliente (convite)</label>
          <input
            name="convite_email"
            type="email"
            className={inputClass}
            placeholder="cliente@empresa.com"
          />
          <p className="mt-1 text-xs text-aude-black/40">
            O cliente entra com Google usando este e-mail e é vinculado automaticamente.
          </p>
        </div>

        {state.erro && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.erro}
          </p>
        )}

        <button
          disabled={pending}
          className="w-full rounded-md bg-aude-black px-4 py-2.5 text-sm font-medium text-aude-white transition hover:bg-aude-navy disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar cliente e Workspace"}
        </button>
      </form>
    </div>
  );
}
