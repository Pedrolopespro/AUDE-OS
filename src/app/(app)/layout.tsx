import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuario")
    .select("nome, email, papel")
    .eq("id", user.id)
    .single();

  const papelLabel =
    usuario?.papel === "administrador"
      ? "Administrador"
      : usuario?.papel === "guardiao"
        ? "Guardião"
        : "Cliente";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[--color-aude-stone] bg-[--color-aude-black] text-[--color-aude-white]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-display text-lg font-semibold">
            AUDE<span className="text-[#a34a5e]">.</span>OS
          </Link>
          <div className="flex items-center gap-4 text-xs text-[--color-aude-stone]/80">
            <span>
              {usuario?.nome ?? usuario?.email} · {papelLabel}
            </span>
            <form action="/auth/sair" method="post">
              <button className="rounded border border-[--color-aude-stone]/30 px-3 py-1 transition hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-[--color-aude-stone] py-4 text-center text-xs text-[--color-aude-black]/40">
        Existimos para que empresários tenham com quem contar.
      </footer>
    </div>
  );
}
