import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conectar redes sociais | AUDE Gestão",
  description: "Portal seguro de autorização de redes sociais da AUDE Gestão.",
};

export default function Home() {
  return (
    <main className="connect-shell">
      <section className="connect-card state-card">
        <span className="brand-mark">A</span>
        <p className="eyebrow">AUDE GESTÃO</p>
        <h1>Portal de conexão segura</h1>
        <p>
          Para conectar uma rede social, utilize o convite individual enviado
          pela equipe da AUDE.
        </p>
        <div className="success-detail">
          A senha da sua conta nunca é compartilhada com a agência.
        </div>
      </section>
    </main>
  );
}
