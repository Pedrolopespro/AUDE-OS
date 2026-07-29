import Link from "next/link";

export default function DataDeletionPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <Link className="legal-brand" href="/">AUDE Gestão</Link>
        <p className="eyebrow">EXCLUSÃO DE DADOS</p>
        <h1>Revogue a conexão quando quiser</h1>
        <p>
          O cliente pode remover a autorização em Instagram → Configurações →
          Permissões do site → Apps e sites. Também pode solicitar à AUDE a
          exclusão da conexão e dos tokens associados.
        </p>
        <h2>Solicitação direta</h2>
        <p>
          Envie um email para{" "}
          <a href="mailto:lopeshpl@gmail.com">lopeshpl@gmail.com</a> informando
          o usuário do Instagram e a empresa. A solicitação será confirmada e
          processada em até 7 dias úteis.
        </p>
        <h2>O que é removido</h2>
        <p>
          Token de acesso, identificação técnica do perfil e métricas
          sincronizadas no portal de conexão. Registros contratuais da agência
          seguem os prazos legais aplicáveis.
        </p>
      </article>
    </main>
  );
}
