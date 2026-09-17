import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and, desc, asc, ne, sql, count } from "drizzle-orm";
import { WorkflowEngine } from "../../lib/governance/workflow";

export interface StrategicRoadmapTemplate {
    id: string;
    title: string;
    framework: string;
    category: 'framework' | 'program';
    description: string;
    vision: string;
    durationMonths: number;
    objectives: string[];
    kpiTargets: { name: string; target: number; unit: string }[];
    milestones: {
        title: string;
        description: string;
        monthOffset: number;
        isGate?: boolean;
        priority?: 'low' | 'medium' | 'high' | 'critical';
    }[];
    programGuideUrl?: string;
}

export const STRATEGIC_ROADMAP_TEMPLATES: StrategicRoadmapTemplate[] = [
    {
        id: 'iso27001',
        title: 'ISO 27001:2022 Certification',
        framework: 'ISO 27001',
        category: 'framework',
        programGuideUrl: '/iso27001/program-guide?tab=roadmap',
        description: 'Comprehensive roadmap for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS).',
        vision: 'Achieve accredited ISO/IEC 27001:2022 certification and demonstrate rigorous global cybersecurity governance to enterprise stakeholders.',
        durationMonths: 6,
        objectives: [
            'Define ISMS Scope, Leadership Commitment, and Information Security Policy',
            'Conduct comprehensive Information Asset Inventory and Risk Assessment',
            'Select Annex A controls and publish approved Statement of Applicability (SoA)',
            'Deploy mandatory security operational policies and train entire workforce',
            'Conduct formal Internal Audit and Management Review',
            'Successfully pass Stage 1 and Stage 2 accredited certification audits'
        ],
        kpiTargets: [
            { name: 'Annex A Control Implementation', target: 100, unit: '%' },
            { name: 'Employee Security Training Rate', target: 100, unit: '%' },
            { name: 'Critical Risk Mitigation Rate', target: 95, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Leadership Commitment & ISMS Scope Definition', description: 'Establish leadership charter, appoint CISO/ISMS committee, and formalize ISMS organizational boundaries.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Information Asset Inventory & Threat Risk Assessment', description: 'Catalog enterprise assets, assess threats and vulnerabilities, and calculate inherent vs. residual risk.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: Annex A Controls Selection & Statement of Applicability', description: 'Map 93 Annex A controls to enterprise context, document justifications, and obtain formal executive sign-off.', monthOffset: 3, isGate: true, priority: 'critical' },
            { title: 'M4: Operational Security Policies & Employee Awareness', description: 'Publish operational security policies across all teams and verify 100% employee awareness acknowledgment.', monthOffset: 4, isGate: false, priority: 'high' },
            { title: 'M5: Formal Internal Audit & Management Review', description: 'Execute comprehensive internal audit cycle, resolve non-conformities, and conduct executive management review.', monthOffset: 5, isGate: true, priority: 'critical' },
            { title: 'M6: Stage 1 & Stage 2 Accredited Certification Audits', description: 'Complete documentation readiness review (Stage 1) and evidence verification audit (Stage 2) with external registrar.', monthOffset: 6, isGate: true, priority: 'critical' }
        ]
    },
    {
        id: 'soc2',
        title: 'SOC 2 Type II Readiness & Examination',
        framework: 'SOC 2',
        category: 'framework',
        programGuideUrl: '/soc2/program-guide?tab=roadmap',
        description: 'Strategic preparation and operational evidence gathering for Security, Availability, and Confidentiality Trust Services Criteria.',
        vision: 'Attain an unqualified SOC 2 Type II attestation report from a CPA firm to unblock enterprise deals and prove continuous control effectiveness.',
        durationMonths: 6,
        objectives: [
            'Establish Trust Services Criteria scope boundaries and system description',
            'Design and implement baseline security, access, and change management controls',
            'Maintain 90-day continuous operational evidence collection window',
            'Undergo independent CPA audit examination with zero major exceptions'
        ],
        kpiTargets: [
            { name: 'Evidence Collection Automation', target: 95, unit: '%' },
            { name: 'Control Operating Effectiveness', target: 100, unit: '%' },
            { name: 'Timely Remediation of Gaps', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Trust Services Criteria Scoping & Architecture Mapping', description: 'Define in-scope systems, data flows, infrastructure, and applicable Trust Services Criteria (Security, Availability, Confidentiality).', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Control Implementation & Evidence Automation Setup', description: 'Deploy required controls, MFA enforcement, branch protection, and automated evidence telemetry.', monthOffset: 2, isGate: true, priority: 'high' },
            { title: 'M3: 90-Day Operational Observation & Audit Evidence Window', description: 'Maintain continuous operating effectiveness of controls and accumulate auditable artifact logs.', monthOffset: 4, isGate: false, priority: 'high' },
            { title: 'M4: CPA Examination, Fieldwork, and Final Report Issuance', description: 'Complete auditor interviews, sample testing, management representation, and receive final SOC 2 Type II report.', monthOffset: 6, isGate: true, priority: 'critical' }
        ]
    },
    {
        id: 'hipaa',
        title: 'HIPAA Security & Privacy Compliance',
        framework: 'HIPAA',
        category: 'framework',
        programGuideUrl: '/hipaa/program-guide?tab=roadmap',
        description: 'Strategic program for protecting Protected Health Information (PHI/ePHI) through Administrative, Physical, and Technical Safeguards.',
        vision: 'Ensure 100% compliance with HIPAA Security, Privacy, and Breach Notification Rules.',
        durationMonths: 5,
        objectives: [
            'Designate Privacy and Security Officers and inventory all Business Associates',
            'Execute comprehensive HIPAA Security Risk Analysis across all electronic systems',
            'Implement ePHI encryption at rest, in transit, and robust access governance',
            'Conduct workforce HIPAA awareness training and test breach notification response'
        ],
        kpiTargets: [
            { name: 'Business Associate Agreements (BAAs)', target: 100, unit: '%' },
            { name: 'ePHI Encryption Coverage', target: 100, unit: '%' },
            { name: 'Staff Training Completion', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Governance, Officer Appointments & BAA Inventory', description: 'Appoint statutory officers, map all data flows handling PHI, and execute BAAs with all cloud providers.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Comprehensive HIPAA Security Risk Assessment', description: 'Identify technical vulnerabilities and operational risks to ePHI confidentiality and integrity.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: Technical Safeguards & KMS Encryption Deployment', description: 'Enforce AES-256 encryption at rest, TLS 1.3 in transit, and multi-factor authentication on all healthcare systems.', monthOffset: 3, isGate: true, priority: 'high' },
            { title: 'M4: Workforce Training & Incident Notification Drill', description: 'Deliver role-based training on PHI handling and simulate a 60-day OCR breach notification drill.', monthOffset: 4, isGate: false, priority: 'medium' },
            { title: 'M5: Final HIPAA Safeguards Evaluation & Audit File Assembly', description: 'Synthesize HIPAA compliance binder and establish continuous annual evaluation cycle.', monthOffset: 5, isGate: true, priority: 'high' }
        ]
    },
    {
        id: 'cmmc',
        title: 'CMMC 2.0 Level 2 Defense Readiness',
        framework: 'CMMC 2.0',
        category: 'framework',
        programGuideUrl: '/federal/program-guide?tab=roadmap',
        description: 'DoD contractor readiness roadmap for Cybersecurity Maturity Model Certification (NIST SP 800-171 alignment).',
        vision: 'Achieve CMMC 2.0 Level 2 certification to secure and retain critical defense aerospace and government contracts.',
        durationMonths: 6,
        objectives: [
            'Define Controlled Unclassified Information (CUI) boundaries and enclave architecture',
            'Assess and implement 110 NIST SP 800-171 security requirements',
            'Author System Security Plan (SSP) and Plan of Action and Milestones (POA&M)',
            'Engage third-party C3PAO and successfully complete assessment'
        ],
        kpiTargets: [
            { name: 'NIST 800-171 Implementation Score', target: 110, unit: '/110' },
            { name: 'System Security Plan (SSP) Completion', target: 100, unit: '%' },
            { name: 'POA&M Remediation Rate', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: CUI Boundary Definition & Enclave Scoping', description: 'Identify where CUI is processed, stored, or transmitted; isolate defense workloads via virtual VPC enclaves.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: NIST 800-171 Gap Assessment & Control Implementation', description: 'Execute gap analysis against all 14 families and remediate critical access control and audit flaws.', monthOffset: 3, isGate: false, priority: 'high' },
            { title: 'M3: System Security Plan (SSP) & POA&M Finalization', description: 'Formulate complete documentation binder mapping every control to specific operational proof.', monthOffset: 4, isGate: true, priority: 'critical' },
            { title: 'M4: Pre-Assessment Mock Audit & SPRS Score Upload', description: 'Run mock C3PAO audit and upload validated assessment score to DoD SPRS portal.', monthOffset: 5, isGate: false, priority: 'high' },
            { title: 'M5: Accredited C3PAO Third-Party Certification Assessment', description: 'Undergo formal external audit and attain CMMC Level 2 certificate of compliance.', monthOffset: 6, isGate: true, priority: 'critical' }
        ]
    },
    {
        id: 'gdpr',
        title: 'EU GDPR & Global Privacy Governance',
        framework: 'GDPR',
        category: 'framework',
        programGuideUrl: '/privacy/program-guide?tab=roadmap',
        description: 'End-to-end operational privacy compliance for GDPR, UK DPA, and global privacy statutes.',
        vision: 'Establish a privacy-by-design posture with robust data subject rights fulfillment and cross-border transfer protections.',
        durationMonths: 4,
        objectives: [
            'Establish and maintain comprehensive Article 30 Records of Processing Activities (RoPA)',
            'Execute DPIAs on high-risk processing and Transfer Impact Assessments (TIAs)',
            'Deploy automated Data Subject Access Request (DSAR) workflows with 30-day SLA',
            'Validate 72-hour supervisory authority breach notification playbooks'
        ],
        kpiTargets: [
            { name: 'RoPA Processing Activities Mapped', target: 100, unit: '%' },
            { name: 'DSAR 30-Day SLA Adherence', target: 100, unit: '%' },
            { name: 'Sub-processor DPA Coverage', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: RoPA Data Mapping & Lawful Basis Determination', description: 'Map all personal data ingress, storage, processing purposes, and legal justifications.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: DPIAs & Cross-Border Transfer Impact Assessments (TIAs)', description: 'Evaluate high-risk processing operations and verify Standard Contractual Clauses (SCCs) with third-party processors.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: Sub-processor DPA Overhaul & Privacy Policy Update', description: 'Execute updated DPAs with all SaaS vendors and publish consumer-facing privacy notices.', monthOffset: 3, isGate: false, priority: 'medium' },
            { title: 'M4: DSAR Portal Automation & 72-Hour Breach Drill', description: 'Operationalize self-service DSAR fulfillment and conduct table-top breach notification simulation with DPO.', monthOffset: 4, isGate: true, priority: 'critical' }
        ]
    },
    {
        id: 'nis2',
        title: 'EU NIS2 Directive Cybersecurity Resilience',
        framework: 'NIS2',
        category: 'framework',
        programGuideUrl: '/cyber/program-guide?tab=roadmap',
        description: 'Cybersecurity risk management and incident reporting program aligning with the EU NIS2 Directive.',
        vision: 'Meet statutory compliance for essential and important entities across European operations.',
        durationMonths: 5,
        objectives: [
            'Classify organizational status under NIS2 criteria and register with national authorities',
            'Enforce mandatory technical and operational cybersecurity risk management measures',
            'Implement 24-hour early warning and 72-hour incident reporting pipelines',
            'Train management body and establish executive personal liability oversight'
        ],
        kpiTargets: [
            { name: 'NIS2 Article 21 Control Coverage', target: 100, unit: '%' },
            { name: 'Incident Early-Warning Readiness', target: 100, unit: '%' },
            { name: 'Critical Vendor Assessment Rate', target: 95, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Essential/Important Classification & CSIRT Registration', description: 'Determine statutory entity classification and establish point of contact with national competent authority.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Article 21 Cybersecurity Measures Implementation', description: 'Implement cryptography, vulnerability handling, backup hygiene, and multi-factor authentication.', monthOffset: 2, isGate: true, priority: 'critical' },
            { title: 'M3: Supply Chain Security & Vendor Audit Reviews', description: 'Assess key IT service providers, cloud infrastructure, and software vendors for security vulnerabilities.', monthOffset: 3, isGate: false, priority: 'high' },
            { title: 'M4: Statutory Incident Notification Playbook (24h/72h)', description: 'Deploy automated early-warning incident alerting pipeline to meet statutory deadlines.', monthOffset: 4, isGate: true, priority: 'critical' },
            { title: 'M5: Board Cybersecurity Accountability & Governance Audit', description: 'Conduct mandatory executive cybersecurity awareness training and complete governance compliance audit.', monthOffset: 5, isGate: true, priority: 'high' }
        ]
    },
    {
        id: 'risk-assessment',
        title: 'Enterprise Risk Management Program',
        framework: 'ISO 31000 / NIST RMF',
        category: 'program',
        programGuideUrl: '/risks/program-guide?tab=roadmap',
        description: 'Systematic program for identifying, analyzing, evaluating, and mitigating organizational and cyber risks.',
        vision: 'Transform ad-hoc risk management into an active, data-driven enterprise risk posture with clear board oversight.',
        durationMonths: 3,
        objectives: [
            'Catalog all hardware, software, cloud, and data assets with assigned owners',
            'Conduct threat modeling and integrate automated vulnerability scanning',
            'Quantify inherent and residual risk scores across all business departments',
            'Formulate treatment plans with approved risk appetite thresholds'
        ],
        kpiTargets: [
            { name: 'Asset Inventory Completeness', target: 100, unit: '%' },
            { name: 'Identified Threat Scenarios Scored', target: 100, unit: '%' },
            { name: 'High Risk Treatment Execution', target: 90, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Asset Discovery, Classification & Ownership Assignment', description: 'Inventory all IT systems, applications, data stores, and assign responsible risk owners.', monthOffset: 1, isGate: true, priority: 'high' },
            { title: 'M2: Threat Modeling & Vulnerability Discovery Integration', description: 'Catalog threat scenarios, ingest vulnerability scan data, and identify threat actors.', monthOffset: 1, isGate: false, priority: 'high' },
            { title: 'M3: Inherent & Residual Risk Scoring Workshop', description: 'Facilitate cross-departmental scoring of likelihood vs impact and calculate risk priorities.', monthOffset: 2, isGate: true, priority: 'critical' },
            { title: 'M4: Board Risk Treatment Plan Approval & Continuous Monitoring', description: 'Commit resources to mitigations, establish risk review cadence, and present register to leadership.', monthOffset: 3, isGate: true, priority: 'high' }
        ]
    },
    {
        id: 'business-continuity',
        title: 'Business Continuity & Disaster Recovery (ISO 22301)',
        framework: 'ISO 22301',
        category: 'program',
        programGuideUrl: '/business-continuity/program-guide?tab=roadmap',
        description: 'Resilience program ensuring organizational survival and swift operational recovery from major disruptions.',
        vision: 'Protect business continuity with proven, tested RTO/RPO targets and rehearsed disaster recovery playbooks.',
        durationMonths: 4,
        objectives: [
            'Conduct comprehensive Business Impact Analysis (BIA) on all critical operations',
            'Formulate Maximum Tolerable Period of Disruption (MTPD), RTO, and RPO metrics',
            'Author actionable Business Continuity (BCP) and Disaster Recovery (DRP) plans',
            'Execute tabletop simulation exercises and staff crisis response training'
        ],
        kpiTargets: [
            { name: 'Critical Processes BIA Coverage', target: 100, unit: '%' },
            { name: 'RTO Recovery SLA Adherence', target: 100, unit: '%' },
            { name: 'Tabletop Drill Success Rate', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Business Impact Analysis (BIA) & Critical Dependency Mapping', description: 'Interview business unit heads to evaluate financial and operational impacts over time.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Recovery Objectives (RTO & RPO) Definition', description: 'Define recovery time and data loss tolerances for production databases and customer applications.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: BCP & Cloud Disaster Recovery Playbook Drafting', description: 'Document failover procedures, alternative site protocols, and emergency communication trees.', monthOffset: 3, isGate: true, priority: 'high' },
            { title: 'M4: Live Tabletop Simulation & Executive Post-Mortem', description: 'Run simulated cloud outage scenario, validate recovery times, and update continuity plans.', monthOffset: 4, isGate: true, priority: 'critical' }
        ]
    },
    {
        id: 'vendor-risk',
        title: 'Third-Party Vendor Risk Management (TPRM)',
        framework: 'ISO 27001 / SOC 2',
        category: 'program',
        programGuideUrl: '/vendors/program-guide?tab=roadmap',
        description: 'Holistic supply-chain security program to evaluate, tier, and continuously monitor third-party suppliers.',
        vision: 'Eliminate supply-chain vulnerabilities and ensure external partners uphold corporate security standards.',
        durationMonths: 3,
        objectives: [
            'Establish central vendor registry and categorize vendors by data sensitivity tier',
            'Conduct security assessments (SIG/CAIQ) and collect SOC 2/ISO certificates',
            'Incorporate mandatory security and right-to-audit clauses in supplier contracts',
            'Institute automated continuous monitoring for third-party security posture'
        ],
        kpiTargets: [
            { name: 'Tier 1 Critical Vendor Assessment Rate', target: 100, unit: '%' },
            { name: 'SOC 2 / ISO Certification Validation', target: 100, unit: '%' },
            { name: 'High-Risk Vendor Remediation Rate', target: 90, unit: '%' }
        ],
        milestones: [
            { title: 'M1: Vendor Inventory Cataloging & Criticality Tiering', description: 'Catalog all SaaS providers, cloud vendors, and contractors; tier them based on data access.', monthOffset: 1, isGate: true, priority: 'high' },
            { title: 'M2: Due Diligence Assessments & Security Evidence Collection', description: 'Dispatch security questionnaires, inspect SOC 2 Type II reports, and score vendor risks.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: DPA Contract Negotiation & Risk Remediation Plans', description: 'Remediate identified security deficiencies and verify security and confidentiality clauses.', monthOffset: 2, isGate: true, priority: 'critical' },
            { title: 'M4: Continuous Monitoring Cadence & Annual Re-Assessment', description: 'Deploy automated domain risk rating monitoring and schedule recurring vendor audit cycles.', monthOffset: 3, isGate: false, priority: 'medium' }
        ]
    },
    {
        id: 'incident-response',
        title: 'CSIRT & Cyber Incident Response Program',
        framework: 'NIST SP 800-61 / ISO 27035',
        category: 'program',
        programGuideUrl: '/cyber/incidents',
        description: 'Enterprise framework for rapid triage, containment, eradication, and regulatory reporting of security incidents.',
        vision: 'Minimize cyber breach impact, ensure zero unauthorized data loss, and maintain full statutory compliance.',
        durationMonths: 3,
        objectives: [
            'Formally charter CSIRT team with clear escalation trees and roles',
            'Author technical playbooks for Ransomware, Phishing, BOLA, and Credential Stuffing',
            'Conduct realistic breach simulation drills with executive and legal participation',
            'Establish post-mortem retrospectives and root cause remediation pipelines'
        ],
        kpiTargets: [
            { name: 'Mean Time to Detect (MTTD)', target: 15, unit: 'mins' },
            { name: 'Mean Time to Contain (MTTC)', target: 60, unit: 'mins' },
            { name: 'Post-Incident Retrospective Adherence', target: 100, unit: '%' }
        ],
        milestones: [
            { title: 'M1: CSIRT Charter, On-Call Roster & Escalation Matrix', description: 'Define incident severity matrix, communication protocols, and emergency escalation contacts.', monthOffset: 1, isGate: true, priority: 'critical' },
            { title: 'M2: Technical Response Playbooks (Ransomware & Cloud)', description: 'Document step-by-step procedures for host isolation, credential revocation, and log preservation.', monthOffset: 2, isGate: false, priority: 'high' },
            { title: 'M3: Simulated Ransomware Tabletop Drill & Forensics Test', description: 'Conduct cross-functional drill with IT, legal, and PR; validate backup restoration and communication.', monthOffset: 2, isGate: true, priority: 'critical' },
            { title: 'M4: Statutory Notification Readiness & Continuous Improvement', description: 'Establish 24-hour notification templates for regulators and institute blameless post-mortem cadence.', monthOffset: 3, isGate: false, priority: 'high' }
        ]
    }
];

export const createRoadmapRouter = (t: any, publicProcedure: any, adminProcedure: any) => t.router({
    // Generate a new roadmap
    generate: adminProcedure
        .input(z.object({
            clientId: z.number(),
            title: z.string().optional(),
            targetDate: z.string().optional(), // '2025-12-31'
            monthsDuration: z.number().optional() // 3, 6, 12
        }))
        .mutation(async ({ input }: any) => {
            try {
                const dbConn = await getDb();

                // 1. Calculate Target Date if not provided
                let endDate = new Date();
                if (input.targetDate) {
                    endDate = new Date(input.targetDate);
                } else {
                    const months = input.monthsDuration || 6;
                    endDate.setMonth(endDate.getMonth() + months);
                }

                // 2. Fetch Gaps (Unimplemented Controls)
                const gaps = await dbConn.select({
                    gap_responses: schema.gapResponses
                }).from(schema.gapResponses)
                    .leftJoin(schema.gapAssessments, eq(schema.gapResponses.assessmentId, schema.gapAssessments.id))
                    .where(
                        and(
                            eq(schema.gapAssessments.clientId, input.clientId),
                            ne(schema.gapResponses.currentStatus, 'implemented'),
                            eq(schema.gapResponses.targetStatus, 'required')
                        )
                    );

                // 3. Create Plan Container
                const [plan] = await dbConn.insert(schema.remediationPlans).values({
                    clientId: input.clientId,
                    title: input.title || `Remediation Plan - ${new Date().toLocaleDateString()}`,
                    status: 'draft',
                    targetDate: endDate,
                }).returning();

                if (!plan) throw new Error("Failed to create plan record.");

                // 4. Match Playbooks & Generate Items
                const playbooks = await dbConn.select().from(schema.remediationPlaybooks);
                const roadmapItemsToInsert: any[] = [];
                const now = new Date();

                for (const gapRow of gaps) {
                    const gap = gapRow.gap_responses;
                    const matchingPlaybook = playbooks.find((p: typeof schema.remediationPlaybooks.$inferSelect) => {
                        try {
                            return new RegExp(p.gapPattern, 'i').test(gap.controlId);
                        } catch { return false; }
                    });

                    if (!matchingPlaybook) {
                        let phase = 3;
                        if (gap.gapSeverity === 'Critical') phase = 1;
                        else if (gap.gapSeverity === 'High') phase = 2;

                        roadmapItemsToInsert.push({
                            planId: plan.id,
                            controlId: gap.controlId,
                            gapResponseId: gap.id,
                            title: `Remediate ${gap.controlId}`,
                            description: gap.notes || "Implement required control.",
                            phase: phase,
                            status: 'pending',
                            estimatedDuration: 7,
                        });
                    } else {
                        let phase = 3;
                        if (gap.gapSeverity === 'Critical' || matchingPlaybook.severity === 'critical') phase = 1;
                        else if (gap.gapSeverity === 'High' || matchingPlaybook.severity === 'high') phase = 2;

                        roadmapItemsToInsert.push({
                            planId: plan.id,
                            controlId: gap.controlId,
                            gapResponseId: gap.id,
                            title: matchingPlaybook.title,
                            description: matchingPlaybook.steps ? JSON.stringify(matchingPlaybook.steps) : gap.notes,
                            phase: phase,
                            status: 'pending',
                            ownerRole: matchingPlaybook.ownerTemplate || "IT Security",
                            estimatedDuration: 14,
                        });
                    }
                }

                if (roadmapItemsToInsert.length > 0) {
                    await dbConn.insert(schema.roadmapItems).values(roadmapItemsToInsert);
                }

                return plan;
            } catch (error: any) {
                console.error("Roadmap generation failed:", error);
                throw new Error("Failed to generate roadmap: " + error.message);
            }
        }),

    // List plans for a client
    list: publicProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const dbConn = await getDb();
            return dbConn.select().from(schema.remediationPlans)
                .where(eq(schema.remediationPlans.clientId, input.clientId))
                .orderBy(desc(schema.remediationPlans.createdAt));
        }),

    // Delete a roadmap (checks both roadmaps and remediationPlans)
    delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }: any) => {
            const dbConn = await getDb();
            const numericId = Number(input.id);

            // Delete milestones and roadmap if exists in strategic roadmaps table
            await dbConn.delete(schema.roadmapMilestones).where(eq(schema.roadmapMilestones.roadmapId, numericId));
            const [deletedRoadmap] = await dbConn.delete(schema.roadmaps).where(eq(schema.roadmaps.id, numericId)).returning();
            if (deletedRoadmap) return { success: true, id: deletedRoadmap.id };

            const [deleted] = await dbConn.delete(schema.remediationPlans)
                .where(eq(schema.remediationPlans.id, numericId))
                .returning();
            if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Roadmap not found" });
            return { success: true, id: deleted.id };
        }),

    // Get full plan details
    get: publicProcedure
        .input(z.object({ planId: z.number() }))
        .query(async ({ input }: any) => {
            const dbConn = await getDb();
            const [plan] = await dbConn.select().from(schema.remediationPlans)
                .where(eq(schema.remediationPlans.id, input.planId));

            if (!plan) return null;

            const items = await dbConn.select().from(schema.roadmapItems)
                .where(eq(schema.roadmapItems.planId, input.planId))
                .orderBy(asc(schema.roadmapItems.phase), asc(schema.roadmapItems.order));

            return { plan, items };
        }),

    // ==========================================
    // New Strategic Roadmap Operations
    // ==========================================

    // List available roadmap templates
    listTemplates: publicProcedure.query(() => {
        return STRATEGIC_ROADMAP_TEMPLATES;
    }),

    // Instantly instantiate a tracked strategic roadmap from template with pre-populated milestones
    instantiateTemplate: adminProcedure
        .input(z.object({
            clientId: z.number(),
            templateId: z.string(),
            targetMonths: z.number().optional()
        }))
        .mutation(async ({ input, ctx }: any) => {
            const template = STRATEGIC_ROADMAP_TEMPLATES.find(t => t.id === input.templateId);
            if (!template) {
                throw new TRPCError({ code: "NOT_FOUND", message: `Template with ID "${input.templateId}" not found.` });
            }

            const dbConn = await getDb();
            const now = new Date();
            const duration = input.targetMonths || template.durationMonths;
            const targetDate = new Date(now.getTime() + duration * 30 * 24 * 60 * 60 * 1000);

            // 1. Create Roadmap container
            const [newRoadmap] = await dbConn.insert(schema.roadmaps).values({
                clientId: input.clientId,
                title: template.title,
                description: template.description,
                vision: template.vision,
                objectives: template.objectives,
                framework: template.framework,
                status: 'active',
                startDate: now,
                targetDate: targetDate,
                createdById: ctx.user?.id || 1,
                kpiTargets: template.kpiTargets,
            }).returning();

            if (!newRoadmap) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create roadmap record." });
            }

            // 2. Pre-populate phased milestones
            const milestoneInserts = template.milestones.map((m) => {
                const milestoneDate = new Date(now.getTime() + m.monthOffset * 30 * 24 * 60 * 60 * 1000);
                return {
                    roadmapId: newRoadmap.id,
                    title: m.title,
                    description: m.description,
                    targetDate: milestoneDate,
                    isGate: m.isGate || false,
                    priority: m.priority || 'medium',
                    status: 'pending',
                    progressPercentage: 0,
                    dependencies: []
                };
            });

            if (milestoneInserts.length > 0) {
                await dbConn.insert(schema.roadmapMilestones).values(milestoneInserts);
            }

            return {
                success: true,
                roadmap: newRoadmap,
                milestonesCount: milestoneInserts.length
            };
        }),

    // Create or update strategic roadmap
    createStrategic: adminProcedure
        .input(z.object({
            clientId: z.number(),
            roadmapId: z.number().optional(), // For updates
            title: z.string().min(1),
            description: z.string().optional(),
            vision: z.string().optional(),
            objectives: z.array(z.string()).min(1),
            framework: z.string().optional(),
            targetDate: z.date().optional(),
            kpiTargets: z.array(z.object({
                name: z.string(),
                target: z.number(),
                unit: z.string()
            })).optional()
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                const dbConn = await getDb();

                // If roadmapId is provided, update that specific roadmap
                if (input.roadmapId) {
                    console.log(`[Roadmap] Updating existing roadmap ID ${input.roadmapId}`);
                    const [updated] = await dbConn.update(schema.roadmaps)
                        .set({
                            title: input.title,
                            description: input.description,
                            vision: input.vision,
                            objectives: input.objectives,
                            framework: input.framework,
                            targetDate: input.targetDate,
                            updatedAt: new Date()
                        })
                        .where(eq(schema.roadmaps.id, input.roadmapId))
                        .returning();
                    return updated;
                }

                const [roadmap] = await dbConn.insert(schema.roadmaps).values({
                    clientId: input.clientId,
                    title: input.title,
                    description: input.description,
                    vision: input.vision,
                    objectives: input.objectives,
                    framework: input.framework,
                    targetDate: input.targetDate,
                    status: 'active',
                    createdById: ctx.user?.id || 1,
                    kpiTargets: input.kpiTargets
                }).returning();

                return roadmap;
            } catch (error: any) {
                console.error("Roadmap creation failed:", error);
                throw new Error("Failed to create roadmap: " + error.message);
            }
        }),

    // List roadmaps for client
    listStrategic: publicProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.enum(['draft', 'active', 'on_track', 'delayed', 'completed']).nullish()
        }))
        .query(async ({ input }: any) => {
            const dbConn = await getDb();
            let query = dbConn.select().from(schema.roadmaps)
                .where(eq(schema.roadmaps.clientId, input.clientId));

            if (input.status) {
                query = query.where(eq(schema.roadmaps.status, input.status));
            }

            return await query.orderBy(desc(schema.roadmaps.createdAt));
        }),

    // Get roadmap with details
    getStrategic: publicProcedure
        .input(z.object({ roadmapId: z.number() }))
        .query(async ({ input }: any) => {
            const dbConn = await getDb();

            // Get roadmap
            const [roadmap] = await dbConn.select().from(schema.roadmaps)
                .where(eq(schema.roadmaps.id, input.roadmapId));

            if (!roadmap) return null;

            // Get milestones
            const milestones = await dbConn.select().from(schema.roadmapMilestones)
                .where(eq(schema.roadmapMilestones.roadmapId, input.roadmapId))
                .orderBy(asc(schema.roadmapMilestones.targetDate));

            // Get linked implementation plans
            const implementationPlans = await dbConn.select().from(schema.implementationPlans)
                .where(eq(schema.implementationPlans.roadmapId, input.roadmapId));

            // Calculate progress
            const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length;
            const overallProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

            // Parse description field to extract detailed objectives
            let detailedObjectives = [];
            try {
                if (roadmap.description) {
                    const parsedDescription = JSON.parse(roadmap.description);
                    detailedObjectives = parsedDescription.detailedObjectives || [];
                }
            } catch (error) {
                console.error("Error parsing roadmap description:", error);
                // If parsing fails, description might be plain text, not JSON
            }

            return {
                ...roadmap,
                milestones,
                implementationPlans,
                detailedObjectives, // Add parsed detailed objectives
                progress: {
                    overallProgress,
                    completedMilestones,
                    totalMilestones: milestones.length,
                    onTrackStatus: roadmap.status
                }
            };
        }),

    // Add milestone to roadmap
    addMilestone: adminProcedure
        .input(z.object({
            roadmapId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            targetDate: z.date(),
            isGate: z.boolean().default(false),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
            dependencies: z.array(z.number()).optional()
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                const dbConn = await getDb();

                const [milestone] = await dbConn.insert(schema.roadmapMilestones).values({
                    roadmapId: input.roadmapId,
                    title: input.title,
                    description: input.description,
                    targetDate: input.targetDate,
                    isGate: input.isGate,
                    priority: input.priority,
                    dependencies: input.dependencies || [],
                    status: 'pending'
                }).returning();

                return milestone;
            } catch (error: any) {
                console.error("Milestone creation failed:", error);
                throw new Error("Failed to create milestone: " + error.message);
            }
        }),

    // Update milestone status
    updateMilestone: adminProcedure
        .input(z.object({
            milestoneId: z.number(),
            status: z.enum(['pending', 'completed', 'delayed']),
            progressPercentage: z.number().min(0).max(100).optional(),
            actualDate: z.date().optional()
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                const dbConn = await getDb();

                const [milestone] = await dbConn.update(schema.roadmapMilestones)
                    .set({
                        status: input.status,
                        progressPercentage: input.progressPercentage || (input.status === 'completed' ? 100 : 0),
                        actualDate: input.actualDate || (input.status === 'completed' ? new Date() : undefined)
                    })
                    .where(eq(schema.roadmapMilestones.id, input.milestoneId))
                    .returning();

                return milestone;
            } catch (error: any) {
                console.error("Milestone update failed:", error);
                throw new Error("Failed to update milestone: " + error.message);
            }
        }),

    // ==========================================
    // Implementation Plan Operations  
    // ==========================================

    // Create implementation plan
    createImplementation: adminProcedure
        .input(z.object({
            clientId: z.number(),
            roadmapId: z.number().optional(),
            title: z.string().min(1),
            description: z.string().optional(),
            plannedStartDate: z.date().optional(),
            plannedEndDate: z.date().optional(),
            estimatedHours: z.number().optional(),
            budgetAmount: z.number().optional(),
            projectManagerId: z.number().optional(),
            teamMemberIds: z.array(z.number()).optional(),
            linkedFramework: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                const dbConn = await getDb();

                const [plan] = await dbConn.insert(schema.implementationPlans).values({
                    clientId: input.clientId,
                    roadmapId: input.roadmapId,
                    title: input.title,
                    description: input.description,
                    plannedStartDate: input.plannedStartDate,
                    plannedEndDate: input.plannedEndDate,
                    estimatedHours: input.estimatedHours,
                    budgetAmount: input.budgetAmount,
                    projectManagerId: input.projectManagerId,
                    teamMemberIds: input.teamMemberIds || [],
                    linkedFramework: input.linkedFramework,
                    status: 'not_started',
                    priority: input.priority,
                    createdById: ctx.user.id
                }).returning();

                return plan;
            } catch (error: any) {
                console.error("Implementation plan creation failed:", error);
                throw new Error("Failed to create implementation plan: " + error.message);
            }
        }),

    // List implementation plans
    listImplementation: publicProcedure
        .input(z.object({
            clientId: z.number(),
            roadmapId: z.number().optional(),
            status: z.enum(['not_started', 'planning', 'in_progress', 'testing', 'completed', 'blocked']).optional()
        }))
        .query(async ({ input }: any) => {
            const dbConn = await getDb();
            let query = dbConn.select().from(schema.implementationPlans)
                .where(eq(schema.implementationPlans.clientId, input.clientId));

            if (input.roadmapId) {
                query = query.where(eq(schema.implementationPlans.roadmapId, input.roadmapId));
            }

            if (input.status) {
                query = query.where(eq(schema.implementationPlans.status, input.status));
            }

            return await query.orderBy(desc(schema.implementationPlans.createdAt));
        }),

    // Add task to implementation plan
    addTask: adminProcedure
        .input(z.object({
            implementationPlanId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            assigneeId: z.number().optional(),
            estimatedHours: z.number().optional(),
            plannedStartDate: z.date().optional(),
            plannedEndDate: z.date().optional(),
            acceptanceCriteria: z.string().optional(),
            deliverables: z.array(z.string()).optional(),
            dependencies: z.array(z.number()).optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                const dbConn = await getDb();

                const [task] = await dbConn.insert(schema.implementationTasks).values({
                    implementationPlanId: input.implementationPlanId,
                    title: input.title,
                    description: input.description,
                    assigneeId: input.assigneeId,
                    estimatedHours: input.estimatedHours,
                    plannedStartDate: input.plannedStartDate,
                    plannedEndDate: input.plannedEndDate,
                    acceptanceCriteria: input.acceptanceCriteria,
                    deliverables: input.deliverables || [],
                    dependencies: input.dependencies || [],
                    priority: input.priority,
                    status: 'todo',
                    createdById: ctx.user.id
                }).returning();

                return task;
            } catch (error: any) {
                console.error("Task creation failed:", error);
                throw new Error("Failed to create task: " + error.message);
            }
        }),

    // ==========================================
    // Workflow Transitions
    // ==========================================

    // Apply workflow transition
    transition: adminProcedure
        .input(z.object({
            entityType: z.enum(['roadmap', 'implementation_plan']),
            entityId: z.number(),
            toStatus: z.string(),
            metadata: z.record(z.any()).optional()
        }))
        .mutation(async ({ input, ctx }: any) => {
            try {
                // Get current status
                const dbConn = await getDb();
                let currentStatus = null;

                if (input.entityType === 'roadmap') {
                    const [roadmap] = await dbConn.select().from(schema.roadmaps)
                        .where(eq(schema.roadmaps.id, input.entityId));
                    currentStatus = roadmap?.status;
                } else if (input.entityType === 'implementation_plan') {
                    const [plan] = await dbConn.select().from(schema.implementationPlans)
                        .where(eq(schema.implementationPlans.id, input.entityId));
                    currentStatus = plan?.status;
                }

                if (!currentStatus) {
                    throw new Error(`Entity not found: ${input.entityType} ${input.entityId}`);
                }

                // Apply transition
                const result = await WorkflowEngine.applyTransition({
                    entityType: input.entityType,
                    entityId: input.entityId,
                    clientId: ctx.user.clientId || 0,
                    fromStatus: currentStatus,
                    toStatus: input.toStatus,
                    userId: ctx.user.id,
                    userName: ctx.user.name,
                    metadata: input.metadata
                });

                if (!result.success) {
                    throw new Error(result.error || 'Transition failed');
                }

                return result;
            } catch (error: any) {
                console.error("Workflow transition failed:", error);
                throw new Error("Failed to apply transition: " + error.message);
            }
        }),

    // Preview transition
    previewTransition: adminProcedure
        .input(z.object({
            entityType: z.enum(['roadmap', 'implementation_plan']),
            entityId: z.number(),
            toStatus: z.string(),
            metadata: z.record(z.any()).optional()
        }))
        .query(async ({ input, ctx }: any) => {
            try {
                // Get current status
                const dbConn = await getDb();
                let currentStatus = null;

                if (input.entityType === 'roadmap') {
                    const [roadmap] = await dbConn.select().from(schema.roadmaps)
                        .where(eq(schema.roadmaps.id, input.entityId));
                    currentStatus = roadmap?.status;
                } else if (input.entityType === 'implementation_plan') {
                    const [plan] = await dbConn.select().from(schema.implementationPlans)
                        .where(eq(schema.implementationPlans.id, input.entityId));
                    currentStatus = plan?.status;
                }

                if (!currentStatus) {
                    throw new Error(`Entity not found: ${input.entityType} ${input.entityId}`);
                }

                // Preview transition
                const result = await WorkflowEngine.previewTransition({
                    entityType: input.entityType,
                    entityId: input.entityId,
                    clientId: ctx.user.clientId || 0,
                    fromStatus: currentStatus,
                    toStatus: input.toStatus,
                    userId: ctx.user.id,
                    userName: ctx.user.name,
                    metadata: input.metadata
                });

                return result;
            } catch (error: any) {
                console.error("Transition preview failed:", error);
                throw new Error("Failed to preview transition: " + error.message);
            }
        })
});
