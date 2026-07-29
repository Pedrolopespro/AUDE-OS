"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SocialMediaPanel } from "./social-media-panel";

type PaymentStatus = "confirm" | "paid" | "overdue";
type ContractType = "fixed" | "percentage";
type Stage = "prospect" | "meeting" | "proposal" | "closed" | "lost";
type MeetingStatus = "scheduled" | "held" | "cancelled";

type Client = {
  id: string;
  name: string;
  initials: string;
  services: string[];
  contractType: ContractType;
  value: number;
  paymentStatus: PaymentStatus;
  color: string;
  active?: boolean;
};

type Opportunity = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  stage: Stage;
  meetingStatus: MeetingStatus | null;
  meetingDate: string | null;
  estimatedValue: number | null;
  notes: string;
};

type Goals = {
  prospecting: number | null;
  meetings: number | null;
  closedClients: number | null;
};

type Page = "overview" | "commercial" | "clients" | "finance" | "settings";

const seedClients: Client[] = [
  {
    id: "lima-ferreira",
    name: "Lima Ferreira Advogados",
    initials: "LF",
    services: ["Social media", "Tráfego", "Site"],
    contractType: "fixed",
    value: 1300,
    paymentStatus: "confirm",
    color: "#102d61",
  },
  {
    id: "kmon",
    name: "KMON",
    initials: "KM",
    services: ["Social media", "Tráfego", "Site"],
    contractType: "fixed",
    value: 1500,
    paymentStatus: "confirm",
    color: "#0f766e",
  },
  {
    id: "projeto-endorfina",
    name: "Projeto Endorfina",
    initials: "EN",
    services: ["Social media", "Tráfego", "Site", "Sistemas", "Lançamento"],
    contractType: "percentage",
    value: 20,
    paymentStatus: "confirm",
    color: "#5a7b19",
  },
  {
    id: "ires-trafego",
    name: "Ires Tráfego",
    initials: "IR",
    services: ["Site", "Lançamento"],
    contractType: "percentage",
    value: 20,
    paymentStatus: "confirm",
    color: "#7c3aed",
  },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const stageLabels: Record<Stage, string> = {
  prospect: "Prospecção",
  meeting: "Reunião",
  proposal: "Proposta",
  closed: "Fechado",
  lost: "Não avançou",
};

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true">A</div>;
}

function Sidebar({
  page,
  setPage,
}: {
  page: Page;
  setPage: (page: Page) => void;
}) {
  const items: { id: Page; label: string; icon: string }[] = [
    { id: "overview", label: "Visão geral", icon: "⌂" },
    { id: "commercial", label: "Comercial", icon: "↗" },
    { id: "clients", label: "Clientes", icon: "◇" },
    { id: "finance", label: "Financeiro", icon: "$" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <div><strong>AUDE</strong><span>Gestão</span></div>
      </div>

      <nav aria-label="Navegação principal">
        <span className="nav-label">MENU</span>
        {items.map((item) => (
          <button
            className={page === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <button
        className={page === "settings" ? "nav-item settings active" : "nav-item settings"}
        onClick={() => setPage("settings")}
      >
        <span className="nav-icon" aria-hidden="true">⚙</span>
        Configurações
      </button>

      <div className="profile">
        <div className="avatar">PL</div>
        <div><strong>Pedro Lopes</strong><span>Administrador</span></div>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  onNewClient,
}: {
  title: string;
  onNewClient: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">AUDE AGÊNCIA</span>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <span className="save-state"><i />Dados salvos</span>
        <button className="primary-button" onClick={onNewClient}>
          <span aria-hidden="true">＋</span>Novo cliente
        </button>
      </div>
    </header>
  );
}

function MetricCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta: string;
  accent: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span className="metric-dot" style={{ background: accent }} />
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-meta">{meta}</span>
    </article>
  );
}

function Overview({
  clients,
  opportunities,
  goals,
  openClient,
  goTo,
  addOpportunity,
}: {
  clients: Client[];
  opportunities: Opportunity[];
  goals: Goals;
  openClient: (client: Client) => void;
  goTo: (page: Page) => void;
  addOpportunity: () => void;
}) {
  const fixedRevenue = clients
    .filter((client) => client.contractType === "fixed")
    .reduce((sum, client) => sum + client.value, 0);
  const prospects = opportunities.filter((item) => item.stage === "prospect").length;
  const meetings = opportunities.filter((item) => item.stage === "meeting");
  const closed = opportunities.filter((item) => item.stage === "closed").length;
  const meetingCount = (status: MeetingStatus) =>
    meetings.filter((item) => item.meetingStatus === status).length;

  return (
    <>
      <section className="welcome-row">
        <div>
          <h2>Boa tarde, Pedro.</h2>
          <p>A operação da AUDE em uma visão simples e direta.</p>
        </div>
        <div className="period-pill">Julho de 2026⌄</div>
      </section>

      <section className="metrics-grid" aria-label="Resumo comercial">
        <MetricCard
          label="Prospecções"
          value={String(prospects)}
          meta={goals.prospecting == null ? "Meta não definida" : `Meta: ${goals.prospecting}`}
          accent="#4866ed"
        />
        <MetricCard
          label="Reuniões"
          value={String(meetings.length)}
          meta={goals.meetings == null ? "Meta não definida" : `Meta: ${goals.meetings}`}
          accent="#d99029"
        />
        <MetricCard
          label="Clientes fechados"
          value={String(closed)}
          meta={goals.closedClients == null ? "Meta não definida" : `Meta: ${goals.closedClients}`}
          accent="#12a06a"
        />
        <MetricCard
          label="Clientes ativos"
          value={String(clients.length)}
          meta="Base atual"
          accent="#7c56d9"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel clients-panel">
          <div className="panel-heading">
            <div>
              <h3>Clientes</h3>
              <p>Abra uma conta para acompanhar toda a operação.</p>
            </div>
            <button className="text-button" onClick={() => goTo("clients")}>Ver todos</button>
          </div>
          <div className="client-list">
            {clients.map((client) => (
              <button className="client-row" key={client.id} onClick={() => openClient(client)}>
                <span className="client-logo" style={{ background: client.color }}>{client.initials}</span>
                <span className="client-main">
                  <strong>{client.name}</strong>
                  <span>{client.services.join(" · ")}</span>
                </span>
                <span className="contract">
                  <strong>{client.contractType === "fixed" ? money.format(client.value) : `${client.value}%`}</strong>
                  <span>{client.contractType === "fixed" ? "mensal" : "comissão"}</span>
                </span>
                <span className="row-arrow">›</span>
              </button>
            ))}
          </div>
        </article>

        <div className="side-stack">
          <article className="panel finance-summary">
            <div className="panel-heading compact">
              <div><h3>Financeiro</h3><p>Contratos atuais</p></div>
              <button className="text-button" onClick={() => goTo("finance")}>Abrir</button>
            </div>
            <strong className="finance-total">{money.format(fixedRevenue)}</strong>
            <span className="finance-caption">Receita fixa contratada</span>
            <div className="finance-divider" />
            <div className="finance-line"><span>Contratos por comissão</span><strong>{clients.filter((client) => client.contractType === "percentage").length}</strong></div>
            <div className="finance-line"><span>Pagamentos em atraso</span><strong className={clients.some((client) => client.paymentStatus === "overdue") ? "danger-text" : ""}>{clients.filter((client) => client.paymentStatus === "overdue").length}</strong></div>
          </article>

          <article className="panel meeting-panel">
            <div className="panel-heading compact">
              <div><h3>Reuniões</h3><p>Status do mês</p></div>
              <button className="round-add" aria-label="Adicionar reunião" onClick={addOpportunity}>＋</button>
            </div>
            <div className="meeting-status"><span><i className="status-dot scheduled" />Agendadas</span><strong>{meetingCount("scheduled")}</strong></div>
            <div className="meeting-status"><span><i className="status-dot done" />Realizadas</span><strong>{meetingCount("held")}</strong></div>
            <div className="meeting-status"><span><i className="status-dot cancelled" />Canceladas</span><strong>{meetingCount("cancelled")}</strong></div>
          </article>
        </div>
      </section>
    </>
  );
}

function ClientsPage({
  clients,
  openClient,
}: {
  clients: Client[];
  openClient: (client: Client) => void;
}) {
  return (
    <section className="panel page-panel">
      <div className="panel-heading">
        <div><h3>Todos os clientes</h3><p>{clients.length} contas ativas</p></div>
      </div>
      <div className="client-cards">
        {clients.map((client) => (
          <button className="client-card" key={client.id} onClick={() => openClient(client)}>
            <span className="client-logo large" style={{ background: client.color }}>{client.initials}</span>
            <strong>{client.name}</strong>
            <span>{client.services.length} serviços</span>
            <div className="service-tags">
              {client.services.slice(0, 3).map((service) => <i key={service}>{service}</i>)}
              {client.services.length > 3 && <i>+{client.services.length - 3}</i>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ClientDetail({
  client,
  onBack,
  updatePayment,
  openService,
}: {
  client: Client;
  onBack: () => void;
  updatePayment: (id: string, status: PaymentStatus) => void;
  openService: (service: string) => void;
}) {
  return (
    <section className="client-detail">
      <button className="back-button" onClick={onBack}>‹ Voltar para clientes</button>
      <div className="client-hero">
        <span className="client-logo hero-logo" style={{ background: client.color }}>{client.initials}</span>
        <div>
          <span className="status-badge active">Cliente ativo</span>
          <h2>{client.name}</h2>
          <p>{client.services.join(" · ")}</p>
        </div>
        <div className="hero-contract">
          <span>Contrato</span>
          <strong>{client.contractType === "fixed" ? `${money.format(client.value)}/mês` : `${client.value}% de comissão`}</strong>
          <select
            aria-label={`Status financeiro de ${client.name}`}
            value={client.paymentStatus}
            onChange={(event) => updatePayment(client.id, event.target.value as PaymentStatus)}
            className={`payment-select ${client.paymentStatus}`}
          >
            <option value="confirm">A confirmar</option>
            <option value="paid">Pago</option>
            <option value="overdue">Em atraso</option>
          </select>
        </div>
      </div>

      <div className="client-dashboard">
        <article className="panel service-overview">
          <div className="panel-heading">
            <div><h3>Operação contratada</h3><p>Cada área mostra somente o que pertence a este cliente.</p></div>
          </div>
          <div className="service-grid">
            {client.services.map((service) => (
              <button
                className="service-card"
                key={service}
                onClick={() => openService(service)}
              >
                <span>{service.slice(0, 1)}</span>
                <div>
                  <strong>{service}</strong>
                  <i>
                    {service === "Social media"
                      ? "Calendário, produção e métricas"
                      : "Painel em preparação"}
                  </i>
                </div>
                <b>›</b>
              </button>
            ))}
          </div>
        </article>
        <article className="panel next-actions">
          <h3>Próximas ações</h3>
          <div className="clean-empty">
            <span>✓</span><strong>Tudo limpo por aqui</strong>
            <p>Nenhuma pendência cadastrada para este cliente.</p>
          </div>
          <button className="secondary-button">＋ Adicionar atividade</button>
        </article>
      </div>
    </section>
  );
}

function CommercialPage({
  opportunities,
  onNew,
  updateOpportunity,
}: {
  opportunities: Opportunity[];
  onNew: () => void;
  updateOpportunity: (id: string, data: Partial<Opportunity>) => void;
}) {
  const columns: Stage[] = ["prospect", "meeting", "proposal", "closed"];

  return (
    <section className="commercial-page">
      <div className="section-intro">
        <div><h2>Funil comercial</h2><p>Somente as etapas que você precisa acompanhar.</p></div>
        <button className="primary-button" onClick={onNew}>＋ Nova oportunidade</button>
      </div>
      <div className="pipeline">
        {columns.map((stage) => {
          const items = opportunities.filter((item) => item.stage === stage);
          return (
            <article className="pipeline-column" key={stage}>
              <div className="pipeline-head">
                <span>{stageLabels[stage]}</span><b>{items.length}</b>
              </div>
              <div className="pipeline-body">
                {items.map((item) => (
                  <div className="opportunity-card" key={item.id}>
                    <strong>{item.company}</strong>
                    <span>{item.contact || "Contato não informado"}</span>
                    {item.estimatedValue != null && <i>{money.format(item.estimatedValue)}</i>}
                    {stage === "meeting" && (
                      <select
                        aria-label={`Status da reunião com ${item.company}`}
                        value={item.meetingStatus ?? "scheduled"}
                        onChange={(event) =>
                          updateOpportunity(item.id, {
                            meetingStatus: event.target.value as MeetingStatus,
                          })
                        }
                      >
                        <option value="scheduled">Agendada</option>
                        <option value="held">Realizada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    )}
                    <select
                      aria-label={`Etapa de ${item.company}`}
                      value={item.stage}
                      onChange={(event) =>
                        updateOpportunity(item.id, { stage: event.target.value as Stage })
                      }
                    >
                      {Object.entries(stageLabels).map(([value, label]) => (
                        <option value={value} key={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {!items.length && (
                  <div className="column-empty"><span>＋</span><p>Nenhum item</p></div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinancePage({
  clients,
  updatePayment,
}: {
  clients: Client[];
  updatePayment: (id: string, status: PaymentStatus) => void;
}) {
  const fixedRevenue = clients
    .filter((client) => client.contractType === "fixed")
    .reduce((sum, client) => sum + client.value, 0);
  const paid = clients.filter((client) => client.paymentStatus === "paid").length;
  const overdue = clients.filter((client) => client.paymentStatus === "overdue").length;

  return (
    <section className="finance-page">
      <div className="finance-metrics">
        <MetricCard label="Receita fixa contratada" value={money.format(fixedRevenue)} meta="Contratos mensais" accent="#4866ed" />
        <MetricCard label="Pagamentos confirmados" value={String(paid)} meta="Clientes marcados como pagos" accent="#12a06a" />
        <MetricCard label="Em atraso" value={String(overdue)} meta="Clientes com pendência" accent="#d34f4f" />
      </div>
      <article className="panel finance-table-panel">
        <div className="panel-heading"><div><h3>Contratos e pagamentos</h3><p>Atualize o status sem abrir outra tela.</p></div></div>
        <div className="finance-table">
          <div className="finance-table-head">
            <span>Cliente</span><span>Modelo</span><span>Valor</span><span>Status</span>
          </div>
          {clients.map((client) => (
            <div className="finance-table-row" key={client.id}>
              <span className="finance-client"><i style={{ background: client.color }}>{client.initials}</i><strong>{client.name}</strong></span>
              <span>{client.contractType === "fixed" ? "Mensalidade" : "Comissão"}</span>
              <strong>{client.contractType === "fixed" ? money.format(client.value) : `${client.value}%`}</strong>
              <select
                aria-label={`Status financeiro de ${client.name}`}
                value={client.paymentStatus}
                onChange={(event) => updatePayment(client.id, event.target.value as PaymentStatus)}
                className={`payment-select ${client.paymentStatus}`}
              >
                <option value="confirm">A confirmar</option>
                <option value="paid">Pago</option>
                <option value="overdue">Em atraso</option>
              </select>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function SettingsPage({
  goals,
  saveGoals,
}: {
  goals: Goals;
  saveGoals: (goals: Goals) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    prospecting: goals.prospecting?.toString() ?? "",
    meetings: goals.meetings?.toString() ?? "",
    closedClients: goals.closedClients?.toString() ?? "",
  });
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await saveGoals({
      prospecting: draft.prospecting === "" ? null : Number(draft.prospecting),
      meetings: draft.meetings === "" ? null : Number(draft.meetings),
      closedClients: draft.closedClients === "" ? null : Number(draft.closedClients),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="settings-page">
      <div className="section-intro">
        <div><h2>Metas comerciais</h2><p>Defina apenas os números que quer acompanhar no painel.</p></div>
      </div>
      <form className="panel goals-form" onSubmit={submit}>
        <label>Prospecções<input type="number" min="0" placeholder="Sem meta" value={draft.prospecting} onChange={(event) => setDraft({ ...draft, prospecting: event.target.value })} /></label>
        <label>Reuniões<input type="number" min="0" placeholder="Sem meta" value={draft.meetings} onChange={(event) => setDraft({ ...draft, meetings: event.target.value })} /></label>
        <label>Clientes fechados<input type="number" min="0" placeholder="Sem meta" value={draft.closedClients} onChange={(event) => setDraft({ ...draft, closedClients: event.target.value })} /></label>
        <div className="goals-actions">
          {saved && <span className="success-message">✓ Metas salvas</span>}
          <button className="primary-button" type="submit">Salvar metas</button>
        </div>
      </form>
    </section>
  );
}

function ModalFrame({
  eyebrow,
  title,
  close,
  children,
}: {
  eyebrow: string;
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
          <button className="close-button" onClick={close} aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewClientModal({
  close,
  onSaved,
}: {
  close: () => void;
  onSaved: (client: Client) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [contractType, setContractType] = useState<ContractType>("fixed");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const services = ["Social media", "Tráfego", "Site", "Sistemas", "Lançamento"];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          services: selected,
          contractType,
          value: Number(value),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.client);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame eyebrow="CADASTRO" title="Novo cliente" close={close}>
      <form onSubmit={submit}>
        <label>Nome do cliente<input placeholder="Ex.: Empresa ou projeto" autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
        <fieldset>
          <legend>Serviços contratados</legend>
          <div className="choice-grid">
            {services.map((service) => (
              <button
                type="button"
                key={service}
                className={selected.includes(service) ? "choice selected" : "choice"}
                onClick={() => setSelected((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service])}
              >
                <span>{selected.includes(service) ? "✓" : "＋"}</span>{service}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="two-fields">
          <label>Modelo do contrato
            <select value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)}>
              <option value="fixed">Mensalidade fixa</option>
              <option value="percentage">Comissão percentual</option>
            </select>
          </label>
          <label>{contractType === "fixed" ? "Valor mensal (R$)" : "Comissão (%)"}
            <input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0" />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={close}>Cancelar</button>
          <button className="primary-button" disabled={!name.trim() || !selected.length || value === "" || saving} type="submit">
            {saving ? "Salvando..." : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function NewOpportunityModal({
  close,
  onSaved,
}: {
  close: () => void;
  onSaved: (opportunity: Opportunity) => void;
}) {
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [stage, setStage] = useState<Stage>("prospect");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          contact,
          stage,
          meetingStatus: stage === "meeting" ? "scheduled" : null,
          estimatedValue: value === "" ? null : Number(value),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.opportunity);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame eyebrow="COMERCIAL" title="Nova oportunidade" close={close}>
      <form onSubmit={submit}>
        <label>Empresa ou oportunidade<input autoFocus placeholder="Nome da empresa" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
        <div className="two-fields">
          <label>Contato<input placeholder="Nome da pessoa" value={contact} onChange={(event) => setContact(event.target.value)} /></label>
          <label>Valor estimado<input type="number" min="0" placeholder="R$ 0" value={value} onChange={(event) => setValue(event.target.value)} /></label>
        </div>
        <label>Etapa inicial
          <select value={stage} onChange={(event) => setStage(event.target.value as Stage)}>
            <option value="prospect">Prospecção</option>
            <option value="meeting">Reunião agendada</option>
            <option value="proposal">Proposta enviada</option>
            <option value="closed">Fechado</option>
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={close}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={!company.trim() || saving}>{saving ? "Salvando..." : "Adicionar"}</button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function DashboardApp() {
  const [page, setPage] = useState<Page>("overview");
  const [clients, setClients] = useState<Client[]>(seedClients);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [goals, setGoals] = useState<Goals>({ prospecting: null, meetings: null, closedClients: null });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewOpportunity, setShowNewOpportunity] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
        if (data.opportunities) setOpportunities(data.opportunities);
        if (data.goals) setGoals(data.goals);
      })
      .catch(() => {
        // The real client data remains visible if the first network request is interrupted.
      });
  }, []);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const title = useMemo(() => {
    if (selectedClient && selectedService) {
      return `${selectedService} · ${selectedClient.name}`;
    }
    if (selectedClient) return selectedClient.name;
    return {
      overview: "Visão geral",
      commercial: "Comercial",
      clients: "Clientes",
      finance: "Financeiro",
      settings: "Configurações",
    }[page];
  }, [page, selectedClient, selectedService]);

  const changePage = (next: Page) => {
    setSelectedClientId(null);
    setSelectedService(null);
    setPage(next);
  };

  const openClient = (client: Client) => {
    setSelectedClientId(client.id);
    setSelectedService(null);
    setPage("clients");
  };

  const openService = (service: string) => {
    if (service === "Social media") setSelectedService(service);
  };

  const updatePayment = async (id: string, paymentStatus: PaymentStatus) => {
    const previous = clients;
    setClients((current) => current.map((client) => client.id === id ? { ...client, paymentStatus } : client));
    const response = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus }),
    });
    if (!response.ok) setClients(previous);
  };

  const updateOpportunity = async (id: string, data: Partial<Opportunity>) => {
    const previous = opportunities;
    setOpportunities((current) => current.map((item) => item.id === id ? { ...item, ...data } : item));
    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) setOpportunities(previous);
  };

  const saveGoals = async (nextGoals: Goals) => {
    const response = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextGoals),
    });
    if (!response.ok) throw new Error("Não foi possível salvar as metas.");
    setGoals(nextGoals);
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={changePage} />
      <main className="main-content">
        <Topbar title={title} onNewClient={() => setShowNewClient(true)} />
        <div className="content">
          {selectedClient && selectedService === "Social media" ? (
            <SocialMediaPanel
              client={selectedClient}
              onBack={() => setSelectedService(null)}
            />
          ) : selectedClient ? (
            <ClientDetail
              client={selectedClient}
              onBack={() => setSelectedClientId(null)}
              updatePayment={updatePayment}
              openService={openService}
            />
          ) : page === "overview" ? (
            <Overview clients={clients} opportunities={opportunities} goals={goals} openClient={openClient} goTo={changePage} addOpportunity={() => setShowNewOpportunity(true)} />
          ) : page === "clients" ? (
            <ClientsPage clients={clients} openClient={openClient} />
          ) : page === "commercial" ? (
            <CommercialPage opportunities={opportunities} onNew={() => setShowNewOpportunity(true)} updateOpportunity={updateOpportunity} />
          ) : page === "finance" ? (
            <FinancePage clients={clients} updatePayment={updatePayment} />
          ) : (
            <SettingsPage goals={goals} saveGoals={saveGoals} />
          )}
        </div>
      </main>
      {showNewClient && (
        <NewClientModal
          close={() => setShowNewClient(false)}
          onSaved={(client) => setClients((current) => [...current, client])}
        />
      )}
      {showNewOpportunity && (
        <NewOpportunityModal
          close={() => setShowNewOpportunity(false)}
          onSaved={(opportunity) => setOpportunities((current) => [opportunity, ...current])}
        />
      )}
    </div>
  );
}
