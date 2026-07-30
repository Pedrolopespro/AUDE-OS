"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { InstagramInsightsPanel } from "./instagram-insights-panel";

type SocialPostStatus =
  | "draft"
  | "production"
  | "review"
  | "approved"
  | "scheduled"
  | "published";

type SocialPostFormat = "feed" | "carousel" | "reel" | "story";

type SocialPost = {
  id: string;
  title: string;
  caption: string;
  scheduledAt: string;
  status: SocialPostStatus;
  format: SocialPostFormat;
  channels: string[];
};

type ClientIdentity = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      "O serviço está temporariamente indisponível. Tente novamente em alguns segundos.",
    );
  }
}

type InstagramConnection =
  | {
      connected: false;
      invitationPending?: boolean;
      invitationExpiresAt?: string | null;
    }
  | {
      connected: true;
      username: string;
      accountName: string | null;
      accountType: string | null;
      profilePictureUrl: string | null;
      followersCount: number;
      mediaCount: number;
      tokenExpiresAt: string | null;
      lastSyncedAt: string;
    };

const statusLabels: Record<SocialPostStatus, string> = {
  draft: "Ideia",
  production: "Em produção",
  review: "Em revisão",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
};

const formatLabels: Record<SocialPostFormat, string> = {
  feed: "Post",
  carousel: "Carrossel",
  reel: "Reel",
  story: "Story",
};

const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function InstagramIcon() {
  return (
    <span className="instagram-icon" aria-hidden="true">
      <i />
    </span>
  );
}

function NewPostModal({
  initialDate,
  initialPost,
  close,
  save,
  remove,
}: {
  initialDate: Date;
  initialPost?: SocialPost;
  close: () => void;
  save: (post: Omit<SocialPost, "id">) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const initialDateTime = new Date(initialDate);
  initialDateTime.setHours(10, 0, 0, 0);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [caption, setCaption] = useState(initialPost?.caption ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initialPost
      ? new Date(
          new Date(initialPost.scheduledAt).getTime() -
            new Date(initialPost.scheduledAt).getTimezoneOffset() * 60_000,
        )
          .toISOString()
          .slice(0, 16)
      : `${dateKey(initialDateTime)}T10:00`,
  );
  const [format, setFormat] = useState<SocialPostFormat>(
    initialPost?.format ?? "feed",
  );
  const [status, setStatus] = useState<SocialPostStatus>(
    initialPost?.status ?? "draft",
  );
  const [channels, setChannels] = useState(
    initialPost?.channels ?? ["instagram"],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await save({
        title: title.trim(),
        caption: caption.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        format,
        status,
        channels,
      });
      close();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  };

  const deletePost = async () => {
    if (!remove) return;
    setDeleting(true);
    setError("");
    try {
      await remove();
      close();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div
        className="modal social-post-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-post-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">CALENDÁRIO EDITORIAL</span>
            <h2 id="new-post-title">
              {initialPost ? "Editar conteúdo" : "Criar conteúdo"}
            </h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Título interno
            <input
              autoFocus
              placeholder="Ex.: Direito do consumidor em 5 pontos"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Legenda
            <textarea
              rows={5}
              placeholder="Escreva a legenda ou o briefing para a criação..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>
          <div className="two-fields">
            <label>
              Data e horário
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label>
              Formato
              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as SocialPostFormat)
                }
              >
                {Object.entries(formatLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-fields">
            <label>
              Etapa
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SocialPostStatus)
                }
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="channel-fieldset">
              <legend>Canais</legend>
              <div className="channel-options">
                {[
                  ["instagram", "Instagram"],
                  ["facebook", "Facebook"],
                  ["linkedin", "LinkedIn"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={channels.includes(value) ? "selected" : ""}
                    onClick={() => toggleChannel(value)}
                  >
                    {channels.includes(value) ? "✓" : "＋"} {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            {remove && (
              <button
                className="danger-button"
                type="button"
                onClick={deletePost}
                disabled={deleting || saving}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            )}
            <button className="secondary-button" type="button" onClick={close}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!title.trim() || !scheduledAt || !channels.length || saving}
            >
              {saving
                ? "Salvando..."
                : initialPost
                  ? "Salvar alterações"
                  : "Salvar conteúdo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstagramSetup({
  clientId,
  clientName,
  close,
  invited,
}: {
  clientId: string;
  clientName: string;
  close: () => void;
  invited: (expiresAt: string) => void;
}) {
  const [invitationUrl, setInvitationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const invitedRef = useRef(invited);

  useEffect(() => {
    invitedRef.current = invited;
  }, [invited]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/clients/${clientId}/instagram/invite`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await readJsonResponse<{
          error?: string;
          invitationUrl: string;
          expiresAt: string;
        }>(response);
        if (!response.ok) throw new Error(data.error);
        setInvitationUrl(data.invitationUrl);
        setExpiresAt(data.expiresAt);
        invitedRef.current(data.expiresAt);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível gerar o convite.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [clientId]);

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Não foi possível copiar. Abra o link e copie pela barra do navegador.");
    }
  };

  const shareInvitation = async () => {
    if (!navigator.share) return copyInvitation();
    try {
      await navigator.share({
        title: `Conectar Instagram de ${clientName}`,
        text: `A AUDE enviou um convite seguro para conectar o Instagram de ${clientName}.`,
        url: invitationUrl,
      });
    } catch {
      // The user may close the native sharing sheet without sharing.
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div
        className="modal instagram-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-setup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">META BUSINESS</span>
            <h2 id="instagram-setup-title">Conectar Instagram</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="integration-guide">
          <div className="integration-guide-icon">
            <InstagramIcon />
          </div>
          <h3>Envie o convite para {clientName}</h3>
          <p>
            O cliente abre o link no próprio celular, entra diretamente na Meta
            e autoriza a conexão. Você não precisa receber a senha.
          </p>
          <ol>
            <li><span>1</span> Copie e envie o link por WhatsApp ou email</li>
            <li><span>2</span> O cliente autoriza no Instagram oficial</li>
            <li><span>3</span> A conta aparece conectada neste painel</li>
          </ol>
          <div className="integration-note">
            Link individual, válido por 48 horas e inutilizado após a conexão.
          </div>
          {loading && <div className="invite-loading">Gerando convite seguro...</div>}
          {invitationUrl && (
            <div className="invite-box">
              <label htmlFor="instagram-invitation">Link de conexão</label>
              <div>
                <input
                  id="instagram-invitation"
                  readOnly
                  value={invitationUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" onClick={copyInvitation}>
                  {copied ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
              <small>
                Expira em{" "}
                {new Date(expiresAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </small>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Fechar
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={shareInvitation}
            disabled={!invitationUrl}
          >
            Compartilhar convite
          </button>
        </div>
      </div>
    </div>
  );
}

export function SocialMediaPanel({
  client,
  onBack,
  mode,
}: {
  client: ClientIdentity;
  onBack: () => void;
  mode: "manage" | "view";
}) {
  const canManage = mode === "manage";
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [section, setSection] = useState<"calendar" | "insights">("calendar");
  const [month, setMonth] = useState(() => new Date());
  const [newPostDate, setNewPostDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [showInstagramSetup, setShowInstagramSetup] = useState(false);
  const [instagram, setInstagram] = useState<InstagramConnection>({
    connected: false,
  });
  const [instagramError, setInstagramError] = useState("");
  const [syncingInstagram, setSyncingInstagram] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/clients/${client.id}/social-posts`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPosts(data.posts ?? []);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setLoadError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível carregar o calendário.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [client.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/clients/${client.id}/instagram`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setInstagram(data as InstagramConnection);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setInstagramError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível carregar o Instagram.",
        );
      });
    return () => controller.abort();
  }, [client.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("instagram_error");
    if (params.get("client") === client.id && oauthError) {
      queueMicrotask(() => setInstagramError(oauthError));
    }
  }, [client.id]);

  const days = useMemo(() => buildCalendarDays(month), [month]);
  const postsByDay = useMemo(() => {
    return posts.reduce<Record<string, SocialPost[]>>((grouped, post) => {
      const key = dateKey(post.scheduledAt);
      grouped[key] = [...(grouped[key] ?? []), post].sort((a, b) =>
        a.scheduledAt.localeCompare(b.scheduledAt),
      );
      return grouped;
    }, {});
  }, [posts]);

  const monthPosts = posts.filter((post) => {
    const date = new Date(post.scheduledAt);
    return (
      date.getMonth() === month.getMonth() &&
      date.getFullYear() === month.getFullYear()
    );
  });
  const published = monthPosts.filter((post) => post.status === "published").length;
  const scheduled = monthPosts.filter((post) =>
    ["approved", "scheduled"].includes(post.status),
  ).length;
  const inProgress = monthPosts.filter((post) =>
    ["draft", "production", "review"].includes(post.status),
  ).length;

  const createPost = async (draft: Omit<SocialPost, "id">) => {
    const response = await fetch(`/api/clients/${client.id}/social-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setPosts((current) => [...current, data.post]);
  };

  const updateStatus = async (post: SocialPost, status: SocialPostStatus) => {
    const previous = posts;
    setPosts((current) =>
      current.map((item) => (item.id === post.id ? { ...item, status } : item)),
    );
    const response = await fetch(
      `/api/clients/${client.id}/social-posts/${post.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (!response.ok) setPosts(previous);
  };

  const updatePost = async (
    post: SocialPost,
    draft: Omit<SocialPost, "id">,
  ) => {
    const response = await fetch(
      `/api/clients/${client.id}/social-posts/${post.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setPosts((current) =>
      current.map((item) => (item.id === post.id ? data.post : item)),
    );
  };

  const deletePost = async (post: SocialPost) => {
    const response = await fetch(
      `/api/clients/${client.id}/social-posts/${post.id}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setPosts((current) => current.filter((item) => item.id !== post.id));
  };

  const moveMonth = (amount: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  const syncInstagram = async () => {
    setSyncingInstagram(true);
    setInstagramError("");
    try {
      const response = await fetch(`/api/clients/${client.id}/instagram`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInstagram(data as InstagramConnection);
    } catch (caught) {
      setInstagramError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar os dados.",
      );
    } finally {
      setSyncingInstagram(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!window.confirm("Desconectar o Instagram deste cliente?")) return;
    const response = await fetch(`/api/clients/${client.id}/instagram`, {
      method: "DELETE",
    });
    if (response.ok) setInstagram({ connected: false });
  };

  return (
    <section className="social-media-page">
      <button className="back-button" onClick={onBack}>
        ‹ Voltar para {client.name}
      </button>

      <div className="social-header">
        <div className="social-client">
          <span className="client-logo" style={{ background: client.color }}>
            {client.initials}
          </span>
          <div>
            <span className="eyebrow">SOCIAL MEDIA</span>
            <h2>
              {section === "calendar" ? "Calendário editorial" : "Instagram Insights"}
            </h2>
            <p>
              {section === "calendar"
                ? `Planejamento e produção de conteúdo de ${client.name}.`
                : `Desempenho, público e oportunidades de ${client.name}.`}
            </p>
          </div>
        </div>
        {canManage && section === "calendar" ? (
          <button className="primary-button" onClick={() => setNewPostDate(new Date())}>
            ＋ Criar conteúdo
          </button>
        ) : (
          <span className="read-only-pill">Somente leitura</span>
        )}
      </div>

      <div className="social-section-tabs" role="tablist" aria-label="Área de Social Media">
        <button
          type="button"
          role="tab"
          aria-selected={section === "calendar"}
          className={section === "calendar" ? "active" : ""}
          onClick={() => setSection("calendar")}
        >
          <span aria-hidden="true">▦</span>
          Calendário
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "insights"}
          className={section === "insights" ? "active" : ""}
          onClick={() => setSection("insights")}
          disabled={!instagram.connected}
          title={
            instagram.connected
              ? "Ver desempenho do Instagram"
              : "Conecte o Instagram para liberar as análises"
          }
        >
          <span aria-hidden="true">↗</span>
          Desempenho
          {instagram.connected && <i>Ao vivo</i>}
        </button>
      </div>

      {section === "calendar" && (
        <>
      <div className="social-summary-grid">
        <article>
          <span>Conteúdos no mês</span>
          <strong>{monthPosts.length}</strong>
          <i>{monthLabel(month)}</i>
        </article>
        <article>
          <span>Em produção</span>
          <strong>{inProgress}</strong>
          <i>Aguardando conclusão</i>
        </article>
        <article>
          <span>Prontos para publicar</span>
          <strong>{scheduled}</strong>
          <i>Aprovados ou agendados</i>
        </article>
        <article>
          <span>Publicados</span>
          <strong>{published}</strong>
          <i>Neste mês</i>
        </article>
      </div>

      <div className="social-layout">
        <article className="panel social-calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <h3>{monthLabel(month)}</h3>
              <span>
                {canManage
                  ? "Clique em um dia para planejar um conteúdo"
                  : "Acompanhe o planejamento e o andamento dos conteúdos"}
              </span>
            </div>
            <div className="calendar-actions">
              <button onClick={() => setMonth(new Date())}>Hoje</button>
              <button aria-label="Mês anterior" onClick={() => moveMonth(-1)}>‹</button>
              <button aria-label="Próximo mês" onClick={() => moveMonth(1)}>›</button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const outside = day.getMonth() !== month.getMonth();
              const today = key === dateKey(new Date());
              return (
                <button
                  className={`calendar-day${outside ? " outside" : ""}${today ? " today" : ""}`}
                  key={key}
                  onClick={() => {
                    if (canManage) setNewPostDate(day);
                  }}
                >
                  <span className="day-number">{day.getDate()}</span>
                  <span className="day-posts">
                    {(postsByDay[key] ?? []).slice(0, 3).map((post) => (
                      <i
                        className={`calendar-post ${post.status}`}
                        key={post.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (canManage) setEditingPost(post);
                        }}
                      >
                        <b>{new Date(post.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>
                        {post.title}
                      </i>
                    ))}
                    {(postsByDay[key]?.length ?? 0) > 3 && (
                      <em>+{postsByDay[key].length - 3} conteúdos</em>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {loading && <div className="calendar-feedback">Carregando calendário...</div>}
          {loadError && <div className="calendar-feedback error">{loadError}</div>}
        </article>

        <aside className="social-side">
          <article className="panel instagram-card">
            <div className="instagram-title">
              <InstagramIcon />
              <div>
                <strong>
                  {instagram.connected ? `@${instagram.username}` : "Instagram"}
                </strong>
                <span>
                  {instagram.connected
                    ? instagram.accountName ?? "Conta profissional conectada"
                    : "Conta do cliente"}
                </span>
              </div>
              <i
                className={`connection-dot${instagram.connected ? " connected" : ""}`}
              />
            </div>
            <div className="metrics-locked">
              <div>
                <span>Seguidores</span>
                <strong>
                  {instagram.connected
                    ? instagram.followersCount.toLocaleString("pt-BR")
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Publicações</span>
                <strong>
                  {instagram.connected
                    ? instagram.mediaCount.toLocaleString("pt-BR")
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Tipo</span>
                <strong className="account-type">
                  {instagram.connected
                    ? instagram.accountType?.replace("_", " ") ?? "PRO"
                    : "—"}
                </strong>
              </div>
            </div>
            {instagramError && <p className="instagram-error">{instagramError}</p>}
            {instagram.connected ? (
              <>
                <p>
                  Atualizado em{" "}
                  {new Date(instagram.lastSyncedAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  .
                </p>
                {canManage && (
                  <div className="instagram-actions">
                    <button
                      className="secondary-button"
                      onClick={syncInstagram}
                      disabled={syncingInstagram}
                    >
                      {syncingInstagram ? "Atualizando..." : "Atualizar dados"}
                    </button>
                    <button
                      className="instagram-disconnect"
                      onClick={disconnectInstagram}
                    >
                      Desconectar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>
                  {instagram.invitationPending
                    ? "Convite enviado. Aguardando autorização do cliente."
                    : canManage
                      ? "Envie um link seguro para o cliente autorizar a conta."
                      : "A conexão do Instagram é gerenciada pela equipe AUDE."}
                </p>
                {canManage && (
                  <button
                    className="secondary-button"
                    onClick={() => setShowInstagramSetup(true)}
                  >
                    {instagram.invitationPending
                      ? "Gerar novo convite"
                      : "Solicitar conexão"}
                  </button>
                )}
              </>
            )}
          </article>

          <article className="panel production-list">
            <div className="production-head">
              <div><h3>Fluxo de produção</h3><span>{monthPosts.length} conteúdos</span></div>
              {canManage && (
                <button onClick={() => setNewPostDate(new Date())}>＋</button>
              )}
            </div>
            <div className="production-items">
              {monthPosts
                .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                .slice(0, 6)
                .map((post) => (
                  <div className="production-item" key={post.id}>
                    <div className="production-date">
                      <strong>{new Date(post.scheduledAt).getDate()}</strong>
                      <span>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(post.scheduledAt)).replace(".", "")}</span>
                    </div>
                    <div className="production-copy">
                      {canManage ? (
                        <button
                          className="production-open"
                          onClick={() => setEditingPost(post)}
                        >
                          {post.title}
                        </button>
                      ) : (
                        <strong className="production-title">{post.title}</strong>
                      )}
                      <span>{formatLabels[post.format]} · {post.channels.join(", ")}</span>
                      {canManage ? (
                        <select
                          value={post.status}
                          aria-label={`Etapa de ${post.title}`}
                          onChange={(event) =>
                            updateStatus(post, event.target.value as SocialPostStatus)
                          }
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`production-status ${post.status}`}>
                          {statusLabels[post.status]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              {!monthPosts.length && !loading && (
                <div className="production-empty">
                  <span>＋</span>
                  <strong>Calendário livre</strong>
                  <p>
                    {canManage
                      ? "Crie o primeiro conteúdo deste cliente."
                      : "Nenhum conteúdo planejado neste mês."}
                  </p>
                </div>
              )}
            </div>
          </article>
        </aside>
      </div>
        </>
      )}

      {section === "insights" && instagram.connected && (
        <InstagramInsightsPanel
          clientId={client.id}
          instagram={instagram}
        />
      )}

      {canManage && newPostDate && (
        <NewPostModal
          initialDate={newPostDate}
          close={() => setNewPostDate(null)}
          save={createPost}
        />
      )}
      {canManage && editingPost && (
        <NewPostModal
          initialDate={new Date(editingPost.scheduledAt)}
          initialPost={editingPost}
          close={() => setEditingPost(null)}
          save={(draft) => updatePost(editingPost, draft)}
          remove={() => deletePost(editingPost)}
        />
      )}
      {canManage && showInstagramSetup && (
        <InstagramSetup
          clientId={client.id}
          clientName={client.name}
          close={() => setShowInstagramSetup(false)}
          invited={(invitationExpiresAt) =>
            setInstagram({
              connected: false,
              invitationPending: true,
              invitationExpiresAt,
            })
          }
        />
      )}
    </section>
  );
}
