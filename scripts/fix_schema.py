
import os

SCHEMA_PATH = r"d:\OneDrive - Intellfence\WebDev\ComplianceOS\schema.ts"
MARKER = "export type InsertApprovalSignature = typeof approvalSignatures.$inferInsert;"

NEW_CONTENT = """

// ==========================================
// ROADMAP REPORTS
// ==========================================

export const roadmapReports = pgTable("roadmap_reports", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id"),
  clientId: integer("client_id").notNull(),
  
  title: varchar("title", { length: 500 }).notNull(),
  version: varchar("version", { length: 50 }).default("draft"),
  
  includedSections: jsonb("included_sections"),
  dataSources: jsonb("data_sources"),
  branding: jsonb("branding"),
  
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: integer("generated_by"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    clientIdx: index("idx_rr_client").on(table.clientId),
    roadmapIdx: index("idx_rr_roadmap").on(table.roadmapId),
    generatedByIdx: index("idx_rr_generated_by").on(table.generatedBy),
  };
});

export type RoadmapReport = typeof roadmapReports.$inferSelect;
export type InsertRoadmapReport = typeof roadmapReports.$inferInsert;
"""

try:
    with open(SCHEMA_PATH, 'rb') as f:
        content = f.read().decode('utf-8', errors='ignore')

    if MARKER not in content:
        print(f"Error: Marker string not found in {SCHEMA_PATH}")
        exit(1)

    # Find the end of the marker
    end_index = content.find(MARKER) + len(MARKER)
    
    # Keep everything up to the marker
    clean_content = content[:end_index]
    
    # Append new content
    final_content = clean_content + NEW_CONTENT
    
    # Write back
    with open(SCHEMA_PATH, 'w', encoding='utf-8') as f:
        f.write(final_content)
        
    print("Successfully repaired schema.ts")
    
except Exception as e:
    print(f"Failed to repair schema: {e}")
    exit(1)
