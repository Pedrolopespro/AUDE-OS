import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  clientId: text("client_id").notNull(),
  clientName: text("client_name").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  connectedAt: text("connected_at"),
});

export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  invitationId: text("invitation_id")
    .notNull()
    .references(() => invitations.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const instagramConnections = sqliteTable("instagram_connections", {
  clientId: text("client_id").primaryKey(),
  clientName: text("client_name").notNull(),
  instagramUserId: text("instagram_user_id").notNull(),
  username: text("username").notNull(),
  accountName: text("account_name"),
  accountType: text("account_type"),
  profilePictureUrl: text("profile_picture_url"),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  tokenExpiresAt: text("token_expires_at"),
  followersCount: integer("followers_count").notNull().default(0),
  mediaCount: integer("media_count").notNull().default(0),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
