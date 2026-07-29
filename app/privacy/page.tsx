import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link className="legal-brand" href="/">AUDE Gestão</Link>
        <p className="eyebrow">POLÍTICA DE PRIVACIDADE</p>
        <h1>Como tratamos os dados conectados</h1>
        <p>
          A AUDE utiliza os dados autorizados pelo cliente exclusivamente para
          prestar os serviços contratados de planejamento, publicação e análise
          de conteúdo em redes sociais.
        </p>
        <h2>Dados acessados</h2>
        <p>
          Identificação do perfil profissional, quantidade de seguidores,
          publicações, métricas autorizadas e tokens técnicos fornecidos pela
          Meta. A senha do Instagram nunca é recebida ou armazenada pela AUDE.
        </p>
        <h2>Segurança e retenção</h2>
        <p>
          Os tokens de acesso são criptografados e utilizados somente pelo
          sistema. A conexão pode ser revogada pelo cliente no Instagram ou pela
          equipe da AUDE a qualquer momento.
        </p>
        <h2>Contato</h2>
        <p>
          Solicitações sobre privacidade e dados podem ser enviadas para{" "}
          <a href="mailto:lopeshpl@gmail.com">lopeshpl@gmail.com</a>.
        </p>
      </article>
    </main>
  );
}
