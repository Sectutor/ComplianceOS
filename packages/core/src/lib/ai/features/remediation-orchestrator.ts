/**
 * Remediation Orchestrator — Auto-generate and assign remediation tasks.
 *
 * When gaps are identified, this module:
 * 1. Generates specific remediation tasks per gap
 * 2. Suggests assignees based on control ownership
 * 3. Estimates effort based on gap type and historical data
 * 4. Sets deadlines based on audit proximity
 * 5. Creates a prioritized remediation queue
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { clientControls, controls, projectTasks, users } from "../../../schema";
import { eq, and, desc } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RemediationTask {
  id: string;
  controlId: string;
  controlName: string;
  framework: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: "hours" | "days" | "weeks";
  suggestedAssignee?: string;
  suggestedDeadline: string; // ISO date
  dependencies: string[]; // control IDs that should be done first
  reasoning: string;
}

export interface RemediationPlan {
  clientId: number;
  tasks: RemediationTask[];
  totalTasks: number;
  criticalTasks: number;
  estimatedTotalDays: number;
  auditTargetDate?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestration function
// ─────────────────────────────────────────────────────────────────────────────

export async function generateRemediationPlan(
  clientId: number,
  userId?: number,
  auditTargetDate?: string
): Promise<RemediationPlan | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load all unimplemented controls
  const gapControls = await db.select({
    controlId: controls.controlId,
    controlName: controls.name,
    framework: controls.framework,
    status: clientControls.status,
  })
    .from(clientControls)
    .innerJoin(controls, eq(controls.id, clientControls.controlId))
    .where(and(
      eq(clientControls.clientId, clientId),
      ne(clientControls.status, "implemented")
    ));

  if (gapControls.length === 0) {
    return { clientId, tasks: [], totalTasks: 0, criticalTasks: 0, estimatedTotalDays: 0 };
  }

  // 2. Load users for assignee suggestions
  const userRows = await db.select().from(users).where(eq(users.clientId, clientId));

  // 3. Build orchestration input
  const gapList = gapControls
    .map((g, i) => `${i + 1}. ${g.controlId}: ${g.controlName} [${g.framework}] — Status: ${g.status}`)
    .join("\n");

  const data = {
    clientId,
    gapCount: gapControls.length,
    gaps: gapList,
    frameworks: [...new Set(gapControls.map((g) => g.framework))],
    auditTargetDate: auditTargetDate || "Not set",
    availableUsers: userRows.map((u) => `${u.name || u.email} [${u.role}]`).join(", ") || "No users assigned",
  };

  // 4. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "remediation_orchestrator",
      userId,
      entityType: "remediation_plan",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Router: which gap to tackle first?
      const routing = await provider.route(
        `You have ${sanitizedData.gaps.split("\n").length} gaps to close before audit. Which should be prioritized?`,
        sanitizedData.gaps.split("\n").slice(0, 10).map((g: string) => ({ id: g.slice(0, 80), description: g })),
        "Consider: audit proximity, risk severity, dependencies between controls, and effort to close."
      );

      // Scorer: effort estimation for each gap
      const effortScoring = await provider.score(
        `Estimate remediation effort for ${sanitizedData.gaps.split("\n").length} gaps across ${sanitizedData.frameworks?.join(", ")}`,
        [
          { id: "technical_complexity", description: "How technically complex is the remediation?", weight: 0.3 },
          { id: "documentation_effort", description: "How much documentation is needed?", weight: 0.2 },
          { id: "stakeholder_coordination", description: "How many people need to be involved?", weight: 0.2 },
          { id: "evidence_collection", description: "How much evidence needs to be collected?", weight: 0.3 },
        ],
        { min: 0, max: 100, labels: ["Hours", "Days", "Weeks", "Months"] }
      );

      return { routing, effortScoring };
    }
  );

  // 5. Build remediation tasks
  const tasks: RemediationTask[] = gapControls.map((gap, idx) => {
    const isCritical = gap.status === "not_implemented" && ["SOC 2", "ISO 27001"].includes(gap.framework);
    const effortDays = isCritical ? 14 : gap.status === "in_progress" ? 7 : 21;

    // Calculate deadline based on audit proximity
    let deadline: Date;
    if (auditTargetDate) {
      const audit = new Date(auditTargetDate);
      deadline = new Date(audit.getTime() - (effortDays * 24 * 60 * 60 * 1000));
    } else {
      deadline = new Date(Date.now() + (effortDays * 24 * 60 * 60 * 1000));
    }

    // Suggest assignee based on framework
    const suggestedAssignee = suggestAssignee(gap.framework, userRows);

    return {
      id: `REM-${gap.controlId}`,
      controlId: gap.controlId,
      controlName: gap.controlName,
      framework: gap.framework,
      title: `Close gap: ${gap.controlId} - ${gap.controlName}`,
      description: `Remediation task for ${gap.framework} control ${gap.controlId}. Current status: ${gap.status}. ${isCritical ? "CRITICAL: This is a core control that auditors will scrutinize." : ""}`,
      priority: isCritical ? "critical" : gap.status === "in_progress" ? "high" : "medium",
      estimatedEffort: effortDays <= 3 ? "days" : effortDays <= 14 ? "days" : "weeks",
      suggestedAssignee,
      suggestedDeadline: deadline.toISOString(),
      dependencies: findDependencies(gap, gapControls),
      reasoning: result.response?.routing?.reasoning || `Priority based on ${gap.framework} audit requirements.`,
    };
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const criticalTasks = tasks.filter((t) => t.priority === "critical").length;
  const totalDays = tasks.reduce((sum, t) => sum + (t.estimatedEffort === "hours" ? 1 : t.estimatedEffort === "days" ? 7 : 21), 0);

  return {
    clientId,
    tasks,
    totalTasks: tasks.length,
    criticalTasks,
    estimatedTotalDays: totalDays,
    auditTargetDate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function suggestAssignee(framework: string, users: any[]): string | undefined {
  // Simple heuristic: match user role to framework
  const roleMap: Record<string, string[]> = {
    "SOC 2": ["security_engineer", "ciso", "compliance_manager"],
    "ISO 27001": ["isms_manager", "compliance_manager", "security_engineer"],
    "HIPAA": ["privacy_officer", "compliance_manager", "security_engineer"],
    "GDPR": ["dpo", "privacy_officer", "legal"],
    "PCI DSS": ["security_engineer", "compliance_manager", "network_admin"],
  };

  const preferredRoles = roleMap[framework] || ["compliance_manager"];
  for (const role of preferredRoles) {
    const match = users.find((u) => u.role?.toLowerCase().includes(role));
    if (match) return match.name || match.email;
  }

  return users[0]?.name || users[0]?.email;
}

function findDependencies(gap: any, allGaps: any[]): string[] {
  // Some controls depend on others (e.g., access control depends on asset inventory)
  const dependencyMap: Record<string, string[]> = {
    "CC6.1": ["CC1.1", "CC1.2"],
    "A.9.1.1": ["A.8.1.1"],
    "AC-1": ["CM-1", "CM-2"],
  };

  return dependencyMap[gap.controlId] || [];
}
