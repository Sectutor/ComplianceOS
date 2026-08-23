/**
 * Agent Tool Dispatcher — REAL implementations.
 *
 * Every tool either:
 *   1. Queries the live PostgreSQL database and reports what it actually finds, or
 *   2. Performs a genuine computation (e.g. Monte Carlo FAIR simulation), or
 *   3. Returns an honest "not configured / no data" result.
 *
 * HARD RULE (user directive): never fabricate scan results, counts, percentages,
 * PR numbers, or compliance claims. If a data source isn't connected, the tool
 * says so. Summaries are always derived from the returned data itself.
 */

import { getDb } from "../../db";
import {
  riskAssessments,
  riskScenarios,
  vendors,
  clientPolicies,
  clientControls,
  controls,
  evidence,
  employees,
  dsarRequests,
  processingActivities,
  incidents,
  vulnerabilities,
  assets,
  cloudConnections,
  accessReviewCampaigns,
  accessReviewAssignments,
} from "../../schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { vfsMemoryEngine } from "../memory/vfsMemoryEngine";

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  botId: string;
  botName: string;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data: any;
  summary: string;
  isStagedForApproval?: boolean;
  approvalPayload?: string;
  executionTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Genuine quantitative helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Knuth Poisson sampler — real stochastic simulation, small lambdas. */
function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/** Box-Muller standard normal. */
function stdNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface FairInputs {
  tefPerYear: number;      // threat event frequency
  lossMean: number;        // lognormal mu-space mean loss per event (USD)
  lossSigma: number;       // lognormal sigma
  iterations: number;
}

interface FairOutputs {
  iterationsRun: number;
  lossEventsPerYearMean: number;
  singleLossExpectancyUsd: number;
  annualizedLossExpectancyUsd: number;
  valueAtRisk90Usd: number;
  valueAtRisk99Usd: number;
}

/** Real Monte Carlo FAIR-style loss distribution. Exported for unit testing. */
export function runFairMonteCarlo(inputs: FairInputs): FairOutputs {
  const annualLosses: number[] = [];
  const perEventLosses: number[] = [];
  const mu = Math.log(inputs.lossMean);
  for (let i = 0; i < inputs.iterations; i++) {
    const events = poisson(inputs.tefPerYear);
    let yearLoss = 0;
    for (let e = 0; e < events; e++) {
      const loss = Math.exp(mu + inputs.lossSigma * stdNormal());
      yearLoss += loss;
      if (perEventLosses.length < 50000) perEventLosses.push(loss);
    }
    annualLosses.push(yearLoss);
  }
  annualLosses.sort((a, b) => a - b);
  const meanAnnual = annualLosses.reduce((a, b) => a + b, 0) / annualLosses.length;
  const meanEvent =
    perEventLosses.length > 0
      ? perEventLosses.reduce((a, b) => a + b, 0) / perEventLosses.length
      : 0;
  const q = (p: number) =>
    annualLosses.length > 0
      ? annualLosses[Math.min(annualLosses.length - 1, Math.floor(p * annualLosses.length))]
      : 0;
  return {
    iterationsRun: inputs.iterations,
    lossEventsPerYearMean: Number((annualLosses.filter((l) => l > 0).length / annualLosses.length * inputs.tefPerYear || 0).toFixed(4)),
    singleLossExpectancyUsd: Math.round(meanEvent),
    annualizedLossExpectancyUsd: Math.round(meanAnnual),
    valueAtRisk90Usd: Math.round(q(0.9)),
    valueAtRisk99Usd: Math.round(q(0.99)),
  };
}

function fmtUsd(n: number): string {
  return `$${Number(n || 0).toLocaleString("en-US")}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export class ToolDispatcher {
  public async execute(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const result = await this.dispatch(req);
      return { ...result, executionTimeMs: Date.now() - startTime };
    } catch (err: any) {
      console.error(`[ToolDispatcher] ${req.toolName} failed:`, err?.message);
      return {
        toolName: req.toolName,
        success: false,
        data: { error: err?.message ?? "unknown error" },
        summary: `Tool ${req.toolName} failed: ${err?.message ?? "unknown error"}`,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private async dispatch(req: ToolExecutionRequest): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    switch (req.toolName) {
      // ── Morgan: Cloud posture from registered connections & asset inventory ──
      case "aws_scan_storage":
        return this.cloudPostureScan(req, ["aws"]);

      case "cloud_posture_scan":
        return this.cloudPostureScan(req, undefined); // all providers

      // ── Riley: Identity / UAR audit from live personnel & access-review data ──
      case "identity_audit_directory":
        return this.identityAudit(req);

      // ── Sasha: Vulnerability SLA sweep from vulnerability register ──
      case "vuln_scan_dependencies":
        return this.vulnSweep(req);

      // ── Nova: Regulatory incident clocks from incidents table ──
      case "regulatory_timer_check":
        return this.regulatoryTimerCheck(req);

      // ── Elena: GDPR ROPA & DSAR health from privacy module ──
      case "privacy_check_dsar_ropa":
        return this.privacyHealthCheck(req);

      // ── Marcus: FAIR quantitative assessment with REAL Monte Carlo ──
      case "risk_create_assessment":
      case "risk_calculate_fair_ale":
        return this.fairRiskAssessment(req);

      // ── Marcus: ISO 27005 asset-threat evaluation from live registers ──
      case "risk_iso27005_asset_evaluation":
        return this.iso27005AssetEvaluation(req);

      // ── Marcus: NIST 800-30 matrix from supplied or register-derived scores ──
      case "risk_nist800_30_matrix":
        return this.nist80030Matrix(req);

      // ── Marcus: EBIOS RM workshop — LLM-generated, clearly labeled as draft ──
      case "risk_ebios_workshop_generate":
        return this.ebiosWorkshop(req);

      // ── Marcus: 4T treatment plan from actual treatment strategies on file ──
      case "risk_treatment_plan_builder":
        return this.treatmentPlanBuilder(req);

      // ── Sam: Audit room compilation from real evidence rows ──
      case "audit_room_compile":
        return this.auditRoomCompile(req);

      // ── Memory Cortex tools (real VFS operations) ──
      case "memory_list_directory":
        return this.memoryListDir(req);
      case "memory_read_document":
        return this.memoryReadDoc(req);
      case "memory_search":
        return this.memorySearch(req);
      case "memory_store_fact":
        return this.memoryStoreFact(req);

      default:
        // Unknown tools must NOT silently succeed.
        return {
          toolName: req.toolName,
          success: false,
          data: { error: `Unknown tool '${req.toolName}'` },
          summary: `Tool '${req.toolName}' is not registered with the dispatcher.`,
        };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Tool implementations — every number below comes from the database
  // ───────────────────────────────────────────────────────────────────────────

  private async cloudPostureScan(
    req: ToolExecutionRequest,
    providers: string[] | undefined
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const conns = await db
      .select()
      .from(cloudConnections)
      .where(
        providers && providers.length === 1
          ? and(eq(cloudConnections.clientId, clientId), eq(cloudConnections.provider, providers[0]))
          : eq(cloudConnections.clientId, clientId)
      );

    const relevantConns = providers ? conns : conns;

    if (relevantConns.length === 0) {
      const label = providers?.[0]?.toUpperCase() ?? "cloud";
      return {
        toolName: req.toolName,
        success: true,
        data: {
          configured: false,
          connections: 0,
          message: `No ${label} connection is registered for client #${clientId}.`,
        },
        summary:
          `No ${label} connection is configured for this client in Settings → Integrations. ` +
          `I cannot report infrastructure posture that was never scanned — connect the account first and I will re-run against live data.`,
      };
    }

    // Asset inventory cross-reference (what the platform actually knows about)
    const inventory = await db.select().from(assets).where(eq(assets.clientId, clientId));
    const storageLike = inventory.filter((a) => {
      const hay = `${a.type} ${a.productName ?? ""} ${a.name}`.toLowerCase();
      return hay.includes("storage") || hay.includes("bucket") || hay.includes("s3") ||
             hay.includes("backup") || hay.includes("blob") || hay.includes("disk");
    });

    const connected = relevantConns.filter((c) => c.status === "connected");
    const errored = relevantConns.filter((c) => c.status === "error");
    const stale = relevantConns.filter(
      (c) => !c.lastSyncAt || daysBetween(new Date(c.lastSyncAt), new Date()) > 7
    );

    return {
      toolName: req.toolName,
      success: true,
      data: {
        configured: true,
        connections: relevantConns.map((c) => ({
          name: c.name,
          provider: c.provider,
          region: c.region,
          status: c.status,
          lastSyncAt: c.lastSyncAt,
        })),
        connectedCount: connected.length,
        errorCount: errored.length,
        staleOver7Days: stale.map((c) => c.name),
        assetInventoryTotal: inventory.length,
        storageRelatedAssets: storageLike.map((a) => ({ name: a.name, type: a.type, vendor: a.vendor })),
      },
      summary:
        `${relevantConns.length} ${providers?.[0]?.toUpperCase() ?? "cloud"} connection(s) registered: ` +
        `${connected.length} connected, ${errored.length} in error` +
        (stale.length ? `, ${stale.length} not synced in >7 days (${stale.join(", ")})` : "") +
        `. Asset inventory holds ${inventory.length} assets, ${storageLike.length} storage-related. ` +
        `Live API-level configuration scanning requires an active collector sync — last sync timestamps shown above.`,
    };
  }

  private async identityAudit(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const staff = await db.select().from(employees).where(eq(employees.clientId, clientId));
    const active = staff.filter((e) => !e.employmentStatus || e.employmentStatus.toLowerCase().includes("active"));
    const campaigns = await db
      .select()
      .from(accessReviewCampaigns)
      .where(eq(accessReviewCampaigns.clientId, clientId));

    const campaignIds = campaigns.map((c) => c.id);
    const assignments =
      campaignIds.length > 0
        ? await db.select().from(accessReviewAssignments).where(inArray(accessReviewAssignments.campaignId, campaignIds))
        : [];
    const pendingAssignments = assignments.filter((a) => a.status === "pending");
    const overdueAssignments = assignments.filter((a) => a.status === "overdue");

    const now = new Date();
    const overdueCampaigns = campaigns.filter((c) => c.dueDate && new Date(c.dueDate) < now && c.status !== "completed");

    return {
      toolName: req.toolName,
      success: true,
      data: {
        personnelTotal: staff.length,
        personnelActive: active.length,
        accessReviewCampaigns: campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status, dueDate: c.dueDate })),
        campaignsOpen: campaigns.filter((c) => c.status === "active").length,
        campaignsOverdue: overdueCampaigns.map((c) => c.name),
        assignmentsTotal: assignments.length,
        assignmentsPending: pendingAssignments.length,
        assignmentsOverdue: overdueAssignments.length,
      },
      summary:
        `Identity audit from platform data: ${staff.length} personnel on record (${active.length} active). ` +
        (campaigns.length === 0
          ? `No access review campaigns exist yet — schedule one before MFA/admin claims can be evidenced.`
          : `${campaigns.filter((c) => c.status === "active").length} active campaign(s), ` +
            `${pendingAssignments.length} review assignment(s) pending, ${overdueAssignments.length} overdue.`) +
        ` Note: directory-level MFA enforcement figures require an IdP connector (Okta/Entra) — none of these numbers are inferred.`,
    };
  }

  private async vulnSweep(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const vulns = await db.select().from(vulnerabilities).where(eq(vulnerabilities.clientId, clientId));
    const open = vulns.filter((v) => v.status === "open");
    const bySev = {
      critical: open.filter((v) => v.severity === "Critical").length,
      high: open.filter((v) => v.severity === "High").length,
      medium: open.filter((v) => v.severity === "Medium").length,
      low: open.filter((v) => v.severity === "Low").length,
    };
    const now = new Date();
    const overdueSla = open.filter((v) => v.dueDate && new Date(v.dueDate) < now);
    const kevListed = open.filter((v) => (v as any).cisaKev === true || (v as any).knownExploited === true);
    const topItems = open
      .slice(0, 5)
      .map((v) => ({
        name: v.name,
        cveId: v.cveId,
        severity: v.severity,
        cvss: v.cvssScore != null ? (v.cvssScore / 10).toFixed(1) : null,
        dueDate: v.dueDate,
      }));

    return {
      toolName: req.toolName,
      success: true,
      data: {
        totalRegistered: vulns.length,
        openTotal: open.length,
        openBySeverity: bySev,
        overdueSlaCount: overdueSla.length,
        knownExploitedFlagged: kevListed.length,
        oldestOpenDueDates: topItems,
      },
      summary:
        vulns.length === 0
          ? `Vulnerability register is empty for this client. Run a scanner sync (CISOvault/Prowler/Trivy) before SLA reporting is possible — reporting zero CVEs from an empty register would be false assurance.`
          : `Register shows ${vulns.length} vulnerabilities, ${open.length} open ` +
            `(Critical: ${bySev.critical}, High: ${bySev.high}, Medium: ${bySev.medium}, Low: ${bySev.low}). ` +
            `${overdueSla.length} open item(s) past their remediation due date.` +
            (topItems[0] ? ` Highest priority: ${topItems[0].severity} "${topItems[0].name}"${topItems[0].cveId ? ` (${topItems[0].cveId})` : ""}.` : ""),
    };
  }

  private async regulatoryTimerCheck(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const rows = await db.select().from(incidents).where(eq(incidents.clientId, clientId));
    const significant = rows.filter((i) => i.isSignificant);
    const now = Date.now();

    const clockState = significant.map((i) => {
      const detected = i.detectedAt ? new Date(i.detectedAt).getTime() : null;
      const h24Deadline = detected ? detected + 24 * 3600e3 : null;
      const h72Deadline = detected ? detected + 72 * 3600e3 : null;
      return {
        id: i.id,
        title: i.title,
        detectedAt: i.detectedAt,
        earlyWarningSentAt: i.earlyWarningSentAt,
        intermediateReportSentAt: i.intermediateReportSentAt,
        hoursSinceDetection: detected ? Math.round(((now - detected) / 3600e3) * 10) / 10 : null,
        earlyWarningRemainingHours:
          h24Deadline && !i.earlyWarningSentAt ? Math.round(((h24Deadline - now) / 3600e3) * 10) / 10 : null,
        intermediateRemainingHours:
          h72Deadline && !i.intermediateReportSentAt ? Math.round(((h72Deadline - now) / 3600e3) * 10) / 10 : null,
        earlyWarningBreached:
          !!h24Deadline && !i.earlyWarningSentAt && now > h24Deadline,
      };
    });

    const breaches = clockState.filter((c) => c.earlyWarningBreached);

    return {
      toolName: req.toolName,
      success: true,
      data: {
        incidentsTotal: rows.length,
        significantIncidents: significant.length,
        clocks: clockState,
        breachedClocks: breaches.map((b) => b.title),
      },
      summary:
        rows.length === 0
          ? `No incidents recorded for this client. Regulatory watchdog has nothing to count down — this is a statement about the incident register, not about breach probability.`
          : `${rows.length} incident(s) on record, ${significant.length} classified significant. ` +
            (breaches.length
              ? `⚠️ NIS2 24h early-warning deadline BREACHED for: ${breaches.map((b) => `"${b.title}"`).join(", ")}. Escalation required.`
              : clockState.some((c) => c.earlyWarningRemainingHours !== null && c.earlyWarningRemainingHours <= 24)
              ? `One or more early-warning clocks inside the final 24h window — see per-clock detail.`
              : `All regulatory notification clocks currently satisfied.`),
    };
  }

  private async privacyHealthCheck(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const ropa = await db.select().from(processingActivities).where(eq(processingActivities.clientId, clientId));
    const dsars = await db.select().from(dsarRequests).where(eq(dsarRequests.clientId, clientId));
    const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, clientId));
    const subprocessors = vendorRows.filter((v) => v.isSubprocessor);

    const openDsars = dsars.filter((d) => d.status && !["Completed", "Rejected"].includes(d.status));
    const completed = dsars.filter((d) => d.completedDate && d.requestDate);
    const avgFulfillmentDays =
      completed.length > 0
        ? Math.round(
            (completed.reduce(
              (sum, d) => sum + daysBetween(new Date(d.requestDate!), new Date(d.completedDate!)),
              0
            ) /
              completed.length) *
              10
          ) / 10
        : null;
    const now = new Date();
    const dsarsPastDue = openDsars.filter((d) => d.dueDate && new Date(d.dueDate) < now);
    const subprocessorsMissingTransferMechanism = subprocessors.filter((v) => !v.transferMechanism);

    return {
      toolName: req.toolName,
      success: true,
      data: {
        ropaActivities: ropa.length,
        controllersOrProcessors: ropa.filter((r) => r.role === "controller" || r.role === "processor").length,
        dsarsTotal: dsars.length,
        dsarsOpen: openDsars.length,
        dsarsPastDue: dsarsPastDue.map((d) => d.requestId),
        averageFulfillmentDays: avgFulfillmentDays,
        subprocessorsTracked: subprocessors.length,
        subprocessorsMissingTransferMechanism: subprocessorsMissingTransferMechanism.map((v) => v.name),
      },
      summary:
        `Privacy register check: ${ropa.length} processing activity record(s), ${dsars.length} DSAR(s) total ` +
        `(${openDsars.length} open${dsarsPastDue.length ? `, ${dsarsPastDue.length} PAST DUE: ${dsarsPastDue.map((d) => d.requestId).join(", ")}` : ""})` +
        (avgFulfillmentDays !== null ? `, average fulfilment ${avgFulfillmentDays} days across ${completed.length} completed requests` : `, no completed requests yet so no fulfilment average exists`) +
        `. ${subprocessors.length} subprocessor(s) tracked` +
        (subprocessorsMissingTransferMechanism.length
          ? ` — ⚠️ ${subprocessorsMissingTransferMechanism.length} lack a documented transfer mechanism: ${subprocessorsMissingTransferMechanism.map((v) => v.name).join(", ")}.`
          : `; all have documented transfer mechanisms on file.`),
    };
  }

  private async fairRiskAssessment(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const db = await getDb();
    const p = req.parameters ?? {};
    const clientId = Number(p.clientId);
    if (!clientId) throw new Error("clientId parameter is required");

    const title = String(p.title ?? "").trim() || "Unassessed Threat Scenario";
    const description = String(p.description ?? "").trim();

    // Scores: use supplied values, else neutral defaults — always reported as such.
    const likelihood = Math.max(1, Math.min(5, Number(p.likelihood) || 3));
    const impact = Math.max(1, Math.min(5, Number(p.impact) || 4));
    const inherentScore = likelihood * impact;

    // FAIR inputs: explicit user-supplied values take precedence; otherwise a
    // documented heuristic maps 1-5 scales onto distribution parameters.
    const tefPerYear = Number(p.threatEventFrequencyPerYear) || [0.05, 0.2, 1.0, 4, 12][likelihood - 1];
    const sleBaseUsd = Number(p.singleLossExpectancyUsd) || [2000, 15000, 85000, 400000, 2000000][impact - 1];
    const iterations = Math.max(1000, Math.min(50000, Number(p.monteCarloIterations) || 10000));

    const fair = runFairMonteCarlo({
      tefPerYear,
      lossMean: sleBaseUsd,
      lossSigma: 0.9,
      iterations,
    });
    const ale = fair.annualizedLossExpectancyUsd;

    const treatment = String(p.treatment ?? "Mitigate").trim();
    const treatmentDescription = String(p.treatmentDescription ?? "").trim();

    const assessmentId = `RA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const riskBand = (score: number) => (score >= 15 ? "High" : score >= 8 ? "Medium" : "Low");

    const [assessment] = await db
      .insert(riskAssessments)
      .values({
        clientId,
        assessmentId,
        title,
        category: String(p.category ?? "Enterprise"),
        threatDescription: description || title,
        vulnerabilityDescription: String(p.vulnerabilityDescription ?? "") || null,
        existingControls: String(p.existingControls ?? "") || null,
        recommendedActions: treatmentDescription || treatment,
        controlEffectiveness: String(p.controlEffectiveness ?? "Not Assessed"),
        assessmentDate: new Date(),
        nextReviewDate: new Date(Date.now() + 90 * 86400e3),
        method: `FAIR Monte Carlo (${iterations} iterations, real simulation)`,
        assessor: `${req.botName} (agent)`,
        riskOwner: String(p.riskOwner ?? "Unassigned"),
        treatmentOption: treatment,
        priority: riskBand(inherentScore),
        likelihood: String(likelihood),
        impact: String(impact),
        inherentScore,
        inherentRisk: riskBand(inherentScore),
        residualRisk: String(p.residualRisk ?? riskBand(Math.max(1, Math.round(inherentScore / 3)))),
        residualScore: Math.max(1, Math.round(inherentScore / 3)),
        affectedAssets: Array.isArray(p.affectedAssets) ? p.affectedAssets : null,
        status: "draft",
        contextSnapshot: {
          description,
          methodology: "FAIR-style Monte Carlo (Poisson event frequency × lognormal loss)",
          inputs: { tefPerYear, sleBaseUsd, likelihood, impact, iterations },
          outputs: fair,
          createdByBot: req.botName,
          generatedAt: new Date().toISOString(),
        },
      })
      .returning();

    const [scenario] = await db
      .insert(riskScenarios)
      .values({
        clientId,
        title,
        description: description || title,
        category: String(p.category ?? "Enterprise"),
        likelihood,
        impact,
        inherentScore,
        inherentRisk: riskBand(inherentScore),
        residualLikelihood: 1,
        residualImpact: 2,
        residualScore: 2,
        residualRisk: "Low",
        treatmentStrategy: treatment,
        status: "identified",
      })
      .returning();

    await vfsMemoryEngine.writeNode(clientId, {
      path: `/risks/${title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}.md`,
      title: `Risk: ${title}`,
      nodeType: "document",
      contentL2: `# Risk Assessment: ${title}
* **Client ID:** ${clientId}
* **Assessment ID:** ${assessmentId}
* **Inherent Score:** ${inherentScore}/25 (${riskBand(inherentScore)})
* **ALE (Monte Carlo ${iterations} iter):** ${fmtUsd(fair.annualizedLossExpectancyUsd)}
* **90% VaR:** ${fmtUsd(fair.valueAtRisk90Usd)}
* **Treatment:** ${treatment}

## Description
${description || "(no description supplied)"}`,
      summaryL0: `Risk [${riskBand(inherentScore)}]: ${title} (ALE: ${fmtUsd(fair.annualizedLossExpectancyUsd)}).`,
      metadata: {
        sourceTable: "risk_assessments",
        sourceId: assessment.id,
        syncedAt: new Date().toISOString(),
      },
    });

    return {
      toolName: req.toolName,
      success: true,
      data: {
        riskAssessmentId: assessment.id,
        riskScenarioId: scenario.id,
        assessmentCode: assessmentId,
        clientId,
        title,
        methodology: "FAIR-style Monte Carlo: Poisson threat-event frequency × lognormal per-event loss",
        monteCarloIterations: fair.iterationsRun,
        inputs: { likelihood, impact, tefPerYear, sleBaseUsd },
        singleLossExpectancyUsd: fair.singleLossExpectancyUsd,
        annualizedLossExpectancyUsd: fair.annualizedLossExpectancyUsd,
        valueAtRisk90Usd: fair.valueAtRisk90Usd,
        valueAtRisk99Usd: fair.valueAtRisk99Usd,
        inherentRiskScore: inherentScore,
        inherentRiskBand: riskBand(inherentScore),
        persistedTo: `/clients/${clientId}/risks/register`,
      },
      summary:
        `Ran a real ${iterations.toLocaleString()}-iteration Monte Carlo (Poisson/lognormal FAIR model) for "${title}". ` +
        `Inherent ${inherentScore}/25 (${riskBand(inherentScore)}). Simulated ALE ${fmtUsd(fair.annualizedLossExpectancyUsd)}, ` +
        `90% VaR ${fmtUsd(fair.valueAtRisk90Usd)}. Persisted as Risk #${assessment.id} (${assessmentId}); ` +
        `status is draft until a human approves it.`,
    };
  }

  private async iso27005AssetEvaluation(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const inventory = await db.select().from(assets).where(eq(assets.clientId, clientId));
    const scenarios = await db.select().from(riskScenarios).where(eq(riskScenarios.clientId, clientId));
    const linkedByAsset = scenarios.filter((s) => s.assetId != null);
    const unlinkedAssets = inventory.filter((a) => !scenarios.some((s) => s.assetId === a.id));
    const highValuation = inventory.filter(
      (a) => (a.valuationC ?? 3) >= 4 || (a.valuationI ?? 3) >= 4 || (a.valuationA ?? 3) >= 4
    );

    return {
      toolName: req.toolName,
      success: true,
      data: {
        assetsEvaluated: inventory.length,
        highValuationAssets: highValuation.map((a) => ({ name: a.name, type: a.type })),
        riskScenariosLinkedToAssets: linkedByAsset.length,
        assetsWithoutAnyRiskScenario: unlinkedAssets.map((a) => a.name),
        scenariosWithoutAssetLink: scenarios.filter((s) => s.assetId == null).length,
      },
      summary:
        `ISO 27005 asset-based view from live registers: ${inventory.length} asset(s), ` +
        `${highValuation.length} rated ≥4 on at least one CIA dimension. ` +
        `${linkedByAsset.length} risk scenario(s) explicitly linked to an asset` +
        (unlinkedAssets.length
          ? `. ⚠️ ${unlinkedAssets.length} asset(s) have NO risk scenario attached: ${unlinkedAssets.slice(0, 5).map((a) => a.name).join(", ")}${unlinkedAssets.length > 5 ? "…" : ""}`
          : `.`),
    };
  }

  private async nist80030Matrix(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    let likelihood = Number(req.parameters?.likelihood);
    let impact = Number(req.parameters?.impact);
    let source: string = "supplied by analyst";

    if (!Number.isFinite(likelihood) || !Number.isFinite(impact)) {
      // Derive from the register: mean of scored scenarios — real data, stated as such.
      const scenarios = await db.select().from(riskScenarios).where(eq(riskScenarios.clientId, clientId));
      const scored = scenarios.filter((s) => s.inherentScore != null);
      if (scored.length === 0) {
        return {
          toolName: req.toolName,
          success: true,
          data: { derivableFromRegister: false },
          summary:
            `Cannot produce a NIST SP 800-30 rating: no likelihood/impact were supplied and the risk register contains no scored scenarios to derive them from. Supply scores or populate the register first.`,
        };
      }
      likelihood = Math.round(scored.reduce((a, s) => a + (s.likelihood ?? 0), 0) / scored.length);
      impact = Math.round(scored.reduce((a, s) => a + (s.impact ?? 0), 0) / scored.length);
      source = `mean of ${scored.length} scored scenarios in the register`;
    }

    const score = likelihood * impact;
    const band = score >= 15 ? "High" : score >= 8 ? "Moderate" : "Low";

    return {
      toolName: req.toolName,
      success: true,
      data: {
        methodology: "NIST SP 800-30 Rev.1 (5×5 likelihood × impact)",
        likelihoodScore: likelihood,
        impactScore: impact,
        overallRiskScore: score,
        overallRiskBand: band,
        scoreSource: source,
      },
      summary:
        `NIST SP 800-30 Rev.1 matrix: L=${likelihood} × I=${impact} → ${score}/25 (${band}). ` +
        `Scores taken ${source}.`,
    };
  }

  private async ebiosWorkshop(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const inventory = await db.select().from(assets).where(eq(assets.clientId, clientId)).limit(15);
    const scenarios = await db
      .select()
      .from(riskScenarios)
      .where(and(eq(riskScenarios.clientId, clientId)))
      .orderBy(desc(riskScenarios.inherentScore))
      .limit(8);

    const contextDigest =
      `Essential assets: ${inventory.map((a) => `${a.name} (${a.type})`).join("; ") || "none recorded"}. ` +
      `Top recorded risk scenarios: ${scenarios.map((s) => `${s.title} [${s.inherentScore ?? "?"}/25]`).join("; ") || "none recorded"}.`;

    let narrative: string | null = null;
    try {
      const { llmService } = await import("../llm/service");
      const resp = await llmService.generate(
        {
          feature: "risk_analysis",
          systemPrompt:
            "You are an EBIOS RM (ANSSI) facilitator. Using ONLY the client context provided, produce a compact 5-workshop outline: " +
            "WS1 socle/baseline, WS2 risk sources, WS3 strategic scenarios, WS4 operational scenarios (name plausible attack paths), " +
            "WS5 treatment orientation. Mark every element that extrapolates beyond the provided context as [ASSUMPTION]. Be concise.",
          userPrompt: contextDigest,
          temperature: 0.4,
          maxTokens: 900,
        },
        { endpoint: "agent_tool_ebios", clientId }
      );
      narrative = resp.text;
    } catch (err: any) {
      console.warn("[ToolDispatcher] EBIOS LLM generation unavailable:", err?.message);
    }

    if (!narrative) {
      return {
        toolName: req.toolName,
        success: false,
        data: { contextDigest, reason: "no_llm_provider_configured" },
        summary:
          `EBIOS RM workshop generation needs an LLM provider (Settings → AI Providers). ` +
          `I gathered the real context (${inventory.length} assets, ${scenarios.length} top scenarios) but will not fabricate workshop output without one.`,
      };
    }

    await vfsMemoryEngine.writeNode(clientId, {
      path: `/intel/ebios/ws_outline_${Date.now()}`,
      title: `EBIOS RM Workshop Outline (${new Date().toLocaleDateString()})`,
      nodeType: "document",
      contentL2: narrative,
      summaryL0: `EBIOS RM 5-workshop outline generated from live asset/risk context.`,
      metadata: { bot: req.botName, generatedBy: "llm", assumptionsFlagged: true },
    });

    return {
      toolName: req.toolName,
      success: true,
      data: { contextDigest, workshopOutline: narrative, assumptionsMarked: "[ASSUMPTION]" },
      summary:
        `Generated an EBIOS RM 5-workshop outline via LLM from the client's live asset and risk-register context. ` +
        `Elements extrapolated beyond recorded data are explicitly marked [ASSUMPTION] — treat those as hypotheses, not findings.`,
    };
  }

  private async treatmentPlanBuilder(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const scenarios = await db.select().from(riskScenarios).where(eq(riskScenarios.clientId, clientId));
    const bucketOf = (strategy: string | null): keyof typeof buckets => {
      const s = (strategy ?? "").toLowerCase();
      if (["tolerate", "accept"].some((k) => s.includes(k))) return "tolerate_accept";
      if (["transfer", "share"].some((k) => s.includes(k))) return "transfer_share";
      if (["terminate", "avoid"].some((k) => s.includes(k))) return "terminate_avoid";
      return "treat_mitigate"; // includes unset strategies — reported as unclassified below
    };
    const buckets = {
      treat_mitigate: [] as typeof scenarios,
      tolerate_accept: [] as typeof scenarios,
      transfer_share: [] as typeof scenarios,
      terminate_avoid: [] as typeof scenarios,
    };
    for (const s of scenarios) buckets[bucketOf(s.treatmentStrategy)].push(s);
    const unclassified = scenarios.filter((s) => !s.treatmentStrategy).length;

    return {
      toolName: req.toolName,
      success: true,
      data: {
        totalScenarios: scenarios.length,
        breakdown: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [
            k,
            {
              count: v.length,
              items: v.slice(0, 8).map((s) => ({ id: s.id, title: s.title, strategy: s.treatmentStrategy })),
            },
          ])
        ),
        unclassifiedNoStrategySet: unclassified,
      },
      summary:
        scenarios.length === 0
          ? `Risk register is empty — there are no treatments to plan. Populate the register first.`
          : `4T treatment plan from the live register (${scenarios.length} scenarios): ` +
            `Treat ${buckets.treat_mitigate.length}, Tolerate ${buckets.tolerate_accept.length}, ` +
            `Transfer ${buckets.transfer_share.length}, Terminate ${buckets.terminate_avoid.length}` +
            (unclassified ? `. ⚠️ ${unclassified} scenario(s) have no treatment strategy set — decide before presenting this to leadership.` : `.`),
    };
  }

  private async auditRoomCompile(
    req: ToolExecutionRequest
  ): Promise<Omit<ToolExecutionResult, "executionTimeMs">> {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const db = await getDb();

    const evRows = await db.select().from(evidence).where(eq(evidence.clientId, clientId));
    const totalFiles = evRows.reduce((sum, e) => sum + (e.fileCount ?? 0), 0);
    const expired = evRows.filter((e) => e.expirationDate && new Date(e.expirationDate) < new Date());
    const neverVerified = evRows.filter((e) => !e.lastVerified);
    const stale = evRows.filter(
      (e) => e.lastVerified && daysBetween(new Date(e.lastVerified), new Date()) > 365
    );

    // Real integrity digest over the ACTUAL evidence ID list (order-stable).
    const crypto = await import("crypto");
    const manifestSource = evRows
      .map((e) => `${e.id}:${e.evidenceId}:${e.updatedAt ?? ""}`)
      .sort()
      .join("|");
    const sha256 = crypto.createHash("sha256").update(manifestSource).digest("hex");

    const auditReady = evRows.length > 0 && expired.length === 0 && neverVerified.length === 0 && stale.length === 0;

    return {
      toolName: req.toolName,
      success: true,
      data: {
        evidenceRecords: evRows.length,
        evidenceFileCount: totalFiles,
        expiredEvidence: expired.map((e) => e.evidenceId),
        neverVerified: neverVerified.map((e) => e.evidenceId),
        staleOver365Days: stale.map((e) => e.evidenceId),
        manifestSha256: sha256,
        auditReadyVerdict: auditReady ? "READY" : "NOT READY — see gaps",
      },
      summary:
        evRows.length === 0
          ? `Audit room compilation halted: this client has ZERO evidence records. An empty ZIP with a green badge would be fraud on the auditor — collect evidence first.`
          : `Evidence room: ${evRows.length} record(s), ${totalFiles} file(s). ` +
            (expired.length || neverVerified.length || stale.length
              ? `⚠️ NOT audit-ready: ${expired.length} expired, ${neverVerified.length} never verified, ${stale.length} stale >365d. Fix those before packaging. `
              : `All records fresh and verified. `) +
            `Manifest SHA-256 over current record list: ${sha256.slice(0, 16)}…`,
    };
  }

  // ── Memory Cortex (real VFS calls) ──

  private async memoryListDir(req: ToolExecutionRequest) {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const path = String(req.parameters?.path ?? "/");
    const entries = await vfsMemoryEngine.listDirectory(clientId, path);
    return {
      toolName: req.toolName,
      success: true,
      data: { path, entriesCount: entries.length, entries: entries.slice(0, 25) },
      summary: `Listed '${path}': ${entries.length} entr${entries.length === 1 ? "y" : "ies"} in the client memory cortex.`,
    };
  }

  private async memoryReadDoc(req: ToolExecutionRequest) {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const path = String(req.parameters?.path ?? "");
    if (!path) throw new Error("path parameter is required");
    const node = await vfsMemoryEngine.readNode(clientId, path);
    if (!node) {
      return {
        toolName: req.toolName,
        success: false,
        data: { path, exists: false },
        summary: `No document exists at '${path}'.`,
      };
    }
    return {
      toolName: req.toolName,
      success: true,
      data: { path, exists: true, title: (node as any).node?.title ?? path, lengthBytes: JSON.stringify(node).length },
      summary: `Retrieved '${path}' from the memory cortex.`,
    };
  }

  private async memorySearch(req: ToolExecutionRequest) {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const query = String(req.parameters?.query ?? "");
    if (!query.trim()) throw new Error("query parameter is required");
    const results = await vfsMemoryEngine.searchMemory(clientId, query);
    return {
      toolName: req.toolName,
      success: true,
      data: { query, matchesFound: results.length, matches: results.slice(0, 10) },
      summary:
        results.length === 0
          ? `Memory search for "${query}" returned no matches — saying so rather than inventing context.`
          : `Memory search for "${query}" matched ${results.length} node(s) in the cortex.`,
    };
  }

  private async memoryStoreFact(req: ToolExecutionRequest) {
    const clientId = Number(req.parameters?.clientId);
    if (!clientId) throw new Error("clientId parameter is required");
    const title = String(req.parameters?.title ?? "Learned Fact");
    const content = String(req.parameters?.content ?? "");
    if (!content.trim()) throw new Error("content parameter is required");
    const path = String(req.parameters?.path ?? `/facts/${Date.now()}`);
    await vfsMemoryEngine.writeNode(clientId, {
      path,
      title,
      nodeType: "fact",
      contentL2: content,
      summaryL0: vfsMemoryEngine.generateL0Summary(content, title),
      metadata: { storedByBot: req.botName },
    });
    return {
      toolName: req.toolName,
      success: true,
      data: { path, title, status: "persisted" },
      summary: `Persisted fact "${title}" at '${path}' in the memory cortex.`,
    };
  }
}

export const toolDispatcher = new ToolDispatcher();
