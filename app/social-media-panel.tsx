"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

function InstagramSetup({ close }: { close: () => void }) {
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
          <h3>Integração pronta para configurar</h3>
          <p>
            Para importar alcance, seguidores, interações e desempenho dos posts,
            a conta precisa ser profissional e estar vinculada a uma Página do
            Facebook.
          </p>
          <ol>
            <li><span>1</span> Criar o aplicativo AUDE no Meta for Developers</li>
            <li><span>2</span> Autorizar a conta profissional do cliente</li>
            <li><span>3</span> Ativar a sincronização diária de métricas</li>
          </ol>
          <div className="integration-note">
            A próxima etapa exige o App ID e o App Secret da Meta. As credenciais
            ficam somente no servidor.
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={close}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export function SocialMediaPanel({
  client,
  onBack,
}: {
  client: ClientIdentity;
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [newPostDate, setNewPostDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [showInstagramSetup, setShowInstagramSetup] = useState(false);
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
            <h2>Calendário editorial</h2>
            <p>Planejamento e produção de conteúdo de {client.name}.</p>
          </div>
        </div>
        <button className="primary-button" onClick={() => setNewPostDate(new Date())}>
          ＋ Criar conteúdo
        </button>
      </div>

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
              <span>Clique em um dia para planejar um conteúdo</span>
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
                  onClick={() => setNewPostDate(day)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  <span className="day-posts">
                    {(postsByDay[key] ?? []).slice(0, 3).map((post) => (
                      <i
                        className={`calendar-post ${post.status}`}
                        key={post.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingPost(post);
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
              <div><strong>Instagram</strong><span>Conta do cliente</span></div>
              <i className="connection-dot" />
            </div>
            <div className="metrics-locked">
              <div><span>Seguidores</span><strong>—</strong></div>
              <div><span>Alcance</span><strong>—</strong></div>
              <div><span>Interações</span><strong>—</strong></div>
            </div>
            <p>Conecte a conta profissional para importar métricas reais.</p>
            <button className="secondary-button" onClick={() => setShowInstagramSetup(true)}>
              Conectar Instagram
            </button>
          </article>

          <article className="panel production-list">
            <div className="production-head">
              <div><h3>Fluxo de produção</h3><span>{monthPosts.length} conteúdos</span></div>
              <button onClick={() => setNewPostDate(new Date())}>＋</button>
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
                      <button
                        className="production-open"
                        onClick={() => setEditingPost(post)}
                      >
                        {post.title}
                      </button>
                      <span>{formatLabels[post.format]} · {post.channels.join(", ")}</span>
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
                    </div>
                  </div>
                ))}
              {!monthPosts.length && !loading && (
                <div className="production-empty">
                  <span>＋</span>
                  <strong>Calendário livre</strong>
                  <p>Crie o primeiro conteúdo deste cliente.</p>
                </div>
              )}
            </div>
          </article>
        </aside>
      </div>

      {newPostDate && (
        <NewPostModal
          initialDate={newPostDate}
          close={() => setNewPostDate(null)}
          save={createPost}
        />
      )}
      {editingPost && (
        <NewPostModal
          initialDate={new Date(editingPost.scheduledAt)}
          initialPost={editingPost}
          close={() => setEditingPost(null)}
          save={(draft) => updatePost(editingPost, draft)}
          remove={() => deletePost(editingPost)}
        />
      )}
      {showInstagramSetup && (
        <InstagramSetup close={() => setShowInstagramSetup(false)} />
      )}
    </section>
  );
}
