import { pgTable, serial, integer, varchar, text, timestamp, jsonb, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";

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

export const controlTestRuns = pgTable("control_test_runs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  clientControlId: integer("client_control_id").notNull(),
  controlCode: varchar("control_code", { length: 50 }),
  testType: varchar("test_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'pass' | 'fail' | 'warning' | 'error'
  score: integer("score").default(100),
  message: text("message"),
  findings: jsonb("findings"), // Array of specific finding details
  executedAt: timestamp("executed_at").defaultNow(),
}, (table) => ({
  clientIdx: index("idx_ctr_client").on(table.clientId),
  controlIdx: index("idx_ctr_control").on(table.clientControlId),
  statusIdx: index("idx_ctr_status").on(table.clientId, table.status),
}));

export const clientAutoTestSchedules = pgTable("client_auto_test_schedules", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  intervalHours: integer("interval_hours").notNull().default(6),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdx: uniqueIndex("uq_client_auto_test_schedules_client").on(table.clientId),
}));
