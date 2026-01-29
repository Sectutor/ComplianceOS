import os

file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\schema.ts'

# 1. Read file
with open(file_path, 'rb') as f:
    try:
        content = f.read().decode('utf-8')
    except UnicodeDecodeError:
        # Fallback to loose decoding to survive UTF-16 chunks if any
        content = f.read().decode('utf-8', errors='ignore')

lines = content.splitlines(keepends=True)

# 2. Truncate at line 2096 (where I added my block)
# Verify line 2095 is what I think it is (end of checklistStates or empty line)
# Line 2095 in view 1578 was empty or '}'.
# I'll look for the header I added: "// ==================== BUSINESS CONTINUITY MANAGEMENT (BCM) ===================="
cutoff = -1
for i, line in enumerate(lines):
    if "// ==================== BUSINESS CONTINUITY MANAGEMENT (BCM) ====================" in line:
        cutoff = i
        break

if cutoff != -1:
    print(f"Truncating at line {cutoff + 1}")
    lines = lines[:cutoff]
    # Remove trailing newlines
    while lines and lines[-1].strip() == "":
        lines.pop()
else:
    print("Could not find the start of appended block. Checking end...")
    # If header not found, maybe I just look for duplicate exports
    pass

# 3. Save clean file
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# 4. Search for symbols in the CLEAN file
clean_content = "".join(lines)

missing = []
for symbol in ["businessProcesses", "processDependencies", "impactAssessments", "comments", "bcApprovals", "financialImpacts", "bcpProjects", "projectTasks"]:
    if f"export const {symbol}" not in clean_content:
        missing.append(symbol)
        print(f"MISSING: {symbol}")
    else:
        print(f"FOUND: {symbol}")

# 5. Generate Append Content for TRULY missing tables
append_content = ""

if "businessProcesses" in missing:
    append_content += """
// 1. Business Processes
export const businessProcesses = pgTable("business_processes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  department: varchar("department", { length: 100 }),
  ownerId: integer("owner_id"), // User ID
  parentId: integer("parent_id"), // For sub-processes
  criticalityTier: varchar("criticality_tier", { length: 50 }), // Tier 1, Tier 2, etc.
  rto: varchar("rto", { length: 50 }),
  rpo: varchar("rpo", { length: 50 }),
  mtpd: varchar("mtpd", { length: 50 }), // Max Tolerable Period of Disruption
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    bpClientIdx: index("idx_bp_client").on(table.clientId),
  };
});
"""

if "processDependencies" in missing:
    append_content += """
// 2. Process Dependencies
export const processDependencies = pgTable("process_dependencies", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").notNull(),
  dependencyType: varchar("dependency_type", { length: 50 }).notNull(),
  dependencyName: varchar("dependency_name", { length: 255 }).notNull(),
  criticality: varchar("criticality", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pdProcessIdx: index("idx_pd_process").on(table.processId),
  };
});
"""

# impactAssessments, bcApprovals, financialImpacts are confirmed FOUND in view, so listed in missing list check is just verification.
# comments?

if "comments" in missing:
    append_content += """
// Comments (Generic)
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    commentEntityIdx: index("idx_comment_entity").on(table.clientId, table.entityType, table.entityId),
  };
});
"""

# bcpProjects vs projectTasks
# If bcpProjects is missing AND projectTasks is missing, add bcpProjects.
if "bcpProjects" in missing and "projectTasks" in missing:
    append_content += """
// BCP Projects
export const bcpProjects = pgTable("bcp_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default('pending'),
  managerId: integer("manager_id"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    bcpProjClientIdx: index("idx_bcp_proj_client").on(table.clientId),
  };
});

export type BcpProject = typeof bcpProjects.$inferSelect;
export type InsertBcpProject = typeof bcpProjects.$inferInsert;
"""

if append_content:
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write("\n// ==================== MISSING TABLES APPENDED ====================\n")
        f.write(append_content)
    print("Appended missing content.")
else:
    print("Nothing to append.")
