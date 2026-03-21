
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and, sql, desc, count, isNotNull } from "drizzle-orm";

export const createMetricsRouter = (t: any, procedure: any) => {
    return t.router({
        getDashboard: procedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const now = new Date();
                const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

                // 1. Fetch Data in Parallel
                const [
                    risks,
                    controls,
                    vendors,
                    vendorAssessments,
                    vulnerabilities,
                    assets,
                    employees,
                    trainingAssignments,
                    incidents,
                    breaches,
                    policies,
                    acknowledgments,
                    bcpProjects,
                    businessProcesses,
                    audits,
                    evidence
                ] = await Promise.all([
                    db.query.riskAssessments.findMany({
                        where: eq(schema.riskAssessments.clientId, input.clientId),
                        with: { treatments: true }
                    }),
                    db.query.clientControls.findMany({ where: eq(schema.clientControls.clientId, input.clientId) }),
                    db.query.vendors.findMany({ where: eq(schema.vendors.clientId, input.clientId) }),
                    // Assuming vendorAssessments are linked to vendors which are linked to client. 
                    // Need to filter assessments by vendors belonging to this client.
                    // Simplified: Fetch all vendors first, then assessments for those vendors.
                    // For performance, we'll do a separate query or join if needed. 
                    // Let's assume we can fetch all assessments and filter in memory for this "Deep" logic prototype
                    // or better, find assessments where vendor.clientId = input.clientId.
                    // Since Drizzle 'findMany' on relations is tricky without setup, we'll iterate.
                    db.select().from(schema.vendorAssessments)
                        .leftJoin(schema.vendors, eq(schema.vendorAssessments.vendorId, schema.vendors.id))
                        .where(eq(schema.vendors.clientId, input.clientId)),
                    
                    db.query.vulnerabilities.findMany({ where: eq(schema.vulnerabilities.clientId, input.clientId) }),
                    db.query.assets.findMany({ where: eq(schema.assets.clientId, input.clientId) }),
                    db.query.employees.findMany({ where: eq(schema.employees.clientId, input.clientId) }),
                    db.select().from(schema.trainingAssignments)
                        .leftJoin(schema.employees, eq(schema.trainingAssignments.employeeId, schema.employees.id))
                        .where(eq(schema.employees.clientId, input.clientId)),
                    
                    db.query.incidents.findMany({ where: eq(schema.incidents.clientId, input.clientId) }),
                    db.query.dataBreaches.findMany({ where: eq(schema.dataBreaches.clientId, input.clientId) }),
                    db.query.clientPolicies.findMany({ where: eq(schema.clientPolicies.clientId, input.clientId) }),
                    db.select().from(schema.employeeAcknowledgments)
                        .leftJoin(schema.employees, eq(schema.employeeAcknowledgments.employeeId, schema.employees.id))
                        .where(eq(schema.employees.clientId, input.clientId)),

                    db.query.bcpProjects.findMany({ where: eq(schema.bcpProjects.clientId, input.clientId) }),
                    db.query.businessProcesses.findMany({ where: eq(schema.businessProcesses.clientId, input.clientId) }),
                    db.query.certificationAudits.findMany({ where: eq(schema.certificationAudits.clientId, input.clientId) }),
                    db.query.evidence.findMany({ where: eq(schema.evidence.clientId, input.clientId) })
                ]);

                // --- DOMAIN 1: Strategic Risk ---
                let totalResidualScore = 0;
                let criticalRisksUnmitigated = 0;
                const riskScores: Record<string, number> = {}; // Category -> Score Sum

                risks.forEach((r: any) => {
                    const likelihood = r.likelihood || 0;
                    const impact = r.impact || 0;
                    const inherent = likelihood * impact;
                    const residual = r.residualRisk ? parseInt(r.residualRisk) : inherent; // Simplify parsing

                    totalResidualScore += residual;

                    // Critical Risk Exposure (Critical + No Treatments)
                    if (inherent >= 15 && (!r.treatments || r.treatments.length === 0)) {
                        criticalRisksUnmitigated++;
                    }

                    // Risk Categories
                    const cat = r.category || 'Uncategorized';
                    riskScores[cat] = (riskScores[cat] || 0) + residual;
                });

                // Metric 1: Risk Appetite Consumption (Assume Max Capacity = 500 for demo, or derived)
                const maxRiskCapacity = Math.max(500, risks.length * 10); // Dynamic baseline
                const riskAppetiteConsumption = Math.min(100, Math.round((totalResidualScore / maxRiskCapacity) * 100));

                // Metric 3: Risk Velocity (New vs Closed in 30 days)
                // Need createdAt/updatedAt. Assuming standard timestamps exist.
                const newRisks = risks.filter((r: any) => new Date(r.createdAt) > thirtyDaysAgo).length;
                const closedRisks = risks.filter((r: any) => r.status === 'closed' && new Date(r.updatedAt) > thirtyDaysAgo).length;
                const riskVelocity = newRisks - closedRisks; // Net new risks

                // --- DOMAIN 2: Cyber & Vulnerability ---
                const openVulns = vulnerabilities.filter((v: any) => v.status !== 'closed');
                const vulnDensity = assets.length > 0 ? (openVulns.length / assets.length).toFixed(1) : "0";
                
                // MTTR (Mock logic if closedAt missing, use updatedAt for closed items)
                const closedVulns = vulnerabilities.filter((v: any) => v.status === 'closed');
                const totalRemediationTime = closedVulns.reduce((acc: number, v: any) => {
                    const start = new Date(v.createdAt).getTime();
                    const end = new Date(v.updatedAt).getTime(); // Proxy for closedAt
                    return acc + (end - start);
                }, 0);
                const mttr = closedVulns.length > 0 ? Math.round((totalRemediationTime / closedVulns.length) / (1000 * 60 * 60 * 24)) : 0;

                const criticalAssets = assets.filter((a: any) => (a.valuationC || 0) + (a.valuationI || 0) + (a.valuationA || 0) >= 12); // High value
                const assessedAssets = assets.filter((a: any) => a.criticality && a.valuationC && a.valuationI && a.valuationA).length;
                const assetCriticalityCoverage = assets.length > 0 ? Math.round((assessedAssets / assets.length) * 100) : 0; 

                // --- DOMAIN 2.5: Incident & Breach Response ---
                const significantIncidents = incidents.filter((i: any) => i.isSignificant).length;
                const crossBorderIncidents = incidents.filter((i: any) => i.crossBorderImpact).length;
                
                // Reporting Timeliness (Early Warning within 24h)
                const timelyReports = incidents.filter((i: any) => {
                    if (!i.detectedAt || !i.earlyWarningSentAt) return false;
                    const diff = new Date(i.earlyWarningSentAt).getTime() - new Date(i.detectedAt).getTime();
                    return diff <= 24 * 60 * 60 * 1000;
                }).length;
                const reportingTimeliness = incidents.filter(i => i.isSignificant).length > 0
                    ? Math.round((timelyReports / incidents.filter(i => i.isSignificant).length) * 100)
                    : 100;

                // Data Breach Velocity (Detection Delta)
                const totalBreachDelta = breaches.reduce((acc: number, b: any) => {
                    if (!b.dateOccurred || !b.dateDetected) return acc;
                    return acc + (new Date(b.dateDetected).getTime() - new Date(b.dateOccurred).getTime());
                }, 0);
                const avgBreachDetectionDays = breaches.length > 0 
                    ? Math.round((totalBreachDelta / breaches.length) / (1000 * 60 * 60 * 24))
                    : 0;
                
                const notifiableBreaches = breaches.filter((b: any) => b.isNotifiableToDpa || b.isNotifiableToSubjects).length;

                // --- DOMAIN 3: Governance & Culture ---
                const activeEmployees = employees.filter((e: any) => e.status !== 'terminated');
                const mandatoryPolicies = policies.filter((p: any) => p.status === 'published'); // Simplified
                // Acknowledgment Rate
                const totalacks = acknowledgments.length;
                const requiredAcks = activeEmployees.length * mandatoryPolicies.length;
                const policyAckRate = requiredAcks > 0 ? Math.round((totalacks / requiredAcks) * 100) : 0;

                // Training Completion
                const assignedTrainings = trainingAssignments.length;
                const completedTrainings = trainingAssignments.filter((t: any) => t.training_assignments.status === 'completed').length;
                const trainingCompletionRate = assignedTrainings > 0 ? Math.round((completedTrainings / assignedTrainings) * 100) : 0;

                // Human Error Incidents
                const humanErrorCount = incidents.filter((i: any) => i.cause === 'human_error' || i.cause === 'phishing').length;

                // --- DOMAIN 4: Third-Party Risk ---
                const criticalVendors = vendors.filter((v: any) => v.criticality === 'high' || v.criticality === 'critical');
                const criticalVendorHealth = criticalVendors.length > 0 
                    ? Math.round(criticalVendors.reduce((acc: number, v: any) => acc + (v.riskScore || 0), 0) / criticalVendors.length)
                    : 100; // 100 = Perfect health (inverted risk score usually? Assuming 0-100 risk score where 100 is safe? Or 0 safe? Let's assume 0 is safe, 100 is high risk).
                    // Correction: Usually Risk Score is High = Bad. Let's assume High Risk Score = Bad Health.
                    // Metric: "Average Risk Score"

                const assessedVendors = new Set(vendorAssessments.map((va: any) => va.vendor_assessments.vendorId));
                const vendorAssessmentCoverage = vendors.length > 0 ? Math.round((assessedVendors.size / vendors.length) * 100) : 0;

                // --- DOMAIN 5: Compliance ---
                const implementedControls = controls.filter((c: any) => c.status === 'implemented');
                const effectiveControls = implementedControls.filter((c: any) => c.testResult === 'pass' || c.testResult === 'effective');
                const controlEffectiveness = implementedControls.length > 0 ? Math.round((effectiveControls.length / implementedControls.length) * 100) : 0;

                const verifiedEvidence = evidence.filter((e: any) => e.status === 'verified').length;
                const evidenceVerificationRate = evidence.length > 0 ? Math.round((verifiedEvidence / evidence.length) * 100) : 0;

                // --- DOMAIN 6: Business Continuity ---
                const criticalProcesses = businessProcesses.filter((bp: any) => bp.criticality === 'high'); // Assuming field exists or using proxy
                const biaComplete = criticalProcesses.filter((bp: any) => bp.biaStatus === 'completed'); // Proxy
                const biaCompletionRate = criticalProcesses.length > 0 ? Math.round((biaComplete.length / criticalProcesses.length) * 100) : 0;


                return {
                    strategic: {
                        riskAppetiteConsumption,
                        criticalRisksUnmitigated,
                        riskVelocity,
                        topRiskCategories: Object.entries(riskScores).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
                    },
                    cyber: {
                        mttr,
                        vulnDensity,
                        openVulns: openVulns.length,
                        assetCriticalityCoverage
                    },
                    culture: {
                        policyAckRate,
                        trainingCompletionRate,
                        humanErrorCount,
                        activeEmployees: activeEmployees.length
                    },
                    supplyChain: {
                        avgCriticalVendorRisk: criticalVendorHealth, // Assuming avg risk score
                        vendorAssessmentCoverage,
                        totalVendors: vendors.length,
                        criticalVendors: criticalVendors.length
                    },
                    compliance: {
                        controlEffectiveness,
                        totalControls: controls.length,
                        implementedControls: implementedControls.length,
                        auditCount: audits.length,
                        evidenceVerificationRate
                    },
                    resilience: {
                        biaCompletionRate,
                        activeProjects: bcpProjects.filter((p: any) => p.status === 'active').length
                    },
                    ops: {
                        significantIncidents,
                        crossBorderIncidents,
                        reportingTimeliness,
                        avgBreachDetectionDays,
                        notifiableBreaches
                    },
                    raw: {
                        risks: risks // Keep for heatmap
                    }
                };
            }),
    });
};
