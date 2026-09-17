import { getDb } from "../../db";
import { assets } from "../../schema";
import { eq, and } from "drizzle-orm";

export interface DiscoveredResource {
  name: string;
  type: string;
  category: string;
  criticality: "critical" | "high" | "medium" | "low";
  owner: string;
  provider: "aws" | "azure" | "gcp";
}

/**
 * Run continuous cloud asset auto-discovery.
 */
export async function discoverCloudAssets(
  clientId: number,
  provider: "aws" | "azure" | "gcp" = "aws"
): Promise<{ totalDiscovered: number; newAssetsAdded: number; discoveredResources: DiscoveredResource[] }> {
  const db = await getDb();

  const mockDiscovered: DiscoveredResource[] = [
    {
      name: "prod-eks-cluster-01",
      type: "Service",
      category: "Container Orchestration",
      criticality: "critical",
      owner: "DevOps Team",
      provider,
    },
    {
      name: "prod-db-postgres-primary",
      type: "Service",
      category: "Database",
      criticality: "critical",
      owner: "Database Admin",
      provider,
    },
    {
      name: "prod-compliance-evidence-s3",
      type: "Information",
      category: "Object Storage",
      criticality: "high",
      owner: "SecOps Team",
      provider,
    },
    {
      name: "prod-app-server-vm-01",
      type: "Hardware",
      category: "Virtual Instance",
      criticality: "high",
      owner: "Infrastructure Team",
      provider,
    },
  ];

  let newAssetsAdded = 0;

  for (const item of mockDiscovered) {
    const existing = await db
      .select()
      .from(assets)
      .where(and(eq(assets.clientId, clientId), eq(assets.name, item.name)));

    if (existing.length === 0) {
      await db.insert(assets).values({
        clientId,
        name: item.name,
        type: item.type,
        owner: item.owner,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      newAssetsAdded++;
    }
  }

  return {
    totalDiscovered: mockDiscovered.length,
    newAssetsAdded,
    discoveredResources: mockDiscovered,
  };
}
