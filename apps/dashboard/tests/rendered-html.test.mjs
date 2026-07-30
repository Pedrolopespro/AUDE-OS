import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("requires an authenticated user before rendering the panel", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 307);
  assert.match(
    response.headers.get("location") ?? "",
    /^(?:http:\/\/localhost)?\/signin-with-chatgpt\?return_to=%2F$/,
  );
});

test("keeps client data behind memberships and role checks", async () => {
  const dashboard = await readFile(
    new URL("../app/api/dashboard/route.ts", import.meta.url),
    "utf8",
  );
  const access = await readFile(
    new URL("../lib/access.ts", import.meta.url),
    "utf8",
  );
  const clientApp = await readFile(
    new URL("../app/dashboard-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dashboard, /client_memberships/);
  assert.match(dashboard, /agencyLeader \? Number\(row\.value\) : 0/);
  assert.match(access, /requireClientView/);
  assert.match(access, /requireContentManagement/);
  assert.doesNotMatch(clientApp, /seedClients/);
});

test("stores only hashed, single-use invitation tokens", async () => {
  const invitationRoute = await readFile(
    new URL("../app/api/access/route.ts", import.meta.url),
    "utf8",
  );
  const acceptRoute = await readFile(
    new URL("../app/api/access/accept/route.ts", import.meta.url),
    "utf8",
  );
  const migration = await readFile(
    new URL("../drizzle/0003_graceful_speed_demon.sql", import.meta.url),
    "utf8",
  );

  assert.match(invitationRoute, /hashAccessToken\(rawToken\)/);
  assert.match(acceptRoute, /status = 'accepted'/);
  assert.match(migration, /access_invitations/);
  assert.match(migration, /client_memberships_user_client_unique/);
});

test("uses the private connector credential and rejects non-JSON failures", async () => {
  const connector = await readFile(
    new URL("../lib/connector.ts", import.meta.url),
    "utf8",
  );
  const socialPanel = await readFile(
    new URL("../app/social-media-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(connector, /OAI-Sites-Authorization/);
  assert.match(connector, /AbortSignal\.timeout\(8_000\)/);
  assert.match(connector, /JSON\.parse\(body\)/);
  assert.match(socialPanel, /readJsonResponse/);
  assert.doesNotMatch(socialPanel, /Unexpected token/);
});

test("protects Instagram analytics by client membership", async () => {
  const [insightsProxy, insightsPanel, socialPanel] = await Promise.all([
    readFile(
      new URL(
        "../app/api/clients/[id]/instagram/insights/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/instagram-insights-panel.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/social-media-panel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(insightsProxy, /requireClientView/);
  assert.match(insightsProxy, /AbortSignal\.timeout\(30_000\)/);
  assert.match(insightsPanel, /Últimos 30 dias/);
  assert.match(insightsPanel, /Melhores horários/);
  assert.match(insightsPanel, /Quem acompanha o perfil/);
  assert.match(insightsPanel, /Melhores publicações recentes/);
  assert.match(socialPanel, /Instagram Insights/);
  assert.doesNotMatch(insightsPanel, /access_token|META_APP_SECRET/);
});

test("keeps the PPC panel read-only and scoped to each client", async () => {
  const [ppcRoute, ppcPanel, migration] = await Promise.all([
    readFile(
      new URL("../app/api/clients/[id]/ppc/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/ppc-panel.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0004_bent_hardball.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(ppcRoute, /requireClientView/);
  assert.match(ppcRoute, /requireClientManagement/);
  assert.match(ppcRoute, /mode: "read_only"/);
  assert.match(ppcPanel, /PAINEL PPC/);
  assert.match(ppcPanel, /Somente leitura/);
  assert.match(ppcPanel, /Google Business Profile/);
  assert.match(ppcPanel, /Google Search Console/);
  assert.match(ppcPanel, /Google Analytics 4/);
  assert.match(ppcPanel, /Google Tag Manager/);
  assert.doesNotMatch(ppcPanel, /access_token|DEVELOPER_TOKEN/);
  assert.match(migration, /ppc_google_ads_accounts/);
  assert.match(migration, /ppc_google_ads_customer_id_unique/);
});
