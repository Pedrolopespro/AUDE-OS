import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acessar a AUDE Gestão",
  description:
    "Entrada do painel da equipe e do portal seguro de conexão de redes sociais.",
};

export default function Home() {
  const dashboardUrl =
    process.env.AUDE_DASHBOARD_URL?.trim() ||
    "https://painel.audeagencia.com.br";

  return (
    <main className="entry-shell">
      <section className="entry-card" aria-labelledby="entry-title">
        <header className="entry-header">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <p className="eyebrow">AUDE GESTÃO</p>
            <h1 id="entry-title">Como você quer continuar?</h1>
            <p className="entry-lead">
              A equipe acessa o painel administrativo. Clientes conectam suas
              redes sociais somente pelo convite individual recebido.
            </p>
          </div>
        </header>

        <div className="entry-options">
          <article className="entry-option entry-option-primary">
            <span className="entry-role">PARA A EQUIPE AUDE</span>
            <h2>Acessar o painel</h2>
            <p>
              Entre com seu e-mail autorizado para gerenciar clientes,
              calendário editorial e conexões.
            </p>
            <a className="dashboard-button" href={dashboardUrl}>
              Entrar no painel
              <span aria-hidden="true">→</span>
            </a>
            <small>
              Se necessário, a tela de identificação será exibida antes do
              painel.
            </small>
          </article>

          <article className="entry-option">
            <span className="entry-role">PARA CLIENTES</span>
            <h2>Conectar Instagram</h2>
            <p>
              Abra o link individual enviado pela AUDE no WhatsApp ou e-mail.
              Esse link identifica a empresa e inicia a autorização segura.
            </p>
            <div className="invitation-note">
              Não recebeu o convite? Solicite o link à equipe da AUDE.
            </div>
            <small>
              A senha do Instagram nunca é compartilhada com a agência.
            </small>
          </article>
        </div>

        <footer className="entry-footer">
          <a href="/privacy">Privacidade</a>
          <span aria-hidden="true">•</span>
          <a href="/data-deletion">Exclusão de dados</a>
        </footer>
      </section>
    </main>
  );
}
