import { pgTable, serial, integer, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const auditorSessions = pgTable("auditor_sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  scope: varchar("scope", { length: 100 }).default("all"),
  auditorEmail: varchar("auditor_email", { length: 255 }),
  auditorName: varchar("auditor_name", { length: 255 }),
  createdById: integer("created_by_id"),
  lastAccessedAt: timestamp("last_accessed_at"),
  isRevoked: boolean("is_revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("idx_auditor_token").on(table.token),
  clientIdx: index("idx_auditor_client").on(table.clientId),
}));

export const auditorComments = pgTable("auditor_comments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  controlId: integer("control_id"),
  evidenceId: integer("evidence_id"),
  comment: text("comment").notNull(),
  authorName: varchar("author_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditorSession = typeof auditorSessions.$inferSelect;
export type InsertAuditorSession = typeof auditorSessions.$inferInsert;
export type AuditorComment = typeof auditorComments.$inferSelect;
export type InsertAuditorComment = typeof auditorComments.$inferInsert;
