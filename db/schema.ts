import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
