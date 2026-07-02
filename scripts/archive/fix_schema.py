
import os

schema_path = 'd:/OneDrive - Intellfence/WebDev/ComplianceOS/schema.ts'
new_tables_path = 'd:/OneDrive - Intellfence/WebDev/ComplianceOS/schema.ts.new_tables.ts'

# Read clean content (first 1668 lines)
with open(schema_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

clean_lines = lines[:1668]

# New tables content
new_tables = """
export const vendorScans = pgTable("vendor_scans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  
  scanDate: timestamp("scan_date").defaultNow(),
  status: varchar("status", { length: 50 }).default("Completed"), // In Progress, Completed, Failed
  
  riskScore: integer("risk_score"), // 0-100 calculated risk
  vulnerabilityCount: integer("vulnerability_count").default(0),
  breachCount: integer("breach_count").default(0),
  
  rawResult: text("raw_result"), // JSON string of full results if needed

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    vendorScanIdx: index("idx_scan_vendor").on(table.vendorId),
  };
});

export type VendorScan = typeof vendorScans.$inferSelect;
export type InsertVendorScan = typeof vendorScans.$inferInsert;

export const vendorCveMatches = pgTable("vendor_cve_matches", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  cveId: varchar("cve_id", { length: 50 }).notNull(),
  
  matchScore: integer("match_score"),
  matchReason: text("match_reason"), 
  
  status: varchar("status", { length: 50 }).default("Active"), // Active, Ignored, Remediated
  
  discoveredAt: timestamp("discovered_at").defaultNow(),
}, (table) => {
  return {
    vendorCveIdx: index("idx_vendor_cve").on(table.vendorId),
    cveIdIdx: index("idx_vendor_cve_id").on(table.cveId),
  };
});

export type VendorCveMatch = typeof vendorCveMatches.$inferSelect;
export type InsertVendorCveMatch = typeof vendorCveMatches.$inferInsert;

export const vendorBreaches = pgTable("vendor_breaches", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  breachDate: timestamp("breach_date"),
  severity: varchar("severity", { length: 50 }), // High, Medium, Low
  
  source: varchar("source", { length: 255 }), // e.g., "HaveIBeenPwned", "DarkWeb"
  
  status: varchar("status", { length: 50 }).default("Active"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    vendorBreachIdx: index("idx_breach_vendor").on(table.vendorId),
  };
});

export type VendorBreach = typeof vendorBreaches.$inferSelect;
export type InsertVendorBreach = typeof vendorBreaches.$inferInsert;
"""

# Write back
with open(schema_path, 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)
    f.write(new_tables)

print("schema.ts repaired successfully.")
