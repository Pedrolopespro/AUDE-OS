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
