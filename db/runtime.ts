const seedClients = [
  {
    id: "lima-ferreira",
    name: "Lima Ferreira Advogados",
    initials: "LF",
    services: ["Social media", "Tráfego", "Site"],
    contractType: "fixed",
    value: 1300,
    color: "#102d61",
  },
  {
    id: "kmon",
    name: "KMON",
    initials: "KM",
    services: ["Social media", "Tráfego", "Site"],
    contractType: "fixed",
    value: 1500,
    color: "#0f766e",
  },
  {
    id: "projeto-endorfina",
    name: "Projeto Endorfina",
    initials: "EN",
    services: ["Social media", "Tráfego", "Site", "Sistemas", "Lançamento"],
    contractType: "percentage",
    value: 20,
    color: "#5a7b19",
  },
  {
    id: "ires-trafego",
    name: "Ires Tráfego",
    initials: "IR",
    services: ["Site", "Lançamento"],
    contractType: "percentage",
    value: 20,
    color: "#7c3aed",
  },
] as const;

export async function getD1() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error("O banco de dados da AUDE ainda não está conectado.");
  }
  return env.DB;
}

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return getD1();

  const db = await getD1();
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        services TEXT NOT NULL DEFAULT '[]',
        contract_type TEXT NOT NULL,
        value INTEGER NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'confirm',
        color TEXT NOT NULL DEFAULT '#4866ed',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        contact TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        stage TEXT NOT NULL DEFAULT 'prospect',
        meeting_status TEXT,
        meeting_date TEXT,
        estimated_value INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY,
        prospecting INTEGER,
        meetings INTEGER,
        closed_clients INTEGER,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        format TEXT NOT NULL DEFAULT 'feed',
        channels TEXT NOT NULL DEFAULT '["instagram"]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS opportunities_stage_idx ON opportunities(stage)"),
    db.prepare("CREATE INDEX IF NOT EXISTS social_posts_client_date_idx ON social_posts(client_id, scheduled_at)"),
    db.prepare("INSERT OR IGNORE INTO goals (id) VALUES (1)"),
  ]);

  for (const client of seedClients) {
    await db
      .prepare(`
        INSERT OR IGNORE INTO clients
          (id, name, initials, services, contract_type, value, payment_status, color, active)
        VALUES (?, ?, ?, ?, ?, ?, 'confirm', ?, 1)
      `)
      .bind(
        client.id,
        client.name,
        client.initials,
        JSON.stringify(client.services),
        client.contractType,
        client.value,
        client.color,
      )
      .run();
  }

  initialized = true;
  return db;
}
