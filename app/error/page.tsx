const messages: Record<string, string> = {
  invite: "Este convite é inválido, já foi utilizado ou expirou.",
  config: "A integração está temporariamente indisponível.",
  cancelled: "A autorização foi cancelada. Nenhum dado foi compartilhado.",
  expired: "A autorização expirou. Solicite um novo convite à equipe da AUDE.",
};

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason = "unknown" } = await searchParams;
  return (
    <main className="connect-shell">
      <section className="connect-card state-card">
        <span className="state-icon warning">!</span>
        <p className="eyebrow">AUDE GESTÃO</p>
        <h1>Não foi possível conectar</h1>
        <p>
          {messages[reason] ??
            "O Instagram não concluiu a autorização. Tente novamente ou solicite um novo convite."}
        </p>
      </section>
    </main>
  );
}
