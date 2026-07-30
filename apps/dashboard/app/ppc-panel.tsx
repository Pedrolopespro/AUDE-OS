"use client";

import { FormEvent, useEffect, useState } from "react";

type ClientIdentity = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

type GoogleAdsAccount = {
  clientId: string;
  customerId: string;
  accountName: string | null;
  status: string;
  currencyCode: string | null;
  timeZone: string | null;
  linkedAt: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
};

type PpcConfiguration = {
  provider: "google_ads";
  mode: "read_only";
  managerCustomerId: string;
  account: GoogleAdsAccount | null;
  apiConfigured: boolean;
  readyToSync: boolean;
};

type PpcPanelProps = {
  client: ClientIdentity;
  onBack: () => void;
  canConfigure: boolean;
};

const emptyConfiguration: PpcConfiguration = {
  provider: "google_ads",
  mode: "read_only",
  managerCustomerId: "",
  account: null,
  apiConfigured: false,
  readyToSync: false,
};

function formatCustomerId(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  return digits
    .replace(/^(\d{3})(\d)/, "$1-$2")
    .replace(/^(\d{3})-(\d{3})(\d)/, "$1-$2-$3");
}

async function readJson<T>(response: Response) {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("O serviço está temporariamente indisponível.");
  }
}

function GoogleAdsMark() {
  return (
    <span className="ppc-google-mark" aria-hidden="true">
      <i />
      <b />
      <em />
    </span>
  );
}

function SetupModal({
  client,
  configuration,
  close,
  onSaved,
}: {
  client: ClientIdentity;
  configuration: PpcConfiguration;
  close: () => void;
  onSaved: (configuration: PpcConfiguration) => void;
}) {
  const [managerCustomerId, setManagerCustomerId] = useState(
    formatCustomerId(configuration.managerCustomerId),
  );
  const [customerId, setCustomerId] = useState(
    formatCustomerId(configuration.account?.customerId ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/clients/${client.id}/ppc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerCustomerId, customerId }),
      });
      const data = await readJson<{
        configuration?: PpcConfiguration;
        error?: string;
      }>(response);
      if (!response.ok || !data.configuration) {
        throw new Error(data.error ?? "Não foi possível salvar a configuração.");
      }
      onSaved(data.configuration);
      close();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar a configuração.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div
        className="modal ppc-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ppc-setup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">GOOGLE ADS · SOMENTE LEITURA</span>
            <h2 id="ppc-setup-title">Conectar conta do cliente</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="ppc-setup-intro">
          <GoogleAdsMark />
          <div>
            <strong>{client.name}</strong>
            <p>
              Cadastre os IDs usados no vínculo. A senha do cliente nunca é
              solicitada ou armazenada pela AUDE.
            </p>
          </div>
        </div>

        <form onSubmit={submit}>
          <label>
            MCC padrão da AUDE
            <input
              autoFocus
              inputMode="numeric"
              placeholder="123-456-7890"
              value={managerCustomerId}
              onChange={(event) =>
                setManagerCustomerId(formatCustomerId(event.target.value))
              }
              required
            />
            <small>
              Esse ID será usado como conta administradora padrão da agência.
            </small>
          </label>
          <label>
            ID Google Ads do cliente
            <input
              inputMode="numeric"
              placeholder="987-654-3210"
              value={customerId}
              onChange={(event) =>
                setCustomerId(formatCustomerId(event.target.value))
              }
              required
            />
            <small>Encontre o ID de 10 dígitos no topo da conta Google Ads.</small>
          </label>

          <ol className="ppc-link-flow">
            <li>
              <span>1</span>
              <div>
                <strong>AUDE envia o vínculo pelo MCC</strong>
                <p>A conta do cliente recebe uma solicitação oficial do Google.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Cliente aceita dentro do Google Ads</strong>
                <p>Ele usa o próprio usuário; nenhuma senha é compartilhada.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>O painel importa os indicadores</strong>
                <p>Após as credenciais da API, a leitura passa a ser automática.</p>
              </div>
            </li>
          </ol>

          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={close}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={
                saving ||
                managerCustomerId.replace(/\D/g, "").length !== 10 ||
                customerId.replace(/\D/g, "").length !== 10
              }
            >
              {saving ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetupStatus({
  configuration,
}: {
  configuration: PpcConfiguration;
}) {
  const items = [
    {
      label: "MCC da AUDE",
      value: configuration.managerCustomerId
        ? formatCustomerId(configuration.managerCustomerId)
        : "Não informado",
      ready: Boolean(configuration.managerCustomerId),
    },
    {
      label: "Conta do cliente",
      value: configuration.account
        ? formatCustomerId(configuration.account.customerId)
        : "Não informada",
      ready: Boolean(configuration.account),
    },
    {
      label: "API Google Ads",
      value: configuration.apiConfigured
        ? "Credenciais disponíveis"
        : "Aguardando credenciais",
      ready: configuration.apiConfigured,
    },
  ];

  return (
    <div className="ppc-setup-status">
      {items.map((item) => (
        <div key={item.label}>
          <i className={item.ready ? "ready" : ""} aria-hidden="true">
            {item.ready ? "✓" : "!"}
          </i>
          <span>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

const futureSources = [
  {
    mark: "GB",
    title: "Google Business Profile",
    subtitle: "Google Meu Negócio",
    detail: "Alcance local, ligações, rotas e avaliações.",
  },
  {
    mark: "SC",
    title: "Google Search Console",
    subtitle: "Busca orgânica",
    detail: "Consultas, cliques, impressões e posição.",
  },
  {
    mark: "GA",
    title: "Google Analytics 4",
    subtitle: "Comportamento no site",
    detail: "Sessões, eventos, conversões e páginas.",
  },
  {
    mark: "GT",
    title: "Google Tag Manager",
    subtitle: "Saúde da mensuração",
    detail: "Leitura do contêiner, tags e diagnósticos.",
  },
];

export function PpcPanel({
  client,
  onBack,
  canConfigure,
}: PpcPanelProps) {
  const [configuration, setConfiguration] =
    useState<PpcConfiguration>(emptyConfiguration);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    let active = true;
    fetch(`/api/clients/${client.id}/ppc`)
      .then(async (response) => {
        const data = await readJson<PpcConfiguration & { error?: string }>(
          response,
        );
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar.");
        if (active) setConfiguration(data);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar a configuração.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client.id]);

  const configured = Boolean(
    configuration.managerCustomerId && configuration.account,
  );

  return (
    <section className="ppc-page">
      <button className="back-button" onClick={onBack}>
        ‹ Voltar para {client.name}
      </button>

      <header className="ppc-hero">
        <div className="ppc-client">
          <span
            className="client-logo"
            style={{ background: client.color }}
            aria-hidden="true"
          >
            {client.initials}
          </span>
          <div>
            <span className="eyebrow">MÍDIA PAGA</span>
            <h2>PAINEL PPC</h2>
            <p>Visão geral de investimento e performance de {client.name}.</p>
          </div>
        </div>
        <div className="ppc-hero-actions">
          <span className="read-only-pill">◉ Somente leitura</span>
          {canConfigure && (
            <button className="primary-button" onClick={() => setShowSetup(true)}>
              {configured ? "Editar conexão" : "Configurar Google Ads"}
            </button>
          )}
        </div>
      </header>

      <nav className="ppc-channel-tabs" aria-label="Plataformas de mídia paga">
        <button className="active" aria-current="page">
          <GoogleAdsMark />
          <span>
            <strong>Google Ads</strong>
            <small>Em implantação</small>
          </span>
        </button>
        <button disabled>
          <i className="ppc-channel-mark meta">M</i>
          <span>
            <strong>Meta Ads</strong>
            <small>Próxima etapa</small>
          </span>
        </button>
        <button disabled>
          <i className="ppc-channel-mark linkedin">in</i>
          <span>
            <strong>LinkedIn Ads</strong>
            <small>Planejado</small>
          </span>
        </button>
      </nav>

      {loading ? (
        <div className="ppc-loading" aria-live="polite">
          <i />
          <span>
            <strong>Carregando configuração</strong>
            <small>Verificando a conta Google Ads deste cliente...</small>
          </span>
        </div>
      ) : (
        <>
          <article className={`ppc-connection-card ${configured ? "configured" : ""}`}>
            <div className="ppc-connection-copy">
              <GoogleAdsMark />
              <div>
                <span className="eyebrow">CONEXÃO GOOGLE ADS</span>
                <h3>
                  {configured
                    ? "Conta identificada no painel"
                    : "Conecte o cliente ao MCC da AUDE"}
                </h3>
                <p>
                  {configured
                    ? "Os IDs foram salvos. O próximo passo é concluir o vínculo no Google Ads e liberar as credenciais da API."
                    : "O cliente aceita a solicitação em sua própria conta, sem compartilhar usuário ou senha."}
                </p>
              </div>
            </div>
            <SetupStatus configuration={configuration} />
            {error && <p className="ppc-inline-error">{error}</p>}
          </article>

          <div className="ppc-toolbar">
            <div>
              <span className="eyebrow">PERFORMANCE</span>
              <h3>Resumo da conta</h3>
            </div>
            <label>
              Período
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
            </label>
          </div>

          <section className="ppc-metrics" aria-label="Principais indicadores">
            {[
              ["Investimento", "R$ —", "Total aplicado"],
              ["Impressões", "—", "Anúncios exibidos"],
              ["Cliques", "—", "Interações com anúncios"],
              ["Conversões", "—", "Resultados atribuídos"],
              ["CPA", "R$ —", "Custo por aquisição"],
              ["ROAS", "—", "Retorno sobre investimento"],
            ].map(([label, value, meta]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{meta}</small>
              </article>
            ))}
          </section>

          <div className="ppc-performance-grid">
            <article className="panel ppc-chart-panel">
              <div className="ppc-panel-head">
                <div>
                  <h3>Investimento × conversões</h3>
                  <p>Evolução diária no período selecionado.</p>
                </div>
                <span>Dados da API</span>
              </div>
              <div className="ppc-chart-empty">
                <div className="ppc-chart-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span>↗</span>
                <strong>Aguardando a primeira sincronização</strong>
                <p>
                  O gráfico será preenchido apenas com dados reais da conta
                  Google Ads vinculada a {client.name}.
                </p>
              </div>
            </article>

            <article className="panel ppc-assistant-card">
              <div className="ppc-ai-mark" aria-hidden="true">✦</div>
              <span className="eyebrow">LEITURA ASSISTIDA</span>
              <h3>Inteligência em preparação</h3>
              <p>
                Futuramente, a análise cruzará os indicadores para destacar
                variações, riscos e oportunidades com contexto.
              </p>
              <ul>
                <li>Alertas de desempenho e orçamento</li>
                <li>Leitura de tendências e anomalias</li>
                <li>Recomendações explicadas, sem alterações automáticas</li>
              </ul>
              <small>A inteligência irá analisar; a decisão continua humana.</small>
            </article>
          </div>

          <article className="panel ppc-campaigns">
            <div className="ppc-panel-head">
              <div>
                <h3>Campanhas</h3>
                <p>Comparativo de eficiência por campanha.</p>
              </div>
              <button disabled>Exportar relatório</button>
            </div>
            <div className="ppc-table-wrap">
              <div className="ppc-table-head">
                <span>Campanha</span>
                <span>Status</span>
                <span>Investimento</span>
                <span>Impressões</span>
                <span>Cliques</span>
                <span>Conversões</span>
                <span>CPA</span>
                <span>ROAS</span>
              </div>
              <div className="ppc-table-empty">
                <GoogleAdsMark />
                <strong>Nenhuma campanha importada</strong>
                <span>
                  As campanhas aparecerão aqui depois da conexão com a API.
                </span>
              </div>
            </div>
          </article>

          <section className="ppc-data-ecosystem">
            <div className="ppc-section-heading">
              <div>
                <span className="eyebrow">ECOSSISTEMA GOOGLE</span>
                <h3>Fontes complementares planejadas</h3>
                <p>
                  Uma visão integrada para interpretar mídia, presença local,
                  busca, comportamento e mensuração.
                </p>
              </div>
              <span className="read-only-pill">Visão, não operação</span>
            </div>
            <div className="ppc-source-grid">
              {futureSources.map((source) => (
                <article key={source.title}>
                  <i>{source.mark}</i>
                  <div>
                    <strong>{source.title}</strong>
                    <span>{source.subtitle}</span>
                    <p>{source.detail}</p>
                  </div>
                  <b>Planejado</b>
                </article>
              ))}
            </div>
            <div className="ppc-readonly-notice">
              <span aria-hidden="true">▣</span>
              <p>
                <strong>Integrações complementares em modo somente leitura.</strong>
                Nenhuma campanha, tag, propriedade ou perfil será criado ou
                alterado por esta área do painel.
              </p>
            </div>
          </section>
        </>
      )}

      {showSetup && (
        <SetupModal
          client={client}
          configuration={configuration}
          close={() => setShowSetup(false)}
          onSaved={setConfiguration}
        />
      )}
    </section>
  );
}
