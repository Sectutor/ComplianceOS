import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clientControls, controls, assets, riskAssessments, clients, clientPolicies } from "../../schema";
import * as db from "../../db";
import { eq, and, desc, or, like } from 'drizzle-orm';
import { iso27001Controls } from "../../data/frameworks/iso27001";

export const createIso27001Router = (t: any, clientProcedure: any, clientEditorProcedure: any) => {
    return t.router({
        getSoA: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                console.log(`[ISO27001] Fetching SoA for client: ${input.clientId}`);
                const dbConn = await db.getDb();

                // 1. Fetch existing client controls for ISO 27001 (allowing for name variations)
                const existing = await dbConn.select({
                    clientControl: clientControls,
                    control: controls
                })
                    .from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(and(
                        eq(clientControls.clientId, input.clientId),
                        or(
                            eq(controls.framework, "ISO 27001:2022"),
                            eq(controls.framework, "ISO 27001"),
                            eq(controls.framework, "ISO/IEC 27001"),
                            like(controls.framework, "ISO 27001%")
                        )
                    ));

                if (existing.length > 0) {
                    console.log(`[ISO27001] Found ${existing.length} existing controls`);
                    return existing;
                }
                console.log(`[ISO27001] No controls found for client, checking global...`);

                // 2. If none, check if global controls exist
                const globalControls = await dbConn.select()
                    .from(controls)
                    .where(or(
                        eq(controls.framework, "ISO 27001:2022"),
                        eq(controls.framework, "ISO 27001")
                    ));

                if (globalControls.length === 0) {
                    console.log(`[ISO27001] No global controls found. Seeding ISO 27001:2022...`);
                    // Seed global controls from static data if they don't exist
                    const toInsert = iso27001Controls.map(c => ({
                        controlId: c.id,
                        name: c.name,
                        description: c.description,
                        framework: "ISO 27001:2022",
                        category: c.category,
                        status: 'active' as const,
                        version: 1
                    }));
                    await dbConn.insert(controls).values(toInsert);

                    // Re-fetch
                    const newGlobal = await dbConn.select()
                        .from(controls)
                        .where(or(
                            eq(controls.framework, "ISO 27001:2022"),
                            eq(controls.framework, "ISO 27001")
                        ));

                    // Auto-assign to client
                    const clientBatch = newGlobal.map((c: any) => ({
                        clientId: input.clientId,
                        controlId: c.id,
                        clientControlId: c.controlId,
                        status: 'not_implemented' as const,
                        applicability: 'applicable'
                    }));
                    await dbConn.insert(clientControls).values(clientBatch);

                    return await dbConn.select({
                        clientControl: clientControls,
                        control: controls
                    })
                        .from(clientControls)
                        .innerJoin(controls, eq(clientControls.controlId, controls.id))
                        .where(and(
                            eq(clientControls.clientId, input.clientId),
                            eq(controls.framework, "ISO 27001:2022")
                        ));
                }

                console.log(`[ISO27001] Found ${globalControls.length} global controls, assigning to client...`);

                // 3. Global exist but not assigned to client (or partially assigned)
                const existingClientControlIds = await dbConn.select({
                    controlId: clientControls.controlId
                })
                    .from(clientControls)
                    .where(eq(clientControls.clientId, input.clientId));

                const existingSet = new Set(existingClientControlIds.map((c: { controlId: number }) => c.controlId));

                const clientBatch = globalControls
                    .filter((c: any) => !existingSet.has(c.id))
                    .map((c: any) => ({
                        clientId: input.clientId,
                        controlId: c.id,
                        clientControlId: c.controlId,
                        status: 'not_implemented' as const,
                        applicability: 'applicable'
                    }));

                if (clientBatch.length > 0) {
                    await dbConn.insert(clientControls)
                        .values(clientBatch)
                        .onConflictDoNothing();
                }

                return await dbConn.select({
                    clientControl: clientControls,
                    control: controls
                })
                    .from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(and(
                        eq(clientControls.clientId, input.clientId),
                        or(
                            eq(controls.framework, "ISO 27001:2022"),
                            eq(controls.framework, "ISO 27001")
                        )
                    ));
            }),

        updateSoA: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                controlId: z.number(), // This is the clientControl.id
                applicability: z.enum(["applicable", "not_applicable"]),
                justification: z.string().optional(),
                status: z.enum(["not_implemented", "in_progress", "implemented", "not_applicable"]),
                implementationNotes: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                console.log(`[ISO27001] Updating control ${input.controlId} for client ${input.clientId}`);
                try {
                    const dbConn = await db.getDb();

                    // Security check: ensure this client control belongs to the client
                    const [existing] = await dbConn.select().from(clientControls)
                        .where(and(
                            eq(clientControls.id, input.controlId),
                            eq(clientControls.clientId, input.clientId)
                        ))
                        .limit(1);

                    if (!existing) {
                        console.error(`[ISO27001] Control ${input.controlId} not found or denied for client ${input.clientId}`);
                        throw new TRPCError({ code: "FORBIDDEN", message: "Control not found or access denied" });
                    }

                    await dbConn.update(clientControls)
                        .set({
                            applicability: input.applicability,
                            justification: input.justification,
                            status: input.status,
                            implementationNotes: input.implementationNotes,
                            updatedAt: new Date()
                        })
                        .where(eq(clientControls.id, input.controlId));

                    console.log(`[ISO27001] Update successful`);
                    return { success: true };
                } catch (err: any) {
                    console.error(`[ISO27001] Update failed:`, err);
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
                }
            }),

        seedStarterKit: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                profile: z.enum(["cloud_saas", "hybrid"]).default("cloud_saas")
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await db.getDb();
                let assetsAdded = 0;
                let risksAdded = 0;

                // 1. Seed Assets if empty or minimal
                const existingAssets = await dbConn.select().from(assets).where(eq(assets.clientId, input.clientId));
                if (existingAssets.length === 0) {
                    const baselineAssets = [
                        {
                            clientId: input.clientId,
                            name: "AWS / Cloud Production Infrastructure",
                            type: "Service",
                            category: "Cloud Infrastructure",
                            criticality: "Critical",
                            valuationC: 5,
                            valuationI: 5,
                            valuationA: 5,
                            owner: "DevOps & Cloud SRE Lead",
                            vendor: "Amazon Web Services",
                            status: "active" as const,
                            description: "Primary production VPCs, container clusters, and encrypted data storage."
                        },
                        {
                            clientId: input.clientId,
                            name: "GitHub Enterprise Source Code Repositories",
                            type: "Information",
                            category: "Software & Code",
                            criticality: "Critical",
                            valuationC: 5,
                            valuationI: 5,
                            valuationA: 4,
                            owner: "Head of Engineering",
                            vendor: "GitHub / Microsoft",
                            status: "active" as const,
                            description: "Application source code, CI/CD automated deployment workflows, and secrets management."
                        },
                        {
                            clientId: input.clientId,
                            name: "Google Workspace / M365 Corporate Suite",
                            type: "Service",
                            category: "Productivity & Email",
                            criticality: "High",
                            valuationC: 4,
                            valuationI: 4,
                            valuationA: 4,
                            owner: "IT Operations Lead",
                            vendor: "Google / Microsoft",
                            status: "active" as const,
                            description: "Corporate communication, identity federation, corporate documents, and email infrastructure."
                        },
                        {
                            clientId: input.clientId,
                            name: "Managed Employee Laptops & Workstations",
                            type: "Hardware",
                            category: "Endpoints",
                            criticality: "High",
                            valuationC: 4,
                            valuationI: 4,
                            valuationA: 3,
                            owner: "IT Support Specialist",
                            vendor: "Apple / Dell",
                            status: "active" as const,
                            description: "MDM-managed staff endpoints with full disk encryption (FileVault/BitLocker) and EDR."
                        },
                        {
                            clientId: input.clientId,
                            name: "Production Customer Database & Encrypted Backups",
                            type: "Information",
                            category: "Data Repositories",
                            criticality: "Critical",
                            valuationC: 5,
                            valuationI: 5,
                            valuationA: 5,
                            owner: "Data Engineering Lead",
                            vendor: "PostgreSQL / AWS RDS",
                            status: "active" as const,
                            description: "AES-256 encrypted production customer data store with point-in-time automated recovery."
                        }
                    ];
                    await dbConn.insert(assets).values(baselineAssets);
                    assetsAdded = baselineAssets.length;
                }

                // 2. Seed Baseline Risks if empty
                const existingRisks = await dbConn.select().from(riskAssessments).where(eq(riskAssessments.clientId, input.clientId));
                if (existingRisks.length === 0) {
                    const baselineRisks = [
                        {
                            clientId: input.clientId,
                            assessmentId: "ISO-RA-001",
                            title: "Ransomware Infection or Malware on Employee Endpoint",
                            category: "Cyber Threat",
                            likelihood: "Possible",
                            impact: "High",
                            inherentRisk: "High",
                            inherentScore: 16,
                            residualRisk: "Low",
                            residualScore: 4,
                            riskOwner: "IT Security Lead",
                            treatmentOption: "Mitigate",
                            recommendedActions: "Deploy EDR agents, enforce disk encryption, and restrict local administrator permissions.",
                            status: "draft" as const
                        },
                        {
                            clientId: input.clientId,
                            assessmentId: "ISO-RA-002",
                            title: "Compromised Employee Credentials & Unauthorized Cloud Access",
                            category: "Access Control",
                            likelihood: "Likely",
                            impact: "Critical",
                            inherentRisk: "Critical",
                            inherentScore: 20,
                            residualRisk: "Medium",
                            residualScore: 6,
                            riskOwner: "Identity & Access Manager",
                            treatmentOption: "Mitigate",
                            recommendedActions: "Mandate phishing-resistant MFA (WebAuthn/FIDO2), SSO, and conditional access policies.",
                            status: "draft" as const
                        },
                        {
                            clientId: input.clientId,
                            assessmentId: "ISO-RA-003",
                            title: "Public Storage Bucket Misconfiguration (S3/Cloud Object Storage)",
                            category: "Cloud Governance",
                            likelihood: "Possible",
                            impact: "Critical",
                            inherentRisk: "Critical",
                            inherentScore: 20,
                            residualRisk: "Low",
                            residualScore: 4,
                            riskOwner: "Cloud Architect",
                            treatmentOption: "Mitigate",
                            recommendedActions: "Enforce cloud account level Public Access Block, automated posture scans, and KMS encryption.",
                            status: "draft" as const
                        },
                        {
                            clientId: input.clientId,
                            assessmentId: "ISO-RA-004",
                            title: "Critical SaaS Third-Party Supplier Outage or Breach",
                            category: "Vendor Risk",
                            likelihood: "Likely",
                            impact: "Medium",
                            inherentRisk: "High",
                            inherentScore: 15,
                            residualRisk: "Medium",
                            residualScore: 6,
                            riskOwner: "Vendor Risk Manager",
                            treatmentOption: "Transfer",
                            recommendedActions: "Annual vendor SOC 2/ISO review, multi-region failover architecture, and SaaS configuration backups.",
                            status: "draft" as const
                        },
                        {
                            clientId: input.clientId,
                            assessmentId: "ISO-RA-005",
                            title: "Employee Phishing and Social Engineering Exploitation",
                            category: "Human Factors",
                            likelihood: "Likely",
                            impact: "High",
                            inherentRisk: "High",
                            inherentScore: 16,
                            residualRisk: "Low",
                            residualScore: 4,
                            riskOwner: "Compliance & People Lead",
                            treatmentOption: "Mitigate",
                            recommendedActions: "Monthly simulated phishing campaigns, mandatory onboarding security training, and incident reporting button.",
                            status: "draft" as const
                        }
                    ];
                    await dbConn.insert(riskAssessments).values(baselineRisks);
                    risksAdded = baselineRisks.length;
                }

                return {
                    success: true,
                    assetsAdded,
                    risksAdded,
                    message: `Starter kit initialized: ${assetsAdded} baseline assets and ${risksAdded} ISO 27005 risks added.`
                };
            }),

        getAuditDossier: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await db.getDb();

                // 1. Client details
                const [client] = await dbConn.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);

                // 2. Assets
                const clientAssetList = await dbConn.select().from(assets).where(eq(assets.clientId, input.clientId));

                // 3. Risks
                const clientRiskList = await dbConn.select().from(riskAssessments).where(eq(riskAssessments.clientId, input.clientId));

                // 4. SoA controls
                const soaControls = await dbConn.select({
                    clientControl: clientControls,
                    control: controls
                })
                    .from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(and(
                        eq(clientControls.clientId, input.clientId),
                        or(
                            eq(controls.framework, "ISO 27001:2022"),
                            eq(controls.framework, "ISO 27001"),
                            eq(controls.framework, "ISO/IEC 27001"),
                            like(controls.framework, "ISO 27001%")
                        )
                    ));

                // 5. Policies
                const policyList = await dbConn.select().from(clientPolicies).where(eq(clientPolicies.clientId, input.clientId));

                // Metrics
                const totalControls = soaControls.length;
                const implementedControls = soaControls.filter((c: any) => c.clientControl?.status === 'implemented').length;
                const inProgressControls = soaControls.filter((c: any) => c.clientControl?.status === 'in_progress').length;
                const notApplicableControls = soaControls.filter((c: any) => c.clientControl?.applicability === 'not_applicable').length;
                const totalRisks = clientRiskList.length;
                const treatedRisks = clientRiskList.filter((r: any) => r.treatmentOption && r.treatmentOption !== '').length;
                const totalAssets = clientAssetList.length;
                const totalPolicies = policyList.length;
                const approvedPolicies = policyList.filter((p: any) => p.status === 'approved' || p.approvalStatus === 'approved').length;

                return {
                    client: {
                        id: client?.id || input.clientId,
                        name: client?.name || "Client Organization",
                        industry: client?.industry || "Technology / SaaS",
                        size: client?.size || "SMB",
                        primaryContactName: client?.primaryContactName || "Information Security Manager"
                    },
                    summary: {
                        totalControls,
                        implementedControls,
                        inProgressControls,
                        notApplicableControls,
                        totalRisks,
                        treatedRisks,
                        totalAssets,
                        totalPolicies,
                        approvedPolicies,
                        maturityPercentage: totalControls > 0 
                            ? Math.round(((implementedControls + notApplicableControls) / totalControls) * 100) 
                            : 0
                    },
                    assets: clientAssetList,
                    risks: clientRiskList,
                    soa: soaControls,
                    policies: policyList,
                    generatedAt: new Date().toISOString()
                };
            })
    });
};

