import { requireChatGPTUser } from "./chatgpt-auth";
import { DashboardApp } from "./dashboard-app";
import { resolveAppUser } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const identity = await requireChatGPTUser("/");
  const currentUser = await resolveAppUser(identity, { bootstrap: true });

  if (!currentUser) {
    return (
      <main className="access-page">
        <section className="access-card">
          <span className="brand-mark">A</span>
          <p className="eyebrow">AUDE GESTÃO</p>
          <h1>Acesso ainda não liberado</h1>
          <p>
            Você entrou como <strong>{identity.email}</strong>, mas este usuário
            ainda não foi convidado para a operação.
          </p>
          <p className="access-help">
            Peça ao administrador da AUDE um convite para este mesmo e-mail.
          </p>
          <a className="secondary-button" href="/signout-with-chatgpt?return_to=/">
            Entrar com outro usuário
          </a>
        </section>
      </main>
    );
  }

  return <DashboardApp currentUser={currentUser} />;
}
