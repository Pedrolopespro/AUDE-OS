# AUDE OS

Repositório principal do sistema operacional da AUDE.

## Aplicações

- **Conector público do Instagram (raiz):** aplicação Next.js publicada pela
  Vercel em `https://os.audeagencia.com.br`. Recebe a autorização do cliente sem
  que a agência precise conhecer ou armazenar sua senha.
- **Painel de gestão (`apps/dashboard`):** painel interno com clientes,
  comercial, financeiro, Social Media, calendário editorial, convites e
  acompanhamento das conexões.

O conector permanece na raiz para preservar a configuração atual da Vercel. O
painel fica versionado como uma aplicação independente e mantém seu próprio
processo de publicação.

## Conector do Instagram

Portal público usado pela AUDE para enviar convites individuais aos clientes e
conectar contas profissionais do Instagram sem receber ou armazenar senhas.

## Fluxo

1. O painel interno cria um convite autenticado por `CONNECTOR_SHARED_SECRET`.
2. O cliente abre o link individual, válido por 48 horas e de uso único.
3. O cliente autoriza o aplicativo no ambiente oficial da Meta.
4. O conector troca o código por um token, criptografa-o com AES-256-GCM e salva
   a conexão no Postgres.
5. O painel consulta métricas e sincroniza a conta usando a API interna.

## Stack

- Next.js 16
- Vercel
- Neon Postgres (`@neondatabase/serverless`)
- Instagram API with Instagram Login

## Variáveis de ambiente

Copie `.env.example` para `.env.local` durante o desenvolvimento:

- `DATABASE_URL`: conexão Postgres fornecida pelo Neon.
- `META_APP_ID`: ID do aplicativo da Meta.
- `META_APP_SECRET`: segredo do aplicativo da Meta.
- `TOKEN_ENCRYPTION_KEY`: chave de 32 bytes em Base64 para proteger tokens.
- `CONNECTOR_SHARED_SECRET`: segredo compartilhado com o painel AUDE.
- `AUDE_DASHBOARD_URL`: URL do painel interno.
- `APP_BASE_URL`: URL pública canônica (`https://os.audeagencia.com.br`).

Gere os dois segredos internos com:

```bash
openssl rand -base64 32
```

## Desenvolvimento e validação

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

As tabelas e índices são criados de maneira idempotente na primeira chamada que
usa o banco.

## URLs para configurar na Meta

- Redirecionamento OAuth:
  `https://os.audeagencia.com.br/api/meta/instagram/callback`
- Desautorização:
  `https://os.audeagencia.com.br/api/meta/instagram/deauthorize`
- Exclusão de dados:
  `https://os.audeagencia.com.br/api/meta/instagram/data-deletion`
- Política de privacidade:
  `https://os.audeagencia.com.br/privacy`
