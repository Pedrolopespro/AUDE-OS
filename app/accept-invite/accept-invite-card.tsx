"use client";

import { useState } from "react";

export function AcceptInviteCard({
  token,
  email,
  signedInEmail,
  name,
  roleLabel,
  clientName,
  available,
}: {
  token: string;
  email: string;
  signedInEmail: string;
  name: string;
  roleLabel: string;
  clientName: string | null;
  available: boolean;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const emailMatches = email.toLowerCase() === signedInEmail.toLowerCase();

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const response = await fetch("/api/access/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.redirectTo ?? "/");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível aceitar.",
      );
      setAccepting(false);
    }
  };

  return (
    <main className="access-page">
      <section className="access-card invite-accept-card">
        <span className="brand-mark">A</span>
        <p className="eyebrow">CONVITE AUDE</p>
        <h1>{available ? `Olá, ${name}` : "Convite indisponível"}</h1>
        {available ? (
          <>
            <p>
              Você foi convidado como <strong>{roleLabel}</strong>
              {clientName ? ` para acompanhar ${clientName}` : " na operação AUDE"}.
            </p>
            <dl className="invite-summary">
              <div><dt>Convite enviado para</dt><dd>{email}</dd></div>
              <div><dt>Usuário conectado</dt><dd>{signedInEmail}</dd></div>
            </dl>
            {!emailMatches && (
              <p className="form-error" role="alert">
                Entre com o mesmo e-mail que recebeu o convite.
              </p>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button
              className="primary-button invite-accept-button"
              onClick={accept}
              disabled={!emailMatches || accepting}
            >
              {accepting ? "Liberando acesso..." : "Aceitar e abrir meu painel"}
            </button>
            {!emailMatches && (
              <a
                className="secondary-button"
                href={`/signout-with-chatgpt?return_to=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
              >
                Entrar com outro usuário
              </a>
            )}
          </>
        ) : (
          <>
            <p>Este link expirou, foi substituído ou já foi utilizado.</p>
            <p className="access-help">
              Solicite um novo convite ao administrador da AUDE.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
