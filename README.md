# AUDE OS

Sistema Operacional para Operação Digital. O cliente não opera a plataforma; quem opera são os Guardiões da AUDE.

> Existimos para que empresários tenham com quem contar.

## MVP 0.1 — escopo

1. Cadastrar cliente
2. Convidar cliente (e-mail via Resend)
3. Login Google (Supabase Auth)
4. Conectar Search Console (OAuth incremental)
5. Conectar GA4 (OAuth incremental)
6. Salvar propriedades conectadas
7. Status das conexões (conectado / expirado / erro / não conectado)
8. **Card de resumo real** — sessões 7d (GA4), cliques 7d (Search Console), principal página/consulta, gravado em `snapshot`
9. Workspace por cliente com abas futuras já estruturadas
10. Schema-only para fases futuras: `agencia`, `contrato`, `fatura`, `setor`, `squad`, `tarefa`, `historico`

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4
- Supabase (Postgres + Auth + RLS por workspace)
- Vercel (Hobby para dev; Pro quando houver uso comercial)
- Google OAuth + Search Console API + Analytics Data API
- Resend (convite)
- Fase 2: Metricool (plano Free → Advanced) · Fase 6: Ruflo como serviço externo

## Arquitetura

- **Dois OAuth separados**: login (Supabase Auth, scopes básicos) e conexão de dados (OAuth próprio com `access_type=offline`, refresh token cifrado AES-256-GCM em `conexao.credencial_cifrada`).
- **Adapters** (`src/lib/adapters/`): interface `ConexaoAdapter { listarPropriedades, buscarSnapshot, revoke }`. Implementações: Google Search Console, GA4, Metricool (stub Fase 2). Troca de fornecedor isolada nessa camada.
- **Snapshot**: uma tabela, três usos — card do MVP, `cliente.status` calculado (Fase 4), elo `tarefa` ↔ resultado (Fase 4).
- **RLS**: staff (administrador/guardião) opera; cliente só lê o próprio workspace. Coluna `credencial_cifrada` sem grant para `authenticated` — só service role lê.
- **Papéis automáticos**: trigger em `auth.users` — 1º usuário = administrador; e-mail convidado = cliente (vinculado ao workspace); demais = guardião.

## Setup

### 1. Supabase

1. Criar projeto em [supabase.com](https://supabase.com).
2. SQL Editor → rodar `supabase/migrations/0001_init.sql`.
3. Authentication → Providers → Google: ativar (Client ID/Secret do passo 2 abaixo servem).
4. Authentication → URL Configuration: adicionar `http://localhost:3000/auth/callback` e a URL de produção.

### 2. Google Cloud

1. Criar projeto em [console.cloud.google.com](https://console.cloud.google.com).
2. Ativar APIs: **Search Console API**, **Google Analytics Data API**, **Google Analytics Admin API**.
3. OAuth consent screen: tipo External, adicionar scopes `webmasters.readonly` e `analytics.readonly`.
4. Credentials → OAuth 2.0 Client ID (Web application):
   - Redirect URIs: `https://SEU-PROJETO.supabase.co/auth/v1/callback` (login) **e** `{SITE_URL}/api/google/callback` (conexões).

### 3. Resend

1. Criar API key em [resend.com](https://resend.com), verificar domínio de envio.

### 4. App

```bash
cp .env.example .env.local   # preencher tudo
openssl rand -hex 32          # → TOKEN_ENCRYPTION_KEY
npm install
npm run dev
```

Primeiro login com Google = vira **administrador** automaticamente.

### 5. Deploy (Vercel)

- Importar o repo, setar as env vars (mesmas do `.env.local`, com `NEXT_PUBLIC_SITE_URL` de produção).
- Adicionar o redirect URI de produção no Google Cloud e na URL Configuration do Supabase.

## Fases

| Fase | Entrega |
|---|---|
| **MVP (atual)** | Google + status de conexão + card de resumo real + schema-only |
| 2 | Metricool (Free → piloto → Advanced): status IG/LinkedIn/Meta/GMB, métricas, agendamento |
| 3 | Google Ads direto, Sites, Copy + Higgsfield, offboarding (`revoke()` + export) |
| 4 | Projetos, Relatórios (elo Tarefa↔Snapshot), Histórico, Conhecimento, financeiro, status calculado |
| 5 | n8n Cloud (alertas, relatórios periódicos) |
| 6 | Setores & orquestração multiagente (Ruflo como serviço externo via fila `tarefa`) |

## Segurança

- Chaves só em variável de ambiente — nunca em código ou commit.
- Tokens Google cifrados (AES-256-GCM) e ilegíveis para qualquer papel do app.
- RLS em todas as tabelas, sem exceção.
- LGPD: convite explícito por e-mail; export e revogação de dados previstos na Fase 3 (`revoke()` já na interface do adapter).
