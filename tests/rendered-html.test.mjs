import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the public AUDE connection portal identifiable and secure", async () => {
  const [home, layout, connectPortal, privacy, terms, dataDeletion] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../app/connect/connect-portal.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/terms/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/data-deletion/page.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(layout, /lang="pt-BR"/i);
  assert.match(layout, /https:\/\/os\.audeagencia\.com\.br/);
  assert.match(home, /Como você quer continuar/);
  assert.match(home, /Entrar no painel/);
  assert.match(home, /AUDE_DASHBOARD_URL/);
  assert.match(home, /https:\/\/painel\.audeagencia\.com\.br/);
  assert.match(home, /A senha do Instagram nunca é compartilhada/);
  assert.match(connectPortal, /Sua senha permanece somente com o Instagram/);
  assert.match(privacy, /POLÍTICA DE PRIVACIDADE/);
  assert.match(terms, /TERMOS DE USO/);
  assert.match(dataDeletion, /EXCLUSÃO DE DADOS/);
  assert.doesNotMatch(
    [home, layout, connectPortal, privacy, terms, dataDeletion].join("\n"),
    /META_APP_SECRET|TOKEN_ENCRYPTION_KEY/,
  );
});

test("keeps invitations opaque, expiring and single-use", async () => {
  const [invitationApi, invitationHelpers, cryptoHelpers, database, connectPortal] =
    await Promise.all([
      readFile(
        new URL("../app/api/internal/invitations/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/invitations.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/crypto.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/runtime.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/connect/connect-portal.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(cryptoHelpers, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(cryptoHelpers, /SHA-256/);
  assert.match(invitationApi, /48 \* 60 \* 60 \* 1000/);
  assert.match(invitationApi, /status = 'replaced'/);
  assert.match(invitationHelpers, /invitationAvailability/);
  assert.match(database, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(database, /expires_at TIMESTAMPTZ NOT NULL/);
  assert.match(database, /@neondatabase\/serverless/);
  assert.match(connectPortal, /Sua senha permanece somente com o Instagram/);
  assert.doesNotMatch(
    [invitationApi, invitationHelpers, cryptoHelpers, database].join("\n"),
    /password|senha/i,
  );
});
