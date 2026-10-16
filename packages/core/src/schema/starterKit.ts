import { pgTable, serial, varchar, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

/** Leads from the public ISO 27001 Starter Kit landing page (consent recorded per GDPR). */
export const starterKitLeads = pgTable("starter_kit_leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  company: varchar("company", { length: 160 }).notNull(),
  role: varchar("role", { length: 60 }),
  consentText: text("consent_text"),
  consentAt: timestamp("consent_at").notNull(),
  consentIp: varchar("consent_ip", { length: 64 }),
  userAgent: varchar("user_agent", { length: 300 }),
  source: varchar("source", { length: 80 }),
  utmSource: varchar("utm_source", { length: 120 }),
  utmMedium: varchar("utm_medium", { length: 120 }),
  utmCampaign: varchar("utm_campaign", { length: 120 }),
  requestCount: integer("request_count").notNull().default(1),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastRequestedAt: timestamp("last_requested_at").notNull().defaultNow(),
}, (t) => ({
  emailUq: uniqueIndex("starter_kit_leads_email_uq").on(t.email),
}));
