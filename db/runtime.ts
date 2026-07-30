import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let initialized = false;
let initialization: Promise<void> | null = null;
let sqlClient: NeonQueryFunction<false, false> | null = null;

function postgresSql(sql: string) {
  let parameter = 0;
  return sql.replace(/\?/g, () => `$${++parameter}`);
}

class PreparedQuery {
  private parameters: unknown[] = [];

  constructor(
    private readonly sql: NeonQueryFunction<false, false>,
    private readonly statement: string,
  ) {}

  bind(...parameters: unknown[]) {
    this.parameters = parameters;
    return this;
  }

  async first<T>() {
    const rows = await this.sql.query(
      postgresSql(this.statement),
      this.parameters,
    );
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T>() {
    const rows = await this.sql.query(
      postgresSql(this.statement),
      this.parameters,
    );
    return { results: rows as T[] };
  }

  async run() {
    await this.sql.query(postgresSql(this.statement), this.parameters);
    return { success: true };
  }
}

class ConnectorDatabase {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  prepare(statement: string) {
    return new PreparedQuery(this.sql, statement);
  }

  async batch(statements: PreparedQuery[]) {
    for (const statement of statements) await statement.run();
  }
}

export async function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("O banco do portal de conexão não está configurado.");
  }
  sqlClient ??= neon(databaseUrl);

  if (!initialized) {
    initialization ??= (async () => {
      await sqlClient!.query(`
        CREATE TABLE IF NOT EXISTS invitations (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          client_id TEXT NOT NULL,
          client_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          connected_at TIMESTAMPTZ
        )
      `);
      await sqlClient!.query(`
        CREATE TABLE IF NOT EXISTS oauth_states (
          state TEXT PRIMARY KEY,
          invitation_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
        )
      `);
      await sqlClient!.query(`
        CREATE TABLE IF NOT EXISTS instagram_connections (
          client_id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          instagram_user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          account_name TEXT,
          account_type TEXT,
          profile_picture_url TEXT,
          access_token_encrypted TEXT NOT NULL,
          token_expires_at TIMESTAMPTZ,
          followers_count INTEGER NOT NULL DEFAULT 0,
          media_count INTEGER NOT NULL DEFAULT 0,
          connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await sqlClient!.query(`
        CREATE TABLE IF NOT EXISTS instagram_insights_cache (
          client_id TEXT NOT NULL,
          period_days INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (client_id, period_days)
        )
      `);
      await sqlClient!.query(
        "CREATE INDEX IF NOT EXISTS invitations_client_status_idx ON invitations(client_id, status)",
      );
      await sqlClient!.query(
        "CREATE INDEX IF NOT EXISTS invitations_expires_idx ON invitations(expires_at)",
      );
      await sqlClient!.query(
        "CREATE INDEX IF NOT EXISTS oauth_states_created_idx ON oauth_states(created_at)",
      );
      await sqlClient!.query(
        "CREATE INDEX IF NOT EXISTS instagram_insights_cache_fetched_idx ON instagram_insights_cache(fetched_at)",
      );
      initialized = true;
    })();
    await initialization;
  }

  return new ConnectorDatabase(sqlClient);
}
