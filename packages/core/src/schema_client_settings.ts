// Client-specific settings for multi-tenant customization
// This enables 100+ organizations to have unique branding and feature configurations
// while maintaining a single upgradable premium version codebase
import { pgTable, serial, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const clientSettings = pgTable("client_settings", {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().unique(),
    brandingOverrides: jsonb("branding_overrides"),
    featureFlags: jsonb("feature_flags"),
    customSettings: jsonb("custom_settings"),
    version: integer("version").default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type ClientSettings = typeof clientSettings.$inferSelect;
export type InsertClientSettings = typeof clientSettings.$inferInsert;
