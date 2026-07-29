type ConnectorEnvironment = {
  DB?: D1Database;
};

let initialized = false;

export async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  const { DB } = env as unknown as ConnectorEnvironment;
  if (!DB) throw new Error("O banco do portal de conexão não está disponível.");

  if (!initialized) {
    await DB.batch([
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS invitations (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          client_id TEXT NOT NULL,
          client_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          connected_at TEXT
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS oauth_states (
          state TEXT PRIMARY KEY,
          invitation_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
        )
      `),
      DB.prepare(`
        CREATE TABLE IF NOT EXISTS instagram_connections (
          client_id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          instagram_user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          account_name TEXT,
          account_type TEXT,
          profile_picture_url TEXT,
          access_token_encrypted TEXT NOT NULL,
          token_expires_at TEXT,
          followers_count INTEGER NOT NULL DEFAULT 0,
          media_count INTEGER NOT NULL DEFAULT 0,
          connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      DB.prepare(
        "CREATE INDEX IF NOT EXISTS invitations_client_status_idx ON invitations(client_id, status)",
      ),
      DB.prepare(
        "CREATE INDEX IF NOT EXISTS invitations_expires_idx ON invitations(expires_at)",
      ),
      DB.prepare(
        "CREATE INDEX IF NOT EXISTS oauth_states_created_idx ON oauth_states(created_at)",
      ),
    ]);
    initialized = true;
  }

  return DB;
}
