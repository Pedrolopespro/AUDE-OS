import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link className="legal-brand" href="/">
          AUDE Gestão
        </Link>
        <p className="eyebrow">TERMOS DE USO</p>
        <h1>Conexão e gestão de contas profissionais</h1>
        <p>
          Ao autorizar uma conta profissional do Instagram, o cliente permite
          que a AUDE utilize os recursos concedidos pela Meta exclusivamente
          para executar os serviços contratados de planejamento, publicação,
          acompanhamento e análise de conteúdo.
        </p>
        <h2>Autorização e responsabilidade</h2>
        <p>
          A conexão deve ser realizada pelo titular da conta ou por uma pessoa
          autorizada pela empresa. O cliente continua responsável pelo acesso à
          sua conta e pode revogar a autorização a qualquer momento nas
          configurações do Instagram.
        </p>
        <h2>Uso dos recursos</h2>
        <p>
          A AUDE acessa somente os dados e as funções aprovados durante a
          autorização. Nenhuma senha do Instagram é recebida ou armazenada pelo
          sistema. Publicações e demais ações seguem o escopo acordado com cada
          cliente.
        </p>
        <h2>Disponibilidade e alterações</h2>
        <p>
          A disponibilidade da integração depende também dos serviços e das
          políticas da Meta. Estes termos podem ser atualizados para refletir
          mudanças legais, operacionais ou nas funcionalidades da plataforma.
        </p>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a href="mailto:lopeshpl@gmail.com">lopeshpl@gmail.com</a>.
        </p>
      </article>
    </main>
  );
}
