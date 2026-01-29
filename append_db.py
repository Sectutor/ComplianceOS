
import os

file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\db.ts'

content_to_append = """
// ==================== MISSING HELPERS ADDED BY AGENT ====================

export async function getBcpProjectById(id: number) {
  const dbConn = await getDb();
  const result = await dbConn.select().from(bcpProjects).where(eq(bcpProjects.id, id));
  return result[0];
}

export async function updateBcpProject(id: number, data: any) {
  const dbConn = await getDb();
  const [updated] = await dbConn.update(bcpProjects).set(data).where(eq(bcpProjects.id, id)).returning();
  return updated;
}

export async function getBusinessProcessById(id: number) {
  const dbConn = await getDb();
  const result = await dbConn.select().from(businessProcesses).where(eq(businessProcesses.id, id));
  return result[0];
}
"""

with open(file_path, 'a', encoding='utf-8') as f:
    f.write(content_to_append)

print("Appended missing functions to db.ts")
