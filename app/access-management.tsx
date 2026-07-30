"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ClientOption = { id: string; name: string };
type AccessRole = "admin" | "manager" | "collaborator" | "client";

type AccessUser = {
  id: string;
  email: string;
  name: string;
  role: AccessRole;
  status: string;
  lastSeenAt: string | null;
  clientNames: string[];
};

type Invitation = {
  id: string;
  email: string;
  name: string;
  role: AccessRole;
  clientName: string | null;
  expiresAt: string;
};

const roleLabels: Record<AccessRole, string> = {
  admin: "Administrador",
  manager: "Gestor da agência",
  collaborator: "Colaborador",
  client: "Cliente",
};

export function AccessManagement({ clients }: { clients: ClientOption[] }) {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccessRole>("client");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/access");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users ?? []);
      setInvitations(data.invitations ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os acessos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadAccess());
  }, [loadAccess]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setInvitationUrl("");
    try {
      const needsClient = role === "client" || role === "collaborator";
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          clientId: needsClient ? clientId : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInvitationUrl(data.invitationUrl);
      setExpiresAt(data.expiresAt);
      await loadAccess();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível gerar o convite.",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyInvitation = async () => {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const revokeInvitation = async (invitationId: string) => {
    const response = await fetch("/api/access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    if (response.ok) {
      setInvitations((current) =>
        current.filter((item) => item.id !== invitationId),
      );
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setInvitationUrl("");
    setName("");
    setEmail("");
    setRole("client");
    setClientId(clients[0]?.id ?? "");
    setError("");
  };

  return (
    <section className="access-management" aria-labelledby="access-title">
      <div className="section-intro access-heading">
        <div>
          <span className="eyebrow">SEGURANÇA E EQUIPE</span>
          <h2 id="access-title">Acessos ao painel</h2>
          <p>
            Cada pessoa entra com o próprio usuário e vê somente o que foi
            atribuído a ela.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? "Fechar" : "＋ Convidar pessoa"}
        </button>
      </div>

      {showForm && (
        <form className="panel access-invite-form" onSubmit={submit}>
          <div className="access-form-head">
            <div>
              <h3>Novo convite</h3>
              <p>O link é individual, expira em 7 dias e funciona uma vez.</p>
            </div>
            <span className="secure-pill">✓ Sem senha compartilhada</span>
          </div>
          <div className="access-form-grid">
            <label>
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da pessoa"
                autoComplete="name"
              />
            </label>
            <label>
              E-mail de acesso
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pessoa@empresa.com"
                type="email"
                autoComplete="email"
              />
            </label>
            <label>
              Perfil
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as AccessRole)
                }
              >
                <option value="client">Cliente — somente sua empresa</option>
                <option value="collaborator">Colaborador — produz conteúdo</option>
                <option value="manager">Gestor — toda a operação</option>
                <option value="admin">Administrador — controle total</option>
              </select>
            </label>
            {(role === "client" || role === "collaborator") && (
              <label>
                Cliente vinculado
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                >
                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {invitationUrl && (
            <div className="generated-access-link" role="status">
              <div>
                <strong>Convite pronto</strong>
                <span>
                  Válido até{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(expiresAt))}
                </span>
              </div>
              <input
                value={invitationUrl}
                readOnly
                aria-label="Link individual de acesso"
              />
              <button
                className="secondary-button"
                type="button"
                onClick={copyInvitation}
              >
                {copied ? "✓ Copiado" : "Copiar link"}
              </button>
            </div>
          )}
          <div className="access-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={
                saving ||
                !name.trim() ||
                !email.includes("@") ||
                ((role === "client" || role === "collaborator") && !clientId)
              }
            >
              {saving ? "Gerando..." : "Gerar convite seguro"}
            </button>
          </div>
        </form>
      )}

      <div className="access-columns">
        <article className="panel access-list-panel">
          <div className="panel-heading">
            <div>
              <h3>Usuários ativos</h3>
              <p>{loading ? "Carregando..." : `${users.length} acessos cadastrados`}</p>
            </div>
          </div>
          <div className="access-user-list">
            {users.map((user) => (
              <div className="access-user-row" key={user.id}>
                <span className="access-avatar">
                  {user.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <span className="access-user-main">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
                <span className={`role-pill role-${user.role}`}>
                  {roleLabels[user.role]}
                </span>
                <span className="access-scope">
                  {user.clientNames.length
                    ? user.clientNames.join(", ")
                    : user.role === "admin" || user.role === "manager"
                      ? "Todos os clientes"
                      : "Sem cliente"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel pending-invites-panel">
          <div className="panel-heading">
            <div>
              <h3>Convites pendentes</h3>
              <p>{invitations.length} aguardando aceite</p>
            </div>
          </div>
          {!invitations.length ? (
            <div className="compact-empty">
              <span>✓</span>
              <p>Nenhum convite pendente.</p>
            </div>
          ) : (
            <div className="pending-invite-list">
              {invitations.map((invitation) => (
                <div className="pending-invite-row" key={invitation.id}>
                  <div>
                    <strong>{invitation.name}</strong>
                    <span>{invitation.email}</span>
                    <small>
                      {roleLabels[invitation.role]}
                      {invitation.clientName
                        ? ` · ${invitation.clientName}`
                        : ""}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeInvitation(invitation.id)}
                    aria-label={`Cancelar convite de ${invitation.name}`}
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
