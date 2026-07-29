export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; username?: string }>;
}) {
  const { client = "seu negócio", username = "" } = await searchParams;
  return (
    <main className="connect-shell">
      <section className="connect-card state-card">
        <span className="state-icon success">✓</span>
        <p className="eyebrow">CONEXÃO CONCLUÍDA</p>
        <h1>Instagram conectado com sucesso</h1>
        <p>
          {username ? `@${username}` : "O perfil"} agora está conectado a{" "}
          <strong>{client}</strong> na AUDE Gestão.
        </p>
        <div className="success-detail">
          A equipe da AUDE já pode visualizar as métricas autorizadas. Você pode
          fechar esta página.
        </div>
      </section>
    </main>
  );
}
