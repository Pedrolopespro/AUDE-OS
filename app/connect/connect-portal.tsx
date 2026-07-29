"use client";

import { useEffect, useState } from "react";

type InvitationState =
  | { loading: true }
  | {
      loading: false;
      status: "pending" | "expired" | "connected" | "invalid";
      clientName?: string;
      expiresAt?: string;
      error?: string;
    };

export function ConnectPortal({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<InvitationState>({
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/invitations/inspect?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok && data.status !== "invalid") {
          throw new Error(data.error);
        }
        setInvitation({ loading: false, ...data });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setInvitation({
          loading: false,
          status: "invalid",
          error: "Não foi possível validar este convite.",
        });
      });
    return () => controller.abort();
  }, [token]);

  if (invitation.loading) {
    return (
      <main className="connect-shell" aria-busy="true">
        <div className="connect-card loading-card">
          <span className="brand-mark">A</span>
          <div className="loading-line wide" />
          <div className="loading-line" />
          <div className="loading-button" />
        </div>
      </main>
    );
  }

  if (invitation.status !== "pending") {
    const connected = invitation.status === "connected";
    return (
      <main className="connect-shell">
        <section className="connect-card state-card">
          <span className={`state-icon ${connected ? "success" : "warning"}`}>
            {connected ? "✓" : "!"}
          </span>
          <p className="eyebrow">AUDE GESTÃO</p>
          <h1>{connected ? "Instagram já conectado" : "Convite indisponível"}</h1>
          <p>
            {connected
              ? "Esta autorização já foi concluída. Você pode fechar esta página."
              : invitation.status === "expired"
                ? "Este link expirou. Solicite um novo convite à equipe da AUDE."
                : invitation.error ?? "Solicite um novo convite à equipe da AUDE."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="connect-shell">
      <section className="connect-card">
        <header className="connect-brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>AUDE</strong>
            <span>Conexão segura</span>
          </div>
        </header>

        <div className="instagram-badge" aria-hidden="true">
          <span className="instagram-glyph" />
        </div>
        <p className="eyebrow">CONVITE PARA CONECTAR</p>
        <h1>Conecte o Instagram de {invitation.clientName}</h1>
        <p className="lead">
          Autorize a AUDE a acessar métricas e publicar conteúdos no perfil
          profissional. Sua senha permanece somente com o Instagram.
        </p>

        <ul className="permission-list" aria-label="Permissões solicitadas">
          <li><span>✓</span><div><strong>Perfil e publicações</strong><small>Identificação e quantidade de conteúdos</small></div></li>
          <li><span>✓</span><div><strong>Métricas profissionais</strong><small>Seguidores e insights autorizados</small></div></li>
          <li><span>✓</span><div><strong>Publicação de conteúdo</strong><small>Somente após aprovação da sua equipe</small></div></li>
        </ul>

        <a
          className="instagram-button"
          href={`/api/instagram/connect?token=${encodeURIComponent(token)}`}
        >
          Continuar com Instagram
        </a>
        <p className="security-note">
          Você será direcionado ao ambiente oficial da Meta. A AUDE nunca recebe
          sua senha.
        </p>
        <footer>
          <a href="/privacy">Privacidade</a>
          <span>•</span>
          <a href="/data-deletion">Exclusão de dados</a>
        </footer>
      </section>
    </main>
  );
}
