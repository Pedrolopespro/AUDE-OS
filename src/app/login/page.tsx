"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginConteudo() {
  const [carregando, setCarregando] = useState(false);
  const searchParams = useSearchParams();
  const erro = searchParams.get("erro");

  async function entrarComGoogle() {
    setCarregando(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[--color-aude-black] px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-4xl tracking-tight text-[--color-aude-white]">
          AUDE<span className="text-[--color-aude-bordeaux]">.</span>OS
        </h1>
        <p className="mt-3 text-sm text-[--color-aude-stone]/70">
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
          className="mt-10 w-full rounded-md bg-[--color-aude-white] px-6 py-3 text-sm font-semibold text-[--color-aude-black] transition hover:bg-[--color-aude-stone] disabled:opacity-60"
        >
          {carregando ? "Redirecionando…" : "Entrar com Google"}
        </button>

        <p className="mt-8 text-xs text-[--color-aude-stone]/40">
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
