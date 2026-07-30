import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  services: text("services").notNull().default("[]"),
  contractType: text("contract_type").notNull(),
  value: integer("value").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("confirm"),
  color: text("color").notNull().default("#4866ed"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  contact: text("contact").notNull().default(""),
  phone: text("phone").notNull().default(""),
  stage: text("stage").notNull().default("prospect"),
  meetingStatus: text("meeting_status"),
  meetingDate: text("meeting_date"),
  estimatedValue: integer("estimated_value"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey(),
  prospecting: integer("prospecting"),
  meetings: integer("meetings"),
  closedClients: integer("closed_clients"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  caption: text("caption").notNull().default(""),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("draft"),
  format: text("format").notNull().default("feed"),
  channels: text("channels").notNull().default('["instagram"]'),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const instagramConnections = sqliteTable("instagram_connections", {
  clientId: text("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
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

export const metaOauthStates = sqliteTable("meta_oauth_states", {
  state: text("state").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appUsers = sqliteTable("app_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("client"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at"),
});

export const clientMemberships = sqliteTable(
  "client_memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("client_memberships_user_client_unique").on(
      table.userId,
      table.clientId,
    ),
  ],
);

export const accessInvitations = sqliteTable("access_invitations", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "cascade",
  }),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  invitedBy: text("invited_by").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  acceptedAt: text("accepted_at"),
});

export const agencySettings = sqliteTable("agency_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ppcGoogleAdsAccounts = sqliteTable(
  "ppc_google_ads_accounts",
  {
    clientId: text("client_id")
      .primaryKey()
      .references(() => clients.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    accountName: text("account_name"),
    status: text("status").notNull().default("pending_link"),
    currencyCode: text("currency_code"),
    timeZone: text("time_zone"),
    linkedAt: text("linked_at"),
    lastSyncedAt: text("last_synced_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ppc_google_ads_customer_id_unique").on(table.customerId),
  ],
);
