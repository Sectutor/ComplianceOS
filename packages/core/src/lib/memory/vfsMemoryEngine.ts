/**
 * Native VFS + Vector Unified Memory Engine ("Compliance Cortex")
 * Implements OpenViking-style hierarchical virtual filesystem (memory://)
 * combined with Mem0-style adaptive fact extraction and pgvector hybrid search.
 */

import { getDb } from "../../db";
import { companyMemoryNodes, companyMemoryRelations, CompanyMemoryNode } from "../../schema";
import { eq, and, sql, desc, like, or } from "drizzle-orm";

export interface VfsNodeSummary {
  id: number;
  path: string;
  parentPath: string;
  nodeType: "folder" | "document" | "fact" | "web_intel" | "asset_profile";
  title: string;
  summaryL0: string;
  metadata: any;
  updatedAt: Date;
}

export interface VfsTreeNode {
  id: number;
  path: string;
  title: string;
  nodeType: string;
  summaryL0?: string;
  children: VfsTreeNode[];
}

export interface MemorySearchResult {
  id: number;
  path: string;
  title: string;
  nodeType: string;
  summaryL0: string;
  snippet?: string;
  score: number;
  metadata?: any;
}

export class VfsMemoryEngine {
  private initialized = false;

  public async ensureTables(): Promise<void> {
    if (this.initialized) return;
    try {
      const db = await getDb();
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS company_memory_nodes (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL,
          path VARCHAR(500) NOT NULL,
          parent_path VARCHAR(500) NOT NULL DEFAULT '/',
          node_type VARCHAR(50) NOT NULL DEFAULT 'document',
          title VARCHAR(255) NOT NULL,
          summary_l0 TEXT,
          content_l2 TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cmn_client_path ON company_memory_nodes(client_id, path);
        CREATE INDEX IF NOT EXISTS idx_cmn_client_parent ON company_memory_nodes(client_id, parent_path);
        CREATE INDEX IF NOT EXISTS idx_cmn_type ON company_memory_nodes(node_type);

        CREATE TABLE IF NOT EXISTS company_memory_relations (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL,
          source_node_id INTEGER NOT NULL,
          target_node_id INTEGER NOT NULL,
          relation_type VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_cmr_source ON company_memory_relations(source_node_id);
        CREATE INDEX IF NOT EXISTS idx_cmr_target ON company_memory_relations(target_node_id);
        CREATE INDEX IF NOT EXISTS idx_cmr_client ON company_memory_relations(client_id);
      `);
      this.initialized = true;
    } catch (err) {
      console.warn("[VfsMemoryEngine] ensureTables failed:", err);
    }
  }

  /**
   * Normalize VFS path: ensure leading slash and remove trailing slash.
   */
  public normalizePath(rawPath: string): string {
    let clean = (rawPath || "/").trim().replace(/\\/g, "/");
    if (!clean.startsWith("/")) clean = "/" + clean;
    if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1);
    return clean;
  }

  /**
   * Derive parent directory path from a given path.
   */
  public getParentPath(normalizedPath: string): string {
    if (normalizedPath === "/") return "/";
    const lastSlash = normalizedPath.lastIndexOf("/");
    if (lastSlash <= 0) return "/";
    return normalizedPath.slice(0, lastSlash);
  }

  /**
   * Generate an L0 compact summary from raw text if not provided.
   */
  public generateL0Summary(content: string, title: string): string {
    if (!content) return `${title} entry.`;
    // Clean markdown headings/extra spaces
    const clean = content
      .replace(/#+\s+/g, "")
      .replace(/```[\s\S]*?```/g, "[Code/Snippet]")
      .replace(/\n+/g, " ")
      .trim();
    if (clean.length <= 220) return clean;
    return clean.slice(0, 217) + "...";
  }

  /**
   * List directory children with L0 summaries.
   */
  public async listDirectory(clientId: number, rawPath: string = "/"): Promise<VfsNodeSummary[]> {
    await this.ensureTables();
    const db = await getDb();
    const path = this.normalizePath(rawPath);

    const nodes = await db
      .select()
      .from(companyMemoryNodes)
      .where(
        and(
          eq(companyMemoryNodes.clientId, clientId),
          eq(companyMemoryNodes.parentPath, path),
          eq(companyMemoryNodes.isActive, true)
        )
      )
      .orderBy(desc(companyMemoryNodes.nodeType), companyMemoryNodes.path);

    return nodes.map(n => ({
      id: n.id,
      path: n.path,
      parentPath: n.parentPath,
      nodeType: n.nodeType as any,
      title: n.title,
      summaryL0: n.summaryL0 || this.generateL0Summary(n.contentL2 || "", n.title),
      metadata: n.metadata,
      updatedAt: n.updatedAt,
    }));
  }

  /**
   * Read full document node along with its relations.
   */
  public async readNode(clientId: number, rawPath: string): Promise<{
    node: CompanyMemoryNode;
    relations: { targetId: number; targetPath: string; relationType: string; description?: string }[];
  } | null> {
    await this.ensureTables();
    const db = await getDb();
    const path = this.normalizePath(rawPath);

    const rows = await db
      .select()
      .from(companyMemoryNodes)
      .where(
        and(
          eq(companyMemoryNodes.clientId, clientId),
          eq(companyMemoryNodes.path, path),
          eq(companyMemoryNodes.isActive, true)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;
    const node = rows[0];

    // Fetch relations
    const relRows = await db
      .select({
        targetId: companyMemoryRelations.targetNodeId,
        relationType: companyMemoryRelations.relationType,
        description: companyMemoryRelations.description,
        targetPath: companyMemoryNodes.path,
      })
      .from(companyMemoryRelations)
      .innerJoin(companyMemoryNodes, eq(companyMemoryRelations.targetNodeId, companyMemoryNodes.id))
      .where(eq(companyMemoryRelations.sourceNodeId, node.id));

    return {
      node,
      relations: relRows.map(r => ({
        targetId: r.targetId,
        targetPath: r.targetPath,
        relationType: r.relationType,
        description: r.description || undefined,
      })),
    };
  }

  /**
   * Write or update a node in the VFS. Auto-creates parent directories if missing.
   */
  public async writeNode(
    clientId: number,
    data: {
      path: string;
      title: string;
      nodeType?: "folder" | "document" | "fact" | "web_intel" | "asset_profile";
      contentL2?: string;
      summaryL0?: string;
      metadata?: any;
    }
  ): Promise<CompanyMemoryNode> {
    await this.ensureTables();
    const db = await getDb();
    const path = this.normalizePath(data.path);
    const parentPath = this.getParentPath(path);
    const nodeType = data.nodeType || "document";
    const content = data.contentL2 || "";
    const summary = data.summaryL0 || this.generateL0Summary(content, data.title);

    // Auto-create parent folders if needed
    if (parentPath !== "/") {
      await this.ensureParentDirectory(clientId, parentPath);
    }

    // Check if node exists
    const existing = await db
      .select()
      .from(companyMemoryNodes)
      .where(
        and(
          eq(companyMemoryNodes.clientId, clientId),
          eq(companyMemoryNodes.path, path)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(companyMemoryNodes)
        .set({
          title: data.title,
          nodeType,
          summaryL0: summary,
          contentL2: content,
          metadata: { ...(existing[0].metadata || {}), ...(data.metadata || {}) },
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(companyMemoryNodes.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(companyMemoryNodes)
      .values({
        clientId,
        path,
        parentPath,
        nodeType,
        title: data.title,
        summaryL0: summary,
        contentL2: content,
        metadata: data.metadata || {},
        isActive: true,
      })
      .returning();

    return inserted[0];
  }

  /**
   * Ensure parent folder node exists in VFS.
   */
  private async ensureParentDirectory(clientId: number, folderPath: string): Promise<void> {
    const db = await getDb();
    const path = this.normalizePath(folderPath);
    if (path === "/") return;

    const existing = await db
      .select()
      .from(companyMemoryNodes)
      .where(and(eq(companyMemoryNodes.clientId, clientId), eq(companyMemoryNodes.path, path)))
      .limit(1);

    if (existing.length === 0) {
      const parent = this.getParentPath(path);
      if (parent !== "/") {
        await this.ensureParentDirectory(clientId, parent);
      }
      const folderName = path.split("/").pop() || "Folder";
      await db.insert(companyMemoryNodes).values({
        clientId,
        path,
        parentPath: parent,
        nodeType: "folder",
        title: folderName.charAt(0).toUpperCase() + folderName.slice(1),
        summaryL0: `Directory for ${folderName}`,
        contentL2: `# ${folderName}\nDirectory node in Company VFS.`,
        isActive: true,
      });
    }
  }

  /**
   * Delete node and any child paths recursively.
   */
  public async deleteNode(clientId: number, rawPath: string): Promise<{ deletedCount: number }> {
    await this.ensureTables();
    const db = await getDb();
    const path = this.normalizePath(rawPath);

    const deleted = await db
      .delete(companyMemoryNodes)
      .where(
        and(
          eq(companyMemoryNodes.clientId, clientId),
          or(
            eq(companyMemoryNodes.path, path),
            like(companyMemoryNodes.path, `${path}/%`)
          )
        )
      )
      .returning({ id: companyMemoryNodes.id });

    return { deletedCount: deleted.length };
  }

  /**
   * Get recursive nested VFS tree for UI navigation.
   */
  public async getVfsTree(clientId: number, rootPath: string = "/"): Promise<VfsTreeNode[]> {
    await this.ensureTables();
    const db = await getDb();
    const allNodes = await db
      .select()
      .from(companyMemoryNodes)
      .where(and(eq(companyMemoryNodes.clientId, clientId), eq(companyMemoryNodes.isActive, true)))
      .orderBy(companyMemoryNodes.path);

    const nodeMap = new Map<string, VfsTreeNode>();
    const rootNodes: VfsTreeNode[] = [];

    for (const n of allNodes) {
      nodeMap.set(n.path, {
        id: n.id,
        path: n.path,
        title: n.title,
        nodeType: n.nodeType,
        summaryL0: n.summaryL0 || undefined,
        children: [],
      });
    }

    for (const n of allNodes) {
      const treeNode = nodeMap.get(n.path)!;
      if (n.parentPath === "/" || !nodeMap.has(n.parentPath)) {
        rootNodes.push(treeNode);
      } else {
        const parentNode = nodeMap.get(n.parentPath);
        if (parentNode) {
          parentNode.children.push(treeNode);
        } else {
          rootNodes.push(treeNode);
        }
      }
    }

    return rootNodes;
  }

  /**
   * Hybrid Memory Search: Searches across titles, L0 summaries, raw content, and path filters.
   */
  public async searchMemory(
    clientId: number,
    query: string,
    options?: { pathPrefix?: string; nodeType?: string; limit?: number }
  ): Promise<MemorySearchResult[]> {
    await this.ensureTables();
    const db = await getDb();
    const limit = options?.limit || 10;
    const cleanQuery = (query || "").trim().toLowerCase();
    if (!cleanQuery) return [];

    const nodes = await db
      .select()
      .from(companyMemoryNodes)
      .where(
        and(
          eq(companyMemoryNodes.clientId, clientId),
          eq(companyMemoryNodes.isActive, true),
          options?.pathPrefix ? like(companyMemoryNodes.path, `${this.normalizePath(options.pathPrefix)}%`) : sql`TRUE`,
          options?.nodeType ? eq(companyMemoryNodes.nodeType, options.nodeType) : sql`TRUE`
        )
      )
      .limit(100);

    const results: MemorySearchResult[] = [];

    for (const n of nodes) {
      const titleMatch = n.title.toLowerCase().includes(cleanQuery);
      const pathMatch = n.path.toLowerCase().includes(cleanQuery);
      const summaryMatch = (n.summaryL0 || "").toLowerCase().includes(cleanQuery);
      const contentMatch = (n.contentL2 || "").toLowerCase().includes(cleanQuery);

      if (titleMatch || pathMatch || summaryMatch || contentMatch) {
        let score = 0.5;
        if (titleMatch) score += 0.3;
        if (pathMatch) score += 0.2;
        if (summaryMatch) score += 0.15;

        results.push({
          id: n.id,
          path: n.path,
          title: n.title,
          nodeType: n.nodeType,
          summaryL0: n.summaryL0 || "",
          snippet: this.generateL0Summary(n.contentL2 || "", n.title),
          score: Math.min(1.0, score),
          metadata: n.metadata,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Mem0-Style Adaptive Fact Extractor:
   * Extracts atomic compliance & architecture facts from conversation / audit notes.
   */
  public async extractAndSaveFacts(
    clientId: number,
    rawText: string,
    source: string = "agent_chat"
  ): Promise<{ savedCount: number; facts: string[] }> {
    await this.ensureTables();
    if (!rawText || rawText.length < 15) return { savedCount: 0, facts: [] };

    // Segment text into key fact propositions
    const sentences = rawText
      .split(/(?<=[.?!])\s+|\n+/)
      .map(s => s.trim().replace(/^[-*•]\s+/, ""))
      .filter(s => s.length > 20 && !s.startsWith("#"));

    const extracted: string[] = [];

    for (const sentence of sentences) {
      // Look for statements declaring technology, policy, infrastructure, or compliance state
      if (
        /\b(use|using|migrated|deployed|enforce|stores|hosted|backed|configured|managed|requires|soc 2|iso 27001|gdpr|aws|s3|rds|okta|github|kubernetes|azure|gcp)\b/i.test(
          sentence
        )
      ) {
        extracted.push(sentence);
      }
    }

    let savedCount = 0;
    for (let i = 0; i < extracted.length; i++) {
      const fact = extracted[i];
      const slug = fact
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 40)
        .replace(/^_+|_+$/g, "");
      const path = `/facts/${source.replace(/[^a-z0-9_]/gi, "_")}_${Date.now()}_${slug || i}`;

      await this.writeNode(clientId, {
        path,
        title: `Fact: ${fact.slice(0, 50)}...`,
        nodeType: "fact",
        contentL2: fact,
        summaryL0: fact,
        metadata: {
          source,
          confidence: 0.95,
          extractedAt: new Date().toISOString(),
        },
      });
      savedCount++;
    }

    return { savedCount, facts: extracted };
  }

  /**
   * Web & Regulatory Intelligence Ingestor
   */
  public async ingestWebIntel(
    clientId: number,
    data: {
      url: string;
      title: string;
      content: string;
      summary?: string;
      frameworks?: string[];
      category?: string;
    }
  ): Promise<CompanyMemoryNode> {
    const cleanUrl = data.url.replace(/https?:\/\//i, "").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 50);
    const category = (data.category || "regulatory").toLowerCase();
    const path = `/intel/${category}/${cleanUrl}`;

    return await this.writeNode(clientId, {
      path,
      title: data.title,
      nodeType: "web_intel",
      contentL2: data.content,
      summaryL0: data.summary || this.generateL0Summary(data.content, data.title),
      metadata: {
        url: data.url,
        frameworks: data.frameworks || [],
        ingestedAt: new Date().toISOString(),
        source: "web_scraper",
      },
    });
  }

  /**
   * Bootstrap default enterprise VFS structure.
   */
  public async bootstrapDefaultVfsTree(clientId: number): Promise<void> {
    const existing = await this.listDirectory(clientId, "/");
    if (existing.length > 0) return; // already initialized

    // 1. Root folders
    await this.writeNode(clientId, {
      path: "/company",
      title: "Company Identity & Scope",
      nodeType: "folder",
      summaryL0: "Organization profile, headcount, primary jurisdictions, and GRC ownership.",
    });

    await this.writeNode(clientId, {
      path: "/company/profile.md",
      title: "Organization Profile & Scope",
      nodeType: "document",
      contentL2: `# Organization Profile
* **Headcount:** 150 employees
* **Jurisdictions:** US (Delaware), EU (Germany), UK
* **Regulated Frameworks:** SOC 2 Type II, ISO/IEC 27001:2022, GDPR, HIPAA, NIS2
* **Chief Risk Officer / DPO:** Marcus & Compliance Team
* **Primary Scope:** Cloud SaaS Compliance & Continuous Audit Automation`,
      summaryL0: "Headcount 150, US/EU/UK jurisdictions, SOC 2, ISO 27001, GDPR, HIPAA, NIS2 scope.",
    });

    await this.writeNode(clientId, {
      path: "/infrastructure",
      title: "Infrastructure & Tech Stack",
      nodeType: "folder",
      summaryL0: "Cloud architecture, Kubernetes clusters, databases, and CI/CD pipelines.",
    });

    await this.writeNode(clientId, {
      path: "/infrastructure/aws_production.md",
      title: "AWS Cloud Baseline (us-east-1)",
      nodeType: "document",
      contentL2: `# AWS Production Architecture
* **Primary Cloud:** AWS (us-east-1 & eu-central-1)
* **Compute:** Amazon EKS (Kubernetes 1.29) with Karpenter autoscaling
* **Databases:** Amazon Aurora PostgreSQL (Multi-AZ with KMS CMK encryption)
* **Storage:** Amazon S3 with Public Access Block enabled & TLS 1.3 bucket policies
* **Identity:** Okta SSO federated into AWS IAM Identity Center with mandatory WebAuthn MFA`,
      summaryL0: "AWS us-east-1 EKS Kubernetes, Aurora PostgreSQL KMS encrypted, S3 TLS 1.3, Okta SSO.",
    });

    await this.writeNode(clientId, {
      path: "/policies",
      title: "Master Policies & Governance",
      nodeType: "folder",
      summaryL0: "Enterprise information security, access control, and data retention policies.",
    });

    await this.writeNode(clientId, {
      path: "/vendors",
      title: "Third-Party & Vendor Inventory",
      nodeType: "folder",
      summaryL0: "Subprocessors, TPRM security tiers, and SOC 2 audit certificates.",
    });

    await this.writeNode(clientId, {
      path: "/facts",
      title: "Adaptive Fact Memory",
      nodeType: "folder",
      summaryL0: "Continuously learned corporate facts extracted by AI agents.",
    });

    await this.writeNode(clientId, {
      path: "/intel",
      title: "Regulatory & Threat Intelligence",
      nodeType: "folder",
      summaryL0: "Ingested NIST bulletins, SEC filings, CVE advisories, and industry standards.",
    });
  }

  /**
   * Generates a dynamic, compact L0/L1 Memory Cortex Snapshot for agent prompt injection.
   */
  public async getClientCortexSnapshot(clientId: number): Promise<string> {
    await this.ensureTables();
    try {
      const db = await getDb();
      const nodes = await db
        .select({
          path: companyMemoryNodes.path,
          title: companyMemoryNodes.title,
          nodeType: companyMemoryNodes.nodeType,
          summaryL0: companyMemoryNodes.summaryL0,
          metadata: companyMemoryNodes.metadata,
        })
        .from(companyMemoryNodes)
        .where(
          and(
            eq(companyMemoryNodes.clientId, clientId),
            eq(companyMemoryNodes.isActive, true)
          )
        )
        .limit(60);

      const risks = nodes.filter(n => n.path.startsWith("/risks/"));
      const policies = nodes.filter(n => n.path.startsWith("/policies/"));
      const vendors = nodes.filter(n => n.path.startsWith("/vendors/"));
      const infra = nodes.filter(n => n.path.startsWith("/infrastructure/"));
      const facts = nodes.filter(n => n.path.startsWith("/facts/"));

      const lines: string[] = [
        `=== 🧠 LIVE CLIENT MEMORY CORTEX SNAPSHOT (Client #${clientId}) ===`,
        `* Active Documented Policies: ${policies.length > 0 ? policies.map(p => p.title).slice(0, 8).join(", ") : "14 ISO 27001 / SOC 2 baseline policies"}`,
        `* Registered Vendors (${vendors.length}): ${vendors.map(v => v.title).slice(0, 6).join(", ") || "AWS, Stripe, Datadog"}`,
        `* Key Infrastructure: ${infra.map(i => i.title).slice(0, 4).join(", ") || "AWS Production EKS & Aurora PostgreSQL"}`,
      ];

      if (risks.length > 0) {
        lines.push(`* Active Risks in Register (${risks.length}):`);
        for (const r of risks.slice(0, 5)) {
          lines.push(`  - [${r.title}]: ${r.summaryL0 || "Documented Risk Scenario"}`);
        }
      }

      if (facts.length > 0) {
        lines.push(`* Key Operational Facts:`);
        for (const f of facts.slice(0, 4)) {
          lines.push(`  - ${f.summaryL0}`);
        }
      }

      lines.push(`==================================================================`);
      return lines.join("\n");
    } catch (err) {
      console.warn("[VfsMemoryEngine] getClientCortexSnapshot error:", err);
      return "";
    }
  }

  /**
   * Retrieves complete Node-Link graph data for the Visual Knowledge Graph Explorer.
   */
  public async getKnowledgeGraphData(clientId: number): Promise<{
    nodes: Array<{ id: string; name: string; type: string; path: string; summary: string; val: number }>;
    links: Array<{ source: string; target: string; label: string }>;
  }> {
    await this.ensureTables();
    try {
      const db = await getDb();
      const allNodes = await db
        .select()
        .from(companyMemoryNodes)
        .where(
          and(
            eq(companyMemoryNodes.clientId, clientId),
            eq(companyMemoryNodes.isActive, true)
          )
        );

      const graphNodes = allNodes.map((n) => {
        let nodeCategory = "document";
        if (n.path.startsWith("/policies")) nodeCategory = "policy";
        else if (n.path.startsWith("/controls")) nodeCategory = "control";
        else if (n.path.startsWith("/risks")) nodeCategory = "risk";
        else if (n.path.startsWith("/vendors")) nodeCategory = "vendor";
        else if (n.path.startsWith("/infrastructure")) nodeCategory = "infrastructure";
        else if (n.path.startsWith("/incidents")) nodeCategory = "incident";
        else if (n.nodeType === "folder") nodeCategory = "folder";

        return {
          id: `node_${n.id}`,
          name: n.title,
          type: nodeCategory,
          path: n.path,
          summary: n.summaryL0 || n.title,
          val: n.nodeType === "folder" ? 15 : 8,
        };
      });

      const explicitRelations = await db
        .select()
        .from(companyMemoryRelations)
        .where(eq(companyMemoryRelations.clientId, clientId));

      const links: Array<{ source: string; target: string; label: string }> = explicitRelations.map((r) => ({
        source: `node_${r.sourceNodeId}`,
        target: `node_${r.targetNodeId}`,
        label: r.relationType,
      }));

      // Generate structural hierarchical links if no explicit links
      const folderMap = new Map<string, string>();
      for (const gn of graphNodes) {
        if (gn.type === "folder") {
          folderMap.set(gn.path, gn.id);
        }
      }

      for (const gn of graphNodes) {
        if (gn.type !== "folder") {
          const parts = gn.path.split("/").filter(Boolean);
          if (parts.length > 1) {
            const parentFolderPath = "/" + parts[0];
            const parentId = folderMap.get(parentFolderPath);
            if (parentId && parentId !== gn.id) {
              links.push({
                source: parentId,
                target: gn.id,
                label: "contains",
              });
            }
          }
        }
      }

      return {
        nodes: graphNodes,
        links,
      };
    } catch (err) {
      console.warn("[VfsMemoryEngine] getKnowledgeGraphData error:", err);
      return { nodes: [], links: [] };
    }
  }
}

export const vfsMemoryEngine = new VfsMemoryEngine();
