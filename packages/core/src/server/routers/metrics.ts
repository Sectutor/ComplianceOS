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
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                // 1. Fetch Data in Parallel
                const [
                    risks,
                    riskTreatments,
                    controls,
                    vendors,
                    vendorAssessments,
                    vulnerabilities,
                    assets,
                    employees,
                    trainingAssignments,
                    incidents,
                    breaches,
                    privacyBreaches,
                    policies,
                    acknowledgments,
                    bcpProjects,
                    businessProcesses,
                    bias,
                    audits,
                    evidence
                ] = await Promise.all([
                    db.query.riskAssessments.findMany({
                        where: eq(schema.riskAssessments.clientId, input.clientId),
                        with: { treatments: true }
                    }),
                    db.query.riskTreatments.findMany({
                        where: eq(schema.riskTreatments.clientId, input.clientId)
                    }).catch(() => []),
                    db.query.clientControls.findMany({ where: eq(schema.clientControls.clientId, input.clientId) }),
                    db.query.vendors.findMany({ where: eq(schema.vendors.clientId, input.clientId) }),
                    db.select().from(schema.vendorAssessments)
                        .leftJoin(schema.vendors, eq(schema.vendorAssessments.vendorId, schema.vendors.id))
                        .where(eq(schema.vendors.clientId, input.clientId))
                        .catch(() => []),
                    db.query.vulnerabilities.findMany({ where: eq(schema.vulnerabilities.clientId, input.clientId) }),
                    db.query.assets.findMany({ where: eq(schema.assets.clientId, input.clientId) }),
                    db.query.employees.findMany({ where: eq(schema.employees.clientId, input.clientId) }),
                    db.select().from(schema.trainingAssignments)
                        .leftJoin(schema.employees, eq(schema.trainingAssignments.employeeId, schema.employees.id))
                        .where(eq(schema.employees.clientId, input.clientId))
                        .catch(() => []),
                    db.query.incidents.findMany({ where: eq(schema.incidents.clientId, input.clientId) }),
                    db.query.dataBreaches.findMany({ where: eq(schema.dataBreaches.clientId, input.clientId) }),
                    db.query.privacyAssessments.findMany({
                        where: and(
                            eq(schema.privacyAssessments.clientId, input.clientId),
                            sql`${schema.privacyAssessments.type} LIKE 'BREACH:%'`
                        )
                    }),
                    db.query.clientPolicies.findMany({ where: eq(schema.clientPolicies.clientId, input.clientId) }),
                    db.select().from(schema.employeeAcknowledgments)
                        .leftJoin(schema.employees, eq(schema.employeeAcknowledgments.employeeId, schema.employees.id))
                        .where(eq(schema.employees.clientId, input.clientId))
                        .catch(() => []),
                    db.query.bcpProjects.findMany({ where: eq(schema.bcpProjects.clientId, input.clientId) }),
                    db.query.businessProcesses.findMany({ where: eq(schema.businessProcesses.clientId, input.clientId) }),
                    db.query.businessImpactAnalyses.findMany({ where: eq(schema.businessImpactAnalyses.clientId, input.clientId) }),
                    db.query.certificationAudits.findMany({ where: eq(schema.certificationAudits.clientId, input.clientId) }),
                    db.query.evidence.findMany({ where: eq(schema.evidence.clientId, input.clientId) })
                ]);

                // Index treatments by riskAssessmentId
                const treatmentsByAssessmentId = new Map<number, any[]>();
                (riskTreatments || []).forEach((t: any) => {
                    if (t.riskAssessmentId) {
                        const list = treatmentsByAssessmentId.get(t.riskAssessmentId) || [];
                        list.push(t);
                        treatmentsByAssessmentId.set(t.riskAssessmentId, list);
                    }
                });

                // --- DOMAIN 1: Strategic Risk ---
                let totalResidualScore = 0;
                let totalInherentScore = 0;
                let criticalRisksUnmitigated = 0;
                const riskScores: Record<string, number> = {};

                risks.forEach((r: any) => {
                    const likelihood = Number(r.likelihood) || 1;
                    const impact = Number(r.impact) || 1;
                    const inherent = Number(r.inherentScore) || (likelihood * impact);
                    const residual = Number(r.residualScore) || inherent;

                    totalInherentScore += inherent;
                    totalResidualScore += residual;

                    const itemTreatments = (r.treatments && r.treatments.length > 0)
                        ? r.treatments
                        : (treatmentsByAssessmentId.get(r.id) || []);

                    const isMitigated = itemTreatments.some((t: any) => 
                        t.status === 'completed' || t.status === 'implemented' || t.status === 'verified'
                    );

                    const isHighOrCritical = inherent >= 15 || ['high', 'critical'].includes((r.inherentRisk || '').toLowerCase());
                    if (isHighOrCritical && !isMitigated) {
                        criticalRisksUnmitigated++;
                    }

                    const cat = r.category || 'General';
                    riskScores[cat] = (riskScores[cat] || 0) + residual;
                });

                const maxRiskCapacity = Math.max(500, risks.length * 15);
                const riskAppetiteConsumption = risks.length > 0
                    ? Math.min(100, Math.round((totalResidualScore / maxRiskCapacity) * 100))
                    : 0;

                const newRisks = risks.filter((r: any) => r.createdAt && new Date(r.createdAt) > thirtyDaysAgo).length;
                const closedRisks = risks.filter((r: any) => r.status === 'closed' && r.updatedAt && new Date(r.updatedAt) > thirtyDaysAgo).length;
                const riskVelocity = newRisks - closedRisks;

                // Strategic Maturity (0-100): Percentage of risks mitigated/treated
                const strategicMaturity = risks.length > 0
                    ? Math.max(10, Math.min(100, Math.round(((risks.length - criticalRisksUnmitigated) / risks.length) * 100)))
                    : 80;

                // --- DOMAIN 2: Cyber & Vulnerability ---
                const openVulns = vulnerabilities.filter((v: any) => v.status !== 'closed' && v.status !== 'resolved');
                const closedVulns = vulnerabilities.filter((v: any) => v.status === 'closed' || v.status === 'resolved');
                const vulnDensity = assets.length > 0 ? (openVulns.length / assets.length).toFixed(1) : "0";

                const totalRemediationTime = closedVulns.reduce((acc: number, v: any) => {
                    const start = v.createdAt ? new Date(v.createdAt).getTime() : 0;
                    const end = v.updatedAt ? new Date(v.updatedAt).getTime() : start;
                    return acc + Math.max(0, end - start);
                }, 0);
                const mttr = closedVulns.length > 0
                    ? Math.round((totalRemediationTime / closedVulns.length) / (1000 * 60 * 60 * 24))
                    : 0;

                const valuedAssets = assets.filter((a: any) => 
                    ((a.valuationC || 0) + (a.valuationI || 0) + (a.valuationA || 0) > 0) || a.ownerId || a.owner
                );
                const assetCriticalityCoverage = assets.length > 0
                    ? Math.round((valuedAssets.length / assets.length) * 100)
                    : 0;

                // Cyber Maturity: 60% Asset Valuation & Visibility + 40% Vulnerability Resolution Health
                const vulnHealthScore = Math.max(0, Math.min(100, Math.round(100 - (openVulns.length / Math.max(1, assets.length * 10)) * 50)));
                const cyberMaturity = assets.length > 0
                    ? Math.round((assetCriticalityCoverage * 0.6) + (vulnHealthScore * 0.4))
                    : 70;

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
                // The breach register UI stores breaches as privacy assessments
                // with a "BREACH:" type prefix; merge them with the canonical
                // dataBreaches table so metrics reflect both entry paths.
                const allBreaches: any[] = [
                    ...breaches,
                    ...(privacyBreaches || []).map((pb: any) => ({
                        dateOccurred: pb.responses?.occurredAt ?? pb.createdAt ?? null,
                        dateDetected: pb.responses?.loggedAt ?? pb.createdAt ?? null,
                        isNotifiableToDpa: false,
                        isNotifiableToSubjects: false,
                    })),
                ];
                const totalBreachDelta = allBreaches.reduce((acc: number, b: any) => {
                    if (!b.dateOccurred || !b.dateDetected) return acc;
                    return acc + (new Date(b.dateDetected).getTime() - new Date(b.dateOccurred).getTime());
                }, 0);
                const avgBreachDetectionDays = allBreaches.length > 0
                    ? Math.round((totalBreachDelta / allBreaches.length) / (1000 * 60 * 60 * 24))
                    : 0;

                const notifiableBreaches = breaches.filter((b: any) => b.isNotifiableToDpa || b.isNotifiableToSubjects).length;

                // --- DOMAIN 3: Governance & Culture ---
                const activeEmployees = employees.filter((e: any) => e.status !== 'terminated');
                const approvedPolicies = policies.filter((p: any) => p.status === 'approved' || p.status === 'published');
                const policyApprovalRate = policies.length > 0 
                    ? Math.round((approvedPolicies.length / policies.length) * 100) 
                    : 0;

                const totalAcks = (acknowledgments || []).length;
                const requiredAcks = activeEmployees.length * Math.max(1, approvedPolicies.length);
                const recordedAckRate = requiredAcks > 0 && totalAcks > 0 ? Math.round((totalAcks / requiredAcks) * 100) : 0;
                const policyAckRate = recordedAckRate > 0 ? recordedAckRate : policyApprovalRate;

                const assignedTrainings = (trainingAssignments || []).length;
                const completedTrainings = (trainingAssignments || []).filter((t: any) => 
                    (t.training_assignments?.status || t.status) === 'completed'
                ).length;
                const trainingCompletionRate = assignedTrainings > 0 
                    ? Math.round((completedTrainings / assignedTrainings) * 100) 
                    : (activeEmployees.length > 0 ? 65 : 75);

                const humanErrorCount = incidents.filter((i: any) => i.cause === 'human_error' || i.cause === 'phishing').length;
                const cultureMaturity = Math.round((policyApprovalRate * 0.7) + ((trainingCompletionRate || 65) * 0.3));

                // --- DOMAIN 4: Third-Party Risk ---
                const assessedVendorIds = new Set<number>();
                (vendorAssessments || []).forEach((va: any) => {
                    const vid = va.vendorId || va.vendor_assessments?.vendorId;
                    if (vid) assessedVendorIds.add(vid);
                });

                const assessedVendorsCount = vendors.filter((v: any) =>
                    assessedVendorIds.has(v.id) || (v.trustScore && v.trustScore > 0) || v.reviewStatus === 'active' || (v.status || '').toLowerCase() === 'active'
                ).length;
                const vendorAssessmentCoverage = vendors.length > 0
                    ? Math.round((assessedVendorsCount / vendors.length) * 100)
                    : 0;

                const criticalVendors = vendors.filter((v: any) => {
                    const crit = (v.criticality || '').toLowerCase();
                    return crit === 'high' || crit === 'critical';
                });
                const avgCriticalVendorRisk = criticalVendors.length > 0
                    ? Math.round(criticalVendors.reduce((acc: number, v: any) => acc + (typeof v.trustScore === 'number' ? 100 - v.trustScore : 20), 0) / criticalVendors.length)
                    : 0;

                // Supply Chain Maturity: 80% Assessment coverage + 20% healthy risk posture
                const vendorRiskPenalty = criticalVendors.length > 0 ? avgCriticalVendorRisk : 10;
                const supplyChainMaturity = vendors.length > 0
                    ? Math.max(10, Math.min(100, Math.round((vendorAssessmentCoverage * 0.8) + ((100 - vendorRiskPenalty) * 0.2))))
                    : 80;

                // --- DOMAIN 5: Compliance ---
                const totalControls = controls.length;
                const implementedControls = controls.filter((c: any) => c.status === 'implemented');
                const inProgressControls = controls.filter((c: any) => c.status === 'in_progress');
                const notImplementedControls = controls.filter((c: any) => c.status === 'not_implemented' || !c.status);
                const applicableControls = controls.filter((c: any) => c.status !== 'not_applicable');

                const controlImplementationRate = applicableControls.length > 0
                    ? Math.round((implementedControls.length / applicableControls.length) * 100)
                    : totalControls > 0
                        ? Math.round((implementedControls.length / totalControls) * 100)
                        : 0;

                const complianceMaturity = applicableControls.length > 0
                    ? Math.round(((implementedControls.length + (inProgressControls.length * 0.5)) / applicableControls.length) * 100)
                    : 0;

                const verifiedEvidence = evidence.filter((e: any) => e.status === 'verified').length;
                const evidenceVerificationRate = evidence.length > 0 ? Math.round((verifiedEvidence / evidence.length) * 100) : 0;

                // --- DOMAIN 6: Business Continuity ---
                const totalProcesses = businessProcesses.length;
                const recoveryDefinedProcesses = businessProcesses.filter((bp: any) => 
                    Boolean((bp.rto && bp.rto.trim()) || (bp.rpo && bp.rpo.trim()) || (bp.mtpd && bp.mtpd.trim()) || (bp.criticalityTier && bp.criticalityTier.trim()))
                );
                const biaCompletionRate = totalProcesses > 0
                    ? Math.round((recoveryDefinedProcesses.length / totalProcesses) * 100)
                    : 0;

                const activeProjects = bcpProjects.filter((p: any) => p.status === 'active' || p.status === 'in_progress' || !p.status).length;
                const resilienceMaturity = totalProcesses > 0 ? biaCompletionRate : 70;

                const overallMaturity = Math.round(
                    (strategicMaturity + cyberMaturity + cultureMaturity + supplyChainMaturity + complianceMaturity + resilienceMaturity) / 6
                );

                const maturityProfile = [
                    {
                        domain: 'Strategic Risk',
                        domainShort: 'Strategic',
                        subject: 'Strategic',
                        score: strategicMaturity,
                        target: 85,
                        status: strategicMaturity >= 70 ? 'Optimal' : strategicMaturity >= 40 ? 'Moderate' : 'Action Required',
                        description: `${risks.length - criticalRisksUnmitigated} of ${risks.length} risks mitigated (${criticalRisksUnmitigated} critical unmitigated)`
                    },
                    {
                        domain: 'Cyber Security',
                        domainShort: 'Cyber',
                        subject: 'Cyber',
                        score: cyberMaturity,
                        target: 80,
                        status: cyberMaturity >= 70 ? 'Optimal' : cyberMaturity >= 40 ? 'Moderate' : 'Remediation Needed',
                        description: `${openVulns.length} open vulnerabilities across ${assets.length} valued assets`
                    },
                    {
                        domain: 'Governance & Culture',
                        domainShort: 'Culture',
                        subject: 'Culture',
                        score: cultureMaturity,
                        target: 80,
                        status: cultureMaturity >= 70 ? 'Established' : 'In Progress',
                        description: `${approvedPolicies.length} of ${policies.length} policies approved (${policyApprovalRate}%)`
                    },
                    {
                        domain: 'Supply Chain',
                        domainShort: 'Supply Chain',
                        subject: 'Supply Chain',
                        score: supplyChainMaturity,
                        target: 80,
                        status: supplyChainMaturity >= 70 ? 'Controlled' : 'Assessment Needed',
                        description: `${vendorAssessmentCoverage}% vendor coverage, ${criticalVendors.length} critical tier vendors`
                    },
                    {
                        domain: 'Regulatory Compliance',
                        domainShort: 'Compliance',
                        subject: 'Compliance',
                        score: complianceMaturity,
                        target: 85,
                        status: complianceMaturity >= 70 ? 'Audit Ready' : 'Gap Closure Required',
                        description: `${implementedControls.length} of ${totalControls} controls implemented (${controlImplementationRate}%)`
                    },
                    {
                        domain: 'Business Resilience',
                        domainShort: 'Resilience',
                        subject: 'Resilience',
                        score: resilienceMaturity,
                        target: 80,
                        status: resilienceMaturity >= 70 ? 'Robust' : 'BIA Pending',
                        description: `${recoveryDefinedProcesses.length} of ${businessProcesses.length} processes with RTO/RPO defined`
                    }
                ];

                return {
                    maturityProfile,
                    overallMaturity,
                    strategic: {
                        score: strategicMaturity,
                        riskAppetiteConsumption,
                        criticalRisksUnmitigated,
                        totalRisks: risks.length,
                        riskVelocity,
                        topRiskCategories: Object.entries(riskScores).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
                    },
                    cyber: {
                        score: cyberMaturity,
                        mttr,
                        vulnDensity,
                        openVulns: openVulns.length,
                        totalAssets: assets.length,
                        assetCriticalityCoverage
                    },
                    culture: {
                        score: cultureMaturity,
                        approvedPolicies: approvedPolicies.length,
                        totalPolicies: policies.length,
                        policyApprovalRate,
                        policyAckRate,
                        trainingCompletionRate,
                        humanErrorCount,
                        activeEmployees: activeEmployees.length
                    },
                    supplyChain: {
                        score: supplyChainMaturity,
                        avgCriticalVendorRisk,
                        vendorAssessmentCoverage,
                        totalVendors: vendors.length,
                        criticalVendors: criticalVendors.length
                    },
                    compliance: {
                        score: complianceMaturity,
                        controlEffectiveness: controlImplementationRate,
                        controlImplementationRate,
                        totalControls,
                        implementedControls: implementedControls.length,
                        inProgressControls: inProgressControls.length,
                        notImplementedControls: notImplementedControls.length,
                        auditCount: audits.length,
                        evidenceVerificationRate
                    },
                    resilience: {
                        score: resilienceMaturity,
                        biaCompletionRate,
                        totalProcesses: businessProcesses.length,
                        recoveryDefinedProcesses: recoveryDefinedProcesses.length,
                        activeProjects
                    },
                    ops: {
                        significantIncidents,
                        crossBorderIncidents,
                        reportingTimeliness,
                        avgBreachDetectionDays,
                        notifiableBreaches
                    },
                    raw: {
                        risks: risks
                    }
                };
            }),
    });
};
