import { pgTable, serial, integer, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const complianceMonitorEvents = pgTable("compliance_monitor_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  controlId: integer("control_id"),
  controlName: varchar("control_name", { length: 255 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  severity: varchar("severity", { length: 50 }).default("info"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdx: index("idx_cme_client").on(table.clientId),
  severityIdx: index("idx_cme_severity").on(table.severity, table.createdAt),
}));
