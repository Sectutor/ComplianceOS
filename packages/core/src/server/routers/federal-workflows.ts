import { z } from "zod";
import * as schema from "../../schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { validateOscalDocument, normalizeOscalDocument, oscalUuidFromSeed } from "../../lib/federal/oscalImport";
import {
  computeSprsPerPracticeDeduction,
  getCmmcPracticeRegister,
  getPracticesBy800171Id,
} from "../../lib/federal/cmmcRegister";

/**
 * Federal Workflow Intelligence Router (Phase 2)
 *
 * Implements the artifact-to-artifact federal compliance chain:
 *   SAR findings → POA&M items  (syncSarToPoam)
 *   POA&M closure → SPRS score recalculation  (recalcSprsFromPoam / getSprsBreakdown)
 *   SSP → OSCAL export  (exportSspOscal)
 *   POA&M → OSCAL export  (exportPoamOscal)
 *   CMMC L2 practice scoring + readiness  (getCmmcReadiness)
 *   CMMC 800-171 practice register query  (cmmcPractices — GAP-20)
 *   DFARS/CIRCIA incident reporting clocks  (getReportingClocks, checkIncidentReportingDeadlines)
 *   Continuous Monitoring dashboard  (getConMonDashboard, incl. ATO expiry tracking)
 *   eMASS-compatible CSV export  (exportPoamEmassCsv)
 *   External OSCAL import + validation  (importOscal)
 *
 * NIST SP 800-171 DoD Assessment Methodology deduction values are used for
 * SPRS scoring (GAP-21): each unmet practice deducts its fixed per-practice
 * point value from 110 via lib/federal/cmmcRegister.ts — the single source of
 * truth for register practice ids and their deduction points.
 */

// ─────────────────────────────────────────────────────────────────────────────
// GAP-19: OSCAL import — single-source-of-truth input schema for importOscal.
// Accepts the RAW OSCAL JSON text; parsing/validation/normalization happen in
// the pure zero-dep lib/federal/oscalImport engine, never in the DB layer.
// ─────────────────────────────────────────────────────────────────────────────
export const oscalImportInputSchema = z.object({ content: z.string() });
export type OscalImportInput = z.infer<typeof oscalImportInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// GAP-20: CMMC practice register — single-source-of-truth input schema for
// cmmcPractices. All fields optional: family (normalized trim+uppercase),
// level (literal 1|2|3 — out-of-range values like 4 or string "2" fail
// BAD_REQUEST at the boundary), search (case-insensitive substring). Pure
// passthrough over lib/federal/cmmcRegister — NO DB access, deterministic.
// ─────────────────────────────────────────────────────────────────────────────
export const cmmcPracticesInputShape = {
    /** 800-171 family code (e.g. "AC"); normalized via trim + uppercase */
    family: z.string().transform((v) => v.trim().toUpperCase()).optional(),
    /** CMMC maturity level; literal union rejects e.g. 4 or "2" */
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    /** Case-insensitive substring over id + title + requirement */
    search: z.string().optional(),
};

export const cmmcPracticesInputSchema = z.object(cmmcPracticesInputShape);
export type CmmcPracticesInput = z.infer<typeof cmmcPracticesInputSchema>;

// Standard DoD assessment deductions by 800-171 control family weight.
// Simplified mapping per DoD Assessment Methodology v1.2.1 (basic self-assessment):
const DOD_171_DEDUCTIONS: Record<string, number> = {
  "3.1.12": 5, // AC.L2-3.1.12
  "3.6.3": 5,  // IR.L2-3.6.3 incident response/testing
  "3.12.3": 5, // CA.L2-3.12.3 security plan
  "3.13.16": 5,// SC.L2-3.13.16 CUI at rest
  "3.14.3": 5, // SR.L2-3.14.3 supplier notifications... actually -1 partials handled dynamically
};

// Full 320-objective → practice rollup uses these base deductions; partial credit is not
// allowed in basic assessments (objective met or not), so we score per-practice.

export const createFederalWorkflowRouter = (t: any, clientProcedure: any) => {
    return t.router({

        // ────────────────────────────────────────────────────────────────
        // P0-1: SAR findings → POA&M sync
        // Creates POA&M items from unsynchronized SAR findings that did not
        // fully satisfy their control. Dedupe key: sarId+controlId in sourceIdentifier.
        // ────────────────────────────────────────────────────────────────
        syncSarToPoam: clientProcedure
            .input(z.object({ clientId: z.number(), sarId: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();

                const [sar] = await dbConn.select().from(schema.federalSARs)
                    .where(and(eq(schema.federalSARs.id, input.sarId), eq(schema.federalSARs.clientId, input.clientId)));
                if (!sar) throw new Error("SAR not found");

                const findings = await dbConn.select().from(schema.federalSarFindings)
                    .where(eq(schema.federalSarFindings.sarId, input.sarId));
                const actionable = findings.filter((f: any) => f.result !== "satisfied" && f.result !== "not_applicable");

                // Find or create the remediation POA&M for this SAR
                let [poam] = await dbConn.select().from(schema.federalPoams)
                    .where(and(
                        eq(schema.federalPoams.clientId, input.clientId),
                        eq(schema.federalPoams.title, `POA&M — ${sar.systemAcronym || "System"} Remediation (${sar.title?.slice(0, 20)})`)
                    ));
                if (!poam) {
                    [poam] = await dbConn.insert(schema.federalPoams).values({
                        clientId: input.clientId,
                        title: `POA&M — ${sar.systemAcronym || "System"} Remediation (${sar.title?.slice(0, 20)})`,
                        status: "open",
                        sspId: sar.sspId ?? undefined,
                        fismaSystemId: sar.fismaSystemId ?? undefined,
                        updatedAt: new Date(),
                    }).returning();
                }

                // Existing items to dedupe against
                const existingItems = await dbConn.select().from(schema.poamItems)
                    .where(eq(schema.poamItems.poamId, poam.id));
                const existingKeys = new Set(existingItems.map((i: any) => i.sourceIdentifier));

                let created = 0;
                for (const f of actionable) {
                    const key = `SAR-${input.sarId}-${f.controlId}`;
                    if (existingKeys.has(key)) continue;

                    const riskMap: Record<string, string> = { high: "high", moderate: "medium", low: "low" };
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + (f.riskLevel === "high" ? 90 : f.riskLevel === "moderate" ? 180 : 365));

                    await dbConn.insert(schema.poamItems).values({
                        poamId: poam.id,
                        controlId: f.controlId,
                        weaknessName: `${f.controlId} — ${f.result}`,
                        weaknessDescription: f.observation || "",
                        pointOfContact: sar.assessorName || "Federal Compliance",
                        weaknessDetectorSource: "Independent Assessment",
                        sourceIdentifier: key,
                        status: "open",
                        originalRiskRating: riskMap[f.riskLevel] || "medium",
                        adjustedRiskRating: riskMap[f.residualRiskLevel || f.riskLevel] || "medium",
                        scheduledCompletionDate: dueDate,
                        originalDetectionDate: sar.assessmentDate || new Date(),
                        milestones: [
                            { milestone: "Remediation plan approved", due: dueDate.toISOString() },
                        ],
                        overallRemediationPlan: f.remediationPlan || "",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    created++;
                }
                return { poamId: poam.id, findingsTotal: findings.length, actionable: actionable.length, created };
            }),

        // ────────────────────────────────────────────────────────────────
        // P0-2 / GAP-21: SPRS score breakdown computed live from POA&M state.
        // Score starts at 110; each open/ongoing POA&M item mapped to an
        // 800-171 practice subtracts its fixed per-practice DoD deduction.
        // ────────────────────────────────────────────────────────────────
        getSprsBreakdown: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();

                // Open POA&M items joined through their parent POA&M for this client
                const openItems = await dbConn.execute(sql`
                    SELECT pi.control_id, pi.status, pi.original_risk_rating
                    FROM poam_items pi
                    JOIN federal_poams fp ON fp.id = pi.poam_id
                    WHERE fp.client_id = ${input.clientId}
                      AND pi.status NOT IN ('closed','completed','cancelled')`);

                const unmetPractices = new Set<string>();
                for (const row of (openItems.rows || [])) {
                    const cid: string = (row as any).control_id || "";
                    // Map 800-53 style controls to representative 800-171 practices
                    const map: Record<string, string[]> = {
                        "AC-2(3)": ["3.1.1", "3.1.2"], "AC-2": ["3.1.1"], "AC-3": ["3.1.2"],
                        "AC-6": ["3.1.5"], "AT-3": ["3.2.2"], "AU-2": ["3.3.1"], "AU-6": ["3.3.9"],
                        "CA-5": ["3.11.2"], "CA-7": ["3.11.3"], "CM-6": ["3.4.1"], "CM-7": ["3.4.2"],
                        "IA-2": ["3.5.1"], "IA-5": ["3.5.7"], "IR-8": ["3.6.2", "3.6.3"],
                        "MA-4": ["3.7.4"], "RA-5": ["3.11.2"], "SA-9": ["3.14.3"],
                        "SC-8": ["3.13.8"], "SC-28": ["3.13.16"], "SI-2": ["3.14.1"], "SR-6": ["3.14.3"],
                    };
                    for (const p of map[cid.split("(")[0]] || []) unmetPractices.add(p);
                }

                // GAP-21: true per-practice DoD Assessment Methodology deductions.
                // Bare 800-171 ids from the control map resolve onto canonical
                // CMMC register practice ids; every unmet practice then deducts
                // its fixed whole-point share of the 110-point scale (pure lib
                // engine — never throws, deterministic ordering).
                const unmetPracticeIds = [...unmetPractices].flatMap(
                    (bareId) => getPracticesBy800171Id(bareId),
                );
                const result = computeSprsPerPracticeDeduction(unmetPracticeIds);
                const score = result.score;

                // Persist latest computed score as an assessment snapshot
                const existing = await dbConn.select().from(schema.federalSprsAssessments)
                    .where(and(eq(schema.federalSprsAssessments.clientId, input.clientId), eq(schema.federalSprsAssessments.status, "computed")))
                    .limit(1);
                if (existing.length) {
                    await dbConn.update(schema.federalSprsAssessments)
                        .set({ score, updatedAt: new Date() })
                        .where(eq(schema.federalSprsAssessments.id, existing[0].id));
                } else {
                    await dbConn.insert(schema.federalSprsAssessments).values({
                        clientId: input.clientId,
                        title: "SPRS Score — Computed from Open POA&Ms (per-practice DoD Assessment Methodology deductions)",
                        score,
                        scopeDescription: "Auto-computed from open POA&M items using per-practice DoD Assessment Methodology deductions.",
                        status: "computed",
                        updatedAt: new Date(),
                    });
                }

                return {
                    startingScore: 110,
                    deduction: result.deductedPoints,
                    score: result.score,
                    unmetPracticeCount: result.unmetCount,
                    unknownIdCount: result.unknownIdCount,
                    familiesAffected: result.familiesAffected,
                    openPoamItems: (openItems.rows || []).length,
                    breakdown: result.breakdown,
                    model: "per-practice-dod-assessment-methodology",
                    note: "Basic self-assessment model per DFARS 252.204-7019/7020 with per-practice DoD Assessment Methodology deductions. Closing the associated POA&M items raises this score.",
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // P1-1: OSCAL export for an SSP (OSCAL 1.1.2 component-definition/
        // system-security-plan shape, minimal but valid structure).
        // ────────────────────────────────────────────────────────────────
        exportSspOscal: clientProcedure
            .input(z.object({ clientId: z.number(), sspId: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [ssp] = await dbConn.select().from(schema.federalSSPs)
                    .where(and(eq(schema.federalSSPs.id, input.sspId), eq(schema.federalSSPs.clientId, input.clientId)));
                if (!ssp) throw new Error("SSP not found");

                const controls = await dbConn.select().from(schema.federalSspControls)
                    .where(eq(schema.federalSspControls.sspId, input.sspId));

                const statusMap: Record<string, string> = {
                    implemented: "implemented",
                    partial: "partial", partially_implemented: "partial",
                    planned: "planned", alternative_implementation: "alternative",
                    not_applicable: "not-applicable",
                };

                return {
                    oscalVersion: "1.1.2",
                    uuid: oscalUuidFromSeed(`oscal-ssp-${ssp.id}-${input.clientId}`),
                    metadata: {
                        title: ssp.title,
                        lastModified: ssp.updatedAt?.toISOString(),
                        version: String(ssp.version ?? 1),
                        oscalModel: "system-security-plan",
                    },
                    systemCharacteristics: {
                        systemName: ssp.systemName,
                        description: ssp.boundaryDescription || ssp.content || "",
                        securitySensitivityLevel: "moderate",
                        systemOperationalStatus: { status: ssp.status },
                    },
                    controlImplementationSrc: controls.map((c: any) => ({
                        controlId: c.controlId,
                        implementedRequirement: {
                            description: c.implementationDescription,
                            responsibleRole: c.responsibleRole,
                            status: statusMap[c.implementationStatus] || "planned",
                            evidenceLinks: c.evidenceLinks,
                        },
                    })),
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // P1-2: OSCAL export for a POA&M (plan-of-action-and-milestones model)
        // ────────────────────────────────────────────────────────────────
        exportPoamOscal: clientProcedure
            .input(z.object({ clientId: z.number(), poamId: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [poam] = await dbConn.select().from(schema.federalPoams)
                    .where(and(eq(schema.federalPoams.id, input.poamId), eq(schema.federalPoams.clientId, input.clientId)));
                if (!poam) throw new Error("POA&M not found");
                const items = await dbConn.select().from(schema.poamItems)
                    .where(eq(schema.poamItems.poamId, input.poamId));

                return {
                    oscalVersion: "1.1.2",
                    uuid: oscalUuidFromSeed(`oscal-poam-${poam.id}-${input.clientId}`),
                    metadata: { title: poam.title, lastModified: poam.updatedAt?.toISOString(), version: String(poam.version ?? 1), oscalModel: "plan-of-action-and-milestones" },
                    milestones: [],
                    observations: items.map((i: any) => ({
                        uuid: oscalUuidFromSeed(`oscal-poam-obs-${poam.id}-${i.id}`),
                        title: i.weaknessName,
                        description: i.weaknessDescription,
                        methods: i.weaknessDetectorSource === "Independent Assessment" ? ["EXAMINE", "INTERVIEW"] : ["EXAMINE"],
                        relevantEvidence: i.supportingDocuments || [],
                    })),
                    tasks: items.map((i: any) => ({
                        uuid: oscalUuidFromSeed(`oscal-poam-task-${poam.id}-${i.id}`),
                        title: i.weaknessName,
                        description: i.overallRemediationPlan,
                        timing: i.scheduledCompletionDate ? { onDate: i.scheduledCompletionDate } : undefined,
                        associatedControls: i.controlId ? [i.controlId] : [],
                        status: i.status === "closed" ? "completed" : "in-progress",
                        riskRating: i.adjustedRiskRating,
                    })),
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // P1-3: CMMC Level 2 readiness — per-practice rollup from SSP
        // controls and POA&M state, scored against the CMMC assessment
        // maturity levels (SS/PB scale proxy).
        // ────────────────────────────────────────────────────────────────
        getCmmcReadiness: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();

                const ssps = await dbConn.select().from(schema.federalSSPs)
                    .where(eq(schema.federalSSPs.clientId, input.clientId));
                if (!ssps.length) return { ready: false, reason: "No SSP on file" };
                const sspIds = ssps.map((s: any) => s.id);

                const controls = await dbConn.select().from(schema.federalSspControls)
                    .where(inArray(schema.federalSspControls.sspId, sspIds));

                const implemented = controls.filter((c: any) => c.implementationStatus === "implemented").length;
                const partial = controls.filter((c: any) =>
                    c.implementationStatus === "partial" || c.implementationStatus === "partially_implemented").length;
                const planned = controls.filter((c: any) => c.implementationStatus === "planned").length;
                const assessed = implemented + partial + planned;

                // Evidence-backed ratio (CMMC gives no credit without evidence)
                const withEvidence = controls.filter((c: any) =>
                    Array.isArray(c.evidenceLinks) ? c.evidenceLinks.length > 0 : !!c.evidenceLinks).length;

                // Open POA&M items signal remaining weaknesses
                const openPoams = await dbConn.execute(sql`
                    SELECT count(*)::int AS n FROM poam_items pi
                    JOIN federal_poams fp ON fp.id = pi.poam_id
                    WHERE fp.client_id = ${input.clientId} AND pi.status NOT IN ('closed','completed')`);
                const openWeaknesses = (openPoams.rows?.[0] as any)?.n || 0;

                // SS/PB proxy: weighted readiness percentage
                const rawScore = assessed === 0 ? 0 :
                    ((implemented + partial * 0.5) / assessed) * 100;
                const evidencePenalty = assessed ? (assessed - withEvidence) / assessed * 15 : 15;
                const readinessPct = Math.max(0, Math.min(100, Math.round(rawScore - evidencePenalty)));

                const levelBand = readinessPct >= 88 ? "SS/PB 5 (Effective)"
                    : readinessPct >= 75 ? "SS/PB 4 (Substantially Effective)"
                    : readinessPct >= 60 ? "SS/PB 3 (Generally Effective)"
                    : readinessPct >= 40 ? "SS/PB 2 (Partially Effective)" : "SS/PB 1 (Inadequate)";

                return {
                    assessedControls: assessed,
                    implemented,
                    partial,
                    planned,
                    evidenceBackedControls: withEvidence,
                    openWeaknesses,
                    readinessPct,
                    ssPBProxy: levelBand,
                    cmmcL2Target: "All 110 NIST 800-171 practices + Annex A at MATURITY LEVEL 3 with full evidence coverage",
                    gapsToClose: [
                        ...(partial > 0 ? [`${partial} partially-implemented controls need completion`] : []),
                        ...(planned > 0 ? [`${planned} planned-only controls need implementation`] : []),
                        ...(assessed - withEvidence > 0 ? [`${assessed - withEvidence} controls lack linked evidence`] : []),
                        ...(openWeaknesses > 0 ? [`${openWeaknesses} open POA&M weaknesses`] : []),
                    ],
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // GAP-20: CMMC practice register (NIST SP 800-171 Rev 2) — pure,
        // deterministic reference query over lib/federal/cmmcRegister.
        // NO DB access on this path. practices/total honor the optional
        // family/level/search filter; families ALWAYS describes the full
        // 110-practice register rollup.
        // ────────────────────────────────────────────────────────────────
        cmmcPractices: clientProcedure
            .input(cmmcPracticesInputSchema)
            .query(({ input }: any) => getCmmcPracticeRegister(input)),

        // ────────────────────────────────────────────────────────────────
        // P2-1: Federal incident reporting clocks (DFARS 252.204-7012 72h
        // to DIBNet; CIRCIA 72h to CISA; FISMA feed flag).
        // ────────────────────────────────────────────────────────────────
        getReportingClocks: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const incidents = await dbConn.select().from(schema.incidents)
                    .where(eq(schema.incidents.clientId, input.clientId))
                    .orderBy(desc(schema.incidents.detectedAt));

                const clocks = incidents.map((inc: any) => {
                    const detected = inc.detectedAt ? new Date(inc.detectedAt) : null;
                    const dfarsDeadline = detected ? new Date(detected.getTime() + 72 * 3600e3) : null;
                    const circiaDeadline = detected ? new Date(detected.getTime() + 72 * 3600e3) : null;
                    const now = Date.now();
                    const hoursLeft = detected ? Math.max(0, Math.round(((dfarsDeadline!.getTime()) - now) / 3600e3)) : null;

                    return {
                        incidentId: inc.id,
                        title: inc.title,
                        severity: inc.severity,
                        detectedAt: inc.detectedAt,
                        reportedToAuthorities: inc.reportedToAuthorities,
                        dfars7012Applies: true, // Apex operates under DFARS contracts
                        dfarsReportDueBy: dfarsDeadline?.toISOString(),
                        hoursRemainingForDibNet: inc.reportedToAuthorities ? null : hoursLeft,
                        dibnetStatus: inc.reportedToAuthorities ? "reported"
                            : hoursLeft === null ? "unknown"
                            : hoursLeft > 24 ? "on-track"
                            : hoursLeft > 0 ? "URGENT (<24h)" : "OVERDUE",
                        circiaReportDueBy: circiaDeadline?.toISOString(),
                        circiaStatus: inc.reportedToAuthorities ? "reported" : "pending",
                        evidenceRetentionUntil: detected ? new Date(detected.getTime() + 90 * 24 * 3600e3).toISOString() : null,
                        fismaFeedRequired: !!inc.isSignificant,
                    };
                });
                return { clocks, note: "DFARS 252.204-7012 requires reporting covered cyber incidents to DoD via DIBNet within 72h of detection and preserving images/evidence for 90 days." };
            }),

        // ────────────────────────────────────────────────────────────────
        // P2-2: ConMon dashboard — control posture, POA&M aging, ATO/RMF state
        // ────────────────────────────────────────────────────────────────
        getConMonDashboard: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();

                const systems = await dbConn.select().from(schema.federalFismaSystems)
                    .where(eq(schema.federalFismaSystems.clientId, input.clientId));

                const sspRows = await dbConn.select().from(schema.federalSSPs)
                    .where(eq(schema.federalSSPs.clientId, input.clientId));
                const sspIds = sspRows.map((s: any) => s.id);
                const controls = sspIds.length
                    ? await dbConn.select().from(schema.federalSspControls).where(inArray(schema.federalSspControls.sspId, sspIds))
                    : [];

                const poamAging = await dbConn.execute(sql`
                    SELECT pi.id, pi.weakness_name, pi.original_risk_rating, pi.scheduled_completion_date,
                           GREATEST(0, EXTRACT(day FROM now()::timestamp - pi.scheduled_completion_date)::int) AS days_overdue
                    FROM poam_items pi JOIN federal_poams fp ON fp.id = pi.poam_id
                    WHERE fp.client_id = ${input.clientId}
                      AND pi.status NOT IN ('closed','completed')
                      AND pi.scheduled_completion_date < now()
                    ORDER BY days_overdue DESC`);

                const rmfWorkflows = await dbConn.select().from(schema.federalRmfWorkflows)
                    .where(eq(schema.federalRmfWorkflows.clientId, input.clientId));

                const inherited = await dbConn.select().from(schema.federalInheritances)
                    .where(eq(schema.federalInheritances.clientId, input.clientId));

                const reports = await dbConn.select().from(schema.federalFismaReports)
                    .where(eq(schema.federalFismaReports.clientId, input.clientId))
                    .orderBy(desc(schema.federalFismaReports.updatedAt)).limit(1);

                return {
                    systems: systems.map((s: any) => ({
                        id: s.id, name: s.name, acronym: s.acronym, fips199: s.fips199Overall,
                        status: s.status,
                        // ATO expiry proxy: RMF step 6 operating systems re-authorize every 3 years
                        authorizationCycleEnds: s.updatedAt ? new Date(new Date(s.updatedAt).getTime() + 3 * 365 * 24 * 3600e3).toISOString() : null,
                    })),
                    controlPosture: {
                        total: controls.length,
                        implemented: controls.filter((c: any) => c.implementationStatus === "implemented").length,
                        partial: controls.filter((c: any) => (c.implementationStatus || "").startsWith("partial")).length,
                        inherited: inherited.length,
                    },
                    overduePoamItems: (poamAging.rows || []).map((r: any) => ({
                        id: (r as any).id, weakness: (r as any).weakness_name,
                        risk: (r as any).original_risk_rating,
                        daysOverdue: (r as any).days_overdue,
                    })),
                    rmfSteps: rmfWorkflows.map((w: any) => ({ system: w.systemName, currentStep: w.currentStep, status: w.stepStatus })),
                    significantChangePending: false,
                    latestFismaReport: reports[0] || null,
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // P3-1: eMASS-compatible CSV export of a POA&M
        // ────────────────────────────────────────────────────────────────
        exportPoamEmassCsv: clientProcedure
            .input(z.object({ clientId: z.number(), poamId: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [poam] = await dbConn.select().from(schema.federalPoams)
                    .where(and(eq(schema.federalPoams.id, input.poamId), eq(schema.federalPoams.clientId, input.clientId)));
                if (!poam) throw new Error("POA&M not found");
                const items = await dbConn.select().from(schema.poamItems)
                    .where(eq(schema.poamItems.poamId, input.poamId));

                const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                const header = [
                    "POAM ID", "Control ID", "Weakness Name", "Weakness Description", "Point of Contact",
                    "Detection Source", "Source Identifier", "Status", "Original Risk Rating",
                    "Adjusted Risk Rating", "Scheduled Completion", "Detection Date", "Milestones",
                    "Remediation Plan", "Asset Identifier", "Vendor Dependency", "False Positive",
                ].join(",");
                const rows = items.map((i: any) => [
                    esc(`ACG-POAM-${i.poamId}-${i.id}`), esc(i.controlId), esc(i.weaknessName),
                    esc(i.weaknessDescription), esc(i.pointOfContact), esc(i.weaknessDetectorSource),
                    esc(i.sourceIdentifier), esc(i.status), esc(i.originalRiskRating),
                    esc(i.adjustedRiskRating),
                    esc(i.scheduledCompletionDate ? new Date(i.scheduledCompletionDate).toISOString().slice(0, 10) : ""),
                    esc(i.originalDetectionDate ? new Date(i.originalDetectionDate).toISOString().slice(0, 10) : ""),
                    esc(Array.isArray(i.milestones) ? i.milestones.map((m: any) => `${m.milestone} (due ${m.due})`).join("; ") : ""),
                    esc(i.overallRemediationPlan), esc(i.assetIdentifier), esc(i.vendorDependency),
                    esc(i.falsePositive ? "Yes" : "No"),
                ].join(","));

                return {
                    filename: `emass_poam_${input.poamId}_${new Date().toISOString().slice(0, 10)}.csv`,
                    csv: [header, ...rows].join("\n"),
                    itemCount: items.length,
                    note: "Column layout follows the eMASS POA&M import template ordering; verify against your eMASS instance before bulk upload.",
                };
            }),

        // ────────────────────────────────────────────────────────────────
        // P4-1: OSCAL import/validation (GAP-19) — pure passthrough over
        // lib/federal/oscalImport (validate + normalize). The raw JSON text
        // is parsed here and handed to the zero-dep engine; there are NO DB
        // reads/writes on this path. Unparseable JSON surfaces as an issue
        // list (valid:false), never a thrown error.
        // ────────────────────────────────────────────────────────────────
        importOscal: clientProcedure
            .input(oscalImportInputSchema)
            .mutation(async ({ input }: any) => {
                let parsed: unknown;
                try {
                    parsed = JSON.parse(input.content);
                } catch {
                    return {
                        valid: false,
                        errors: [{ code: "invalid-json", path: "content", message: "content is not parseable JSON text" }],
                        warnings: [],
                        normalized: null,
                    };
                }

                const verdict = validateOscalDocument(parsed);
                const normalized = normalizeOscalDocument(parsed);

                return {
                    valid: verdict.valid,
                    errors: verdict.errors,
                    warnings: verdict.warnings,
                    normalized: normalized.ok ? normalized.document : null,
                };
            }),
    });
};
