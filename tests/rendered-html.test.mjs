import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
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
}

test("server-renders the public AUDE connection portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="pt-BR">/i);
  assert.match(html, /Conectar redes sociais \| AUDE Gestão/i);
  assert.match(html, /Portal de conexão segura/);
  assert.match(html, /A senha da sua conta nunca é compartilhada/);
  assert.match(html, /aude-conexao-segura\.png/);
  assert.doesNotMatch(html, /META_APP_SECRET|TOKEN_ENCRYPTION_KEY/);
});

test("keeps invitations opaque, expiring and single-use", async () => {
  const [invitationApi, invitationHelpers, cryptoHelpers, schema, connectPortal] =
    await Promise.all([
      readFile(
        new URL("../app/api/internal/invitations/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/invitations.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/crypto.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/connect/connect-portal.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(cryptoHelpers, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(cryptoHelpers, /SHA-256/);
  assert.match(invitationApi, /48 \* 60 \* 60 \* 1000/);
  assert.match(invitationApi, /status = 'replaced'/);
  assert.match(invitationHelpers, /invitationAvailability/);
  assert.match(schema, /tokenHash/);
  assert.match(schema, /expiresAt/);
  assert.match(connectPortal, /Sua senha permanece somente com o Instagram/);
  assert.doesNotMatch(
    [invitationApi, invitationHelpers, cryptoHelpers, schema].join("\n"),
    /password|senha/i,
  );
});
