"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginConteudo() {
  const [carregando, setCarregando] = useState(false);
  const searchParams = useSearchParams();
  const erro = searchParams.get("erro");

  function entrarComGoogle() {
    setCarregando(true);
    // fluxo próprio de OAuth no servidor + signInWithIdToken no callback
    window.location.href = "/api/google/connect?provedor=login";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-aude-black px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-4xl tracking-tight text-aude-white">
          AUDE<span className="text-aude-bordeaux">.</span>OS
        </h1>
        <p className="mt-3 text-sm text-aude-stone/70">
          Sistema Operacional para Operação Digital
        </p>

        {erro && (
          <p className="mt-6 rounded-md border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
            Falha na autenticação. Tente novamente.
          </p>
        )}

        <button
          onClick={entrarComGoogle}
          disabled={carregando}
          className="mt-10 w-full rounded-md bg-aude-white px-6 py-3 text-sm font-semibold text-aude-black transition hover:bg-aude-stone disabled:opacity-60"
        >
          {carregando ? "Redirecionando…" : "Entrar com Google"}
        </button>

        <p className="mt-8 text-xs text-aude-stone/40">
          Existimos para que empresários tenham com quem contar.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginConteudo />
    </Suspense>
  );
}
