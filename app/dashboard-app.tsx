"use client";

import { useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  initials: string;
  services: string[];
  contractType: "fixed" | "percentage";
  value: number;
  paymentStatus: "confirm" | "paid" | "overdue";
  color: string;
};

const clients: Client[] = [
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

type Page = "overview" | "commercial" | "clients" | "finance" | "settings";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      A
    </div>
  );
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
        <div>
          <strong>AUDE</strong>
          <span>Gestão</span>
        </div>
      </div>

      <nav aria-label="Navegação principal">
        <span className="nav-label">MENU</span>
        {items.map((item) => (
          <button
            className={page === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <button className="nav-item settings" onClick={() => setPage("settings")}>
        <span className="nav-icon" aria-hidden="true">⚙</span>
        Configurações
      </button>

      <div className="profile">
        <div className="avatar">PL</div>
        <div>
          <strong>Pedro Lopes</strong>
          <span>Administrador</span>
        </div>
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
        <button className="icon-button" aria-label="Notificações">●</button>
        <button className="primary-button" onClick={onNewClient}>
          <span aria-hidden="true">＋</span>
          Novo cliente
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

function Overview({ openClient }: { openClient: (client: Client) => void }) {
  const fixedRevenue = clients
    .filter((client) => client.contractType === "fixed")
    .reduce((sum, client) => sum + client.value, 0);

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
        <MetricCard label="Prospecções" value="—" meta="Definir meta" accent="#4866ed" />
        <MetricCard label="Reuniões" value="0" meta="Nenhuma registrada" accent="#d99029" />
        <MetricCard label="Clientes fechados" value="0" meta="Neste mês" accent="#12a06a" />
        <MetricCard label="Clientes ativos" value="4" meta="Base atual" accent="#7c56d9" />
      </section>

      <section className="dashboard-grid">
        <article className="panel clients-panel">
          <div className="panel-heading">
            <div>
              <h3>Clientes</h3>
              <p>Abra uma conta para acompanhar toda a operação.</p>
            </div>
            <button className="text-button">Ver todos</button>
          </div>
          <div className="client-list">
            {clients.map((client) => (
              <button className="client-row" key={client.id} onClick={() => openClient(client)}>
                <span className="client-logo" style={{ background: client.color }}>
                  {client.initials}
                </span>
                <span className="client-main">
                  <strong>{client.name}</strong>
                  <span>{client.services.join(" · ")}</span>
                </span>
                <span className="contract">
                  <strong>
                    {client.contractType === "fixed"
                      ? money.format(client.value)
                      : `${client.value}%`}
                  </strong>
                  <span>
                    {client.contractType === "fixed" ? "mensal" : "comissão"}
                  </span>
                </span>
                <span className="row-arrow">›</span>
              </button>
            ))}
          </div>
        </article>

        <div className="side-stack">
          <article className="panel finance-summary">
            <div className="panel-heading compact">
              <div>
                <h3>Financeiro</h3>
                <p>Contratos atuais</p>
              </div>
              <span className="status-badge neutral">A confirmar</span>
            </div>
            <strong className="finance-total">{money.format(fixedRevenue)}</strong>
            <span className="finance-caption">Receita fixa contratada</span>
            <div className="finance-divider" />
            <div className="finance-line">
              <span>Contratos por comissão</span>
              <strong>2</strong>
            </div>
            <div className="finance-line">
              <span>Clientes ativos</span>
              <strong>4</strong>
            </div>
          </article>

          <article className="panel meeting-panel">
            <div className="panel-heading compact">
              <div>
                <h3>Reuniões</h3>
                <p>Status do mês</p>
              </div>
              <button className="round-add" aria-label="Adicionar reunião">＋</button>
            </div>
            <div className="meeting-status">
              <span><i className="status-dot scheduled" />Agendadas</span><strong>0</strong>
            </div>
            <div className="meeting-status">
              <span><i className="status-dot done" />Realizadas</span><strong>0</strong>
            </div>
            <div className="meeting-status">
              <span><i className="status-dot cancelled" />Canceladas</span><strong>0</strong>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function EmptyPage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <section className="empty-page">
      <div className="empty-symbol">＋</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="primary-button">{action}</button>
    </section>
  );
}

function ClientsPage({ openClient }: { openClient: (client: Client) => void }) {
  return (
    <section className="panel page-panel">
      <div className="panel-heading">
        <div>
          <h3>Todos os clientes</h3>
          <p>4 contas ativas</p>
        </div>
      </div>
      <div className="client-cards">
        {clients.map((client) => (
          <button className="client-card" key={client.id} onClick={() => openClient(client)}>
            <span className="client-logo large" style={{ background: client.color }}>
              {client.initials}
            </span>
            <strong>{client.name}</strong>
            <span>{client.services.length} serviços</span>
            <div className="service-tags">
              {client.services.slice(0, 3).map((service) => (
                <i key={service}>{service}</i>
              ))}
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
}: {
  client: Client;
  onBack: () => void;
}) {
  return (
    <section className="client-detail">
      <button className="back-button" onClick={onBack}>‹ Voltar para clientes</button>
      <div className="client-hero">
        <span className="client-logo hero-logo" style={{ background: client.color }}>
          {client.initials}
        </span>
        <div>
          <span className="status-badge active">Cliente ativo</span>
          <h2>{client.name}</h2>
          <p>{client.services.join(" · ")}</p>
        </div>
        <div className="hero-contract">
          <span>Contrato</span>
          <strong>
            {client.contractType === "fixed"
              ? `${money.format(client.value)}/mês`
              : `${client.value}% de comissão`}
          </strong>
          <i>Aguardando confirmação de pagamento</i>
        </div>
      </div>

      <div className="client-dashboard">
        <article className="panel service-overview">
          <div className="panel-heading">
            <div>
              <h3>Operação contratada</h3>
              <p>Clique em uma área para começar a organizar o trabalho.</p>
            </div>
          </div>
          <div className="service-grid">
            {client.services.map((service) => (
              <button className="service-card" key={service}>
                <span>{service.slice(0, 1)}</span>
                <div>
                  <strong>{service}</strong>
                  <i>Nenhuma atividade cadastrada</i>
                </div>
                <b>›</b>
              </button>
            ))}
          </div>
        </article>
        <article className="panel next-actions">
          <h3>Próximas ações</h3>
          <div className="clean-empty">
            <span>✓</span>
            <strong>Tudo limpo por aqui</strong>
            <p>Nenhuma pendência cadastrada para este cliente.</p>
          </div>
          <button className="secondary-button">＋ Adicionar atividade</button>
        </article>
      </div>
    </section>
  );
}

function NewClientModal({ close }: { close: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const services = ["Social media", "Tráfego", "Site", "Sistemas", "Lançamento"];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-client-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">CADASTRO</span>
            <h2 id="new-client-title">Novo cliente</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Fechar">×</button>
        </div>
        <label>
          Nome do cliente
          <input placeholder="Ex.: Empresa ou projeto" autoFocus />
        </label>
        <fieldset>
          <legend>Serviços contratados</legend>
          <div className="choice-grid">
            {services.map((service) => (
              <button
                type="button"
                key={service}
                className={selected.includes(service) ? "choice selected" : "choice"}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(service)
                      ? current.filter((item) => item !== service)
                      : [...current, service],
                  )
                }
              >
                <span>{selected.includes(service) ? "✓" : "＋"}</span>
                {service}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="modal-actions">
          <button className="secondary-button" onClick={close}>Cancelar</button>
          <button className="primary-button" disabled>Continuar</button>
        </div>
        <p className="prototype-note">O salvamento será ativado na próxima etapa.</p>
      </div>
    </div>
  );
}

export function DashboardApp() {
  const [page, setPage] = useState<Page>("overview");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const title = useMemo(() => {
    if (selectedClient) return selectedClient.name;
    return {
      overview: "Visão geral",
      commercial: "Comercial",
      clients: "Clientes",
      finance: "Financeiro",
      settings: "Configurações",
    }[page];
  }, [page, selectedClient]);

  const changePage = (next: Page) => {
    setSelectedClient(null);
    setPage(next);
  };

  const openClient = (client: Client) => {
    setSelectedClient(client);
    setPage("clients");
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={changePage} />
      <main className="main-content">
        <Topbar title={title} onNewClient={() => setShowNewClient(true)} />
        <div className="content">
          {selectedClient ? (
            <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
          ) : page === "overview" ? (
            <Overview openClient={openClient} />
          ) : page === "clients" ? (
            <ClientsPage openClient={openClient} />
          ) : page === "commercial" ? (
            <EmptyPage
              title="Seu comercial começa aqui"
              description="Cadastre prospecções e acompanhe reuniões sem transformar o processo em um CRM complicado."
              action="Adicionar prospecção"
            />
          ) : page === "finance" ? (
            <EmptyPage
              title="Financeiro sem planilhas confusas"
              description="Acompanhe pagamentos, pendências e contratos por comissão em uma única tela."
              action="Abrir visão financeira"
            />
          ) : (
            <EmptyPage
              title="Configurações essenciais"
              description="Defina metas comerciais e personalize somente o que realmente importa para sua rotina."
              action="Definir metas"
            />
          )}
        </div>
      </main>
      {showNewClient && <NewClientModal close={() => setShowNewClient(false)} />}
    </div>
  );
}
