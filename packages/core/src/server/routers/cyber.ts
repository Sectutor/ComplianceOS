
import { z } from "zod";
import {
    privacyAssessments,
    incidents,
    nis2Mappings,
    clientControls,
    controls,
    clients,
    evidence
} from "../../schema";
import { getDb } from "../../db";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ENISA_THREAT_TAXONOMY } from "../../lib/threat-intel/enisa-taxonomy";
import { generateScenariosForClient, ThreatScenario } from "../../lib/threat-intel/scenario-generator";

export const createCyberRouter = (t: any, clientProcedure: any) => {
    // Map frontend framework IDs to control framework names in the database
    const frameworkMap: Record<string, string | string[]> = {
        'NIS2': ['ISO 27001:2022', 'ISO/IEC 27001:2022', 'ISO 27001', 'ISO 27002:2022'],
        'NIST_CSF': ['NIST CSF', 'NIST CSF 1.1', 'NIST CSF 2.0'],
        'SOC2': ['SOC 2', 'SOC 2 Type II'],
        'PCI_DSS': ['PCI DSS v4.0', 'PCI-DSS'],
    };

    return t.router({
        getMappings: clientProcedure
            .input(z.object({ clientId: z.number(), framework: z.string().optional() }))
            .query(async ({ input, ctx }: { input: any, ctx: any }) => {
                // Client authorization check
                if (!ctx.clientId || ctx.clientId !== input.clientId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to this client\'s data' });
                }

                const db = await getDb();
                const clientId = input.clientId;
                const frameworkInput = input.framework || 'NIS2';
                const dbFramework = frameworkMap[frameworkInput] || frameworkInput;

                // Get all nis2 mappings
                const mappings = await db.select().from(nis2Mappings);

                // Fetch the assessment to get the specific NIS2 requirement statuses
                const assessment = await db.query.privacyAssessments.findFirst({
                    where: and(
                        eq(privacyAssessments.clientId, clientId),
                        eq(privacyAssessments.type, 'nis2')
                    )
                });
                const responses = (assessment?.responses as Record<string, any>) || {};

                // Get ALL client's controls with their status and framework
                // We don't filter by framework here so we can find any control ID mapped to NIS2
                const clientControlsData = await db.select({
                    id: clientControls.id,
                    controlId: clientControls.controlId,
                    status: clientControls.status,
                    controlFramework: controls.framework,
                    controlControlId: controls.controlId,
                    evidenceCount: sql<number>`(SELECT COUNT(*) FROM ${evidence} WHERE ${evidence.clientControlId} = ${clientControls.id})`,
                })
                    .from(clientControls)
                    .leftJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(eq(clientControls.clientId, clientId));

                // Create a map of controlId -> client control data
                const clientControlMap = new Map();
                clientControlsData.forEach((cc: any) => {
                    if (cc.controlControlId) {
                        clientControlMap.set(cc.controlControlId, cc);
                    }
                });

                // Enrich mappings with client-specific data
                const enrichedMappings = mappings.map((mapping: any) => {
                    // Find client controls for each target framework control in the mapping
                    let mappedControlIds: string[] = [];
                    if (frameworkInput === 'NIST_CSF') mappedControlIds = (mapping as any).nistCsfControlIds || [];
                    else if (frameworkInput === 'SOC2') mappedControlIds = (mapping as any).soc2ControlIds || [];
                    else if (frameworkInput === 'PCI_DSS') mappedControlIds = (mapping as any).pciDssControlIds || [];
                    else mappedControlIds = mapping.iso27001ControlIds as string[] || [];

                    const clientControlsForMapping = mappedControlIds
                        .map(ctrlId => clientControlMap.get(ctrlId))
                        .filter(Boolean);

                    // Determine overall status based on the NIS2 assessment answers
                    let status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable' = 'not_started';
                    const answer = responses[`nis2_${mapping.enisaMeasureId}`]?.answer;
                    
                    if (answer === 'yes') {
                        status = 'implemented';
                    } else if (answer === 'partial') {
                        status = 'in_progress';
                    } else if (answer === 'na') {
                        status = 'not_applicable';
                    } else {
                        status = 'not_started';
                    }

                    return {
                        ...mapping,
                        mappedControlIds,
                        clientStatus: status,
                        implementedCount: clientControlsForMapping.filter((cc: any) => cc.status === 'implemented').length,
                        inProgressCount: clientControlsForMapping.filter((cc: any) => cc.status === 'in_progress').length,
                        totalEvidence: clientControlsForMapping.reduce((sum: number, cc: any) => sum + (cc.evidenceCount || 0), 0),
                        clientControls: clientControlsForMapping,
                    };
                });

                // Get all unique control IDs mentioned in any mapping
                const allMappedIds = Array.from(new Set(enrichedMappings.flatMap((m: any) => m.mappedControlIds))) as string[];
                
                // Fetch the names and descriptions for these specific controls ONLY
                const globalControlsData = allMappedIds.length > 0
                    ? await db.select({
                        controlId: controls.controlId,
                        name: controls.name,
                        description: controls.description
                    })
                    .from(controls)
                    // We fetch all controls in the DB because our fuzzy matching needs a bit more coverage 
                    // or we can generate variations of allMappedIds to use in the inArray filter
                    : [];

                // To be more efficient and find controls even with ID variations (e.g. ID.AM-1 vs ID.AM-01)
                // we'll fetch a slightly larger set if needed, or better, we normalize our lookup.
                // For now, let's generate 0-padded variations for NIST and prefix-less variations for PCI
                const expandedIds = new Set<string>(allMappedIds);
                allMappedIds.forEach(id => {
                    // NIST variations: ID.AM-1 -> ID.AM-01
                    if (id.startsWith('ID.') || id.includes('.')) {
                        const parts = id.split('-');
                        if (parts.length === 2 && parts[1].length === 1) {
                            expandedIds.add(`${parts[0]}-0${parts[1]}`);
                        }
                    }
                    // PCI variations: Req-12.1 -> 12.1
                    if (id.startsWith('Req-')) {
                        expandedIds.add(id.replace('Req-', ''));
                    }
                });

                const allPotentialIds = Array.from(expandedIds);
                const actualGlobalControls = allPotentialIds.length > 0
                    ? await db.select({
                        controlId: controls.controlId,
                        name: controls.name,
                        description: controls.description
                    })
                    .from(controls)
                    .where(inArray(controls.controlId, allPotentialIds))
                    : [];

                const globalControlMap = new Map();
                const normalizedMap = new Map();

                const normalize = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/0+([1-9])/g, '$1');

                actualGlobalControls.forEach((c: any) => {
                    globalControlMap.set(c.controlId, c);
                    globalControlMap.set(normalize(c.controlId), c);
                });

                // final loop to add the metadata
                return enrichedMappings.map((m: any) => ({
                    ...m,
                    mappedControlsData: m.mappedControlIds.map((ctrlId: string) => {
                        // Try exact match first, then normalized
                        const globalCtrl = globalControlMap.get(ctrlId) || globalControlMap.get(normalize(ctrlId));
                        const clientCtrl = clientControlMap.get(ctrlId);
                        
                        return {
                            id: ctrlId,
                            name: globalCtrl?.name || '',
                            description: globalCtrl?.description || '',
                            status: clientCtrl?.status || 'not_started'
                        };
                    })
                }));
            }),
        // ==================== NIS2 ASSESSMENT ====================

        getAssessment: clientProcedure
            .input(z.object({
                clientId: z.number()
            }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const queryClientId = input.clientId;

                console.log('[CyberRouter getAssessment] clientId:', queryClientId);

                if (!queryClientId || queryClientId <= 0) {
                    console.log('[CyberRouter getAssessment] Invalid clientId, returning null');
                    return null;
                }

                // We reuse the privacyAssessments table but with type 'nis2'
                const assessment = await db.query.privacyAssessments.findFirst({
                    where: and(
                        eq(privacyAssessments.clientId, queryClientId),
                        eq(privacyAssessments.type, 'nis2')
                    )
                });

                console.log('[CyberRouter getAssessment] Found:', assessment ? 'yes' : 'no', assessment?.id);
                console.log('[CyberRouter getAssessment] Score:', assessment?.score);
                console.log('[CyberRouter getAssessment] Status:', assessment?.status);
                console.log('[CyberRouter getAssessment] Responses keys:', assessment?.responses ? Object.keys(assessment.responses).join(', ') : 'none');
                if (assessment?.responses) {
                    const firstKey = Object.keys(assessment.responses)[0];
                    if (firstKey) {
                        console.log('[CyberRouter getAssessment] First response value:', JSON.stringify(assessment.responses[firstKey]));
                    }
                }

                if (!assessment) return null;

                // Strip possible Drizzle proxies explicitly to prevent superjson errors,
                // while preserving the original Date objects natively.
                return {
                    id: assessment.id,
                    clientId: assessment.clientId,
                    type: assessment.type,
                    responses: assessment.responses,
                    status: assessment.status,
                    score: assessment.score,
                    updatedAt: assessment.updatedAt,
                    createdAt: assessment.createdAt
                };
            }),

        saveAssessment: clientProcedure
            .input(z.object({
                clientId: z.number().or(z.string()),
                responses: z.any(),
                status: z.string(),
                score: z.number().optional()
            }))
            .mutation(async ({ input }: { input: any }) => {
                console.log('[CyberRouter saveAssessment] ========== START ==========');
                console.log('[CyberRouter saveAssessment] Input clientId:', input.clientId);
                console.log('[CyberRouter saveAssessment] Input responses:', JSON.stringify(input.responses).substring(0, 300));
                // Log first response
                if (input.responses) {
                    const firstKey = Object.keys(input.responses)[0];
                    if (firstKey) {
                        console.log('[CyberRouter saveAssessment] First response being saved:', JSON.stringify(input.responses[firstKey]));
                    }
                }
                console.log('[CyberRouter saveAssessment] Input status:', input.status);

                try {
                    // Normalize clientId to number
                    let clientIdNum = typeof input.clientId === 'string' ? parseInt(input.clientId, 10) : input.clientId;
                    if (!clientIdNum || isNaN(clientIdNum)) {
                        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid client ID" });
                    }

                    const db = await getDb();

                    // Find existing
                    const existing = await db.query.privacyAssessments.findFirst({
                        where: and(
                            eq(privacyAssessments.clientId, clientIdNum),
                            eq(privacyAssessments.type, 'nis2')
                        )
                    });

                    if (existing) {
                        console.log('[CyberRouter saveAssessment] Updating ID:', existing.id);
                        await db.update(privacyAssessments)
                            .set({
                                responses: input.responses,
                                status: input.status,
                                score: input.score ?? 0,
                                updatedAt: new Date()
                            })
                            .where(eq(privacyAssessments.id, existing.id));
                        console.log('[CyberRouter saveAssessment] Updated');
                    } else {
                        console.log('[CyberRouter saveAssessment] Creating new');
                        await db.insert(privacyAssessments).values({
                            clientId: clientIdNum,
                            type: 'nis2',
                            responses: input.responses,
                            status: input.status,
                            score: input.score ?? 0
                        });
                        console.log('[CyberRouter saveAssessment] Created');
                    }
                } catch (e: any) {
                    console.error('[CyberRouter saveAssessment] Error:', e);
                    // Return error as serializable object
                    return { success: false, error: e.message || 'Unknown error' };
                }

                // Return success - ensure it's serializable
                return { success: true, savedAt: new Date().toISOString() };
            }),

        autoSyncNis2FromIso: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const assessmentClientId = input.clientId;

                // 1. Fetch Mappings
                const mappings = await db.select().from(nis2Mappings);

                // 2. Fetch ISO Controls Statuses
                const isoControls = await db.select({
                    id: controls.controlId,
                    status: clientControls.status
                })
                    .from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(and(
                        eq(clientControls.clientId, assessmentClientId),
                        or(
                            eq(controls.framework, "ISO 27001:2022"),
                            eq(controls.framework, "ISO 27001")
                        )
                    ));

                const controlStatusMap = new Map(isoControls.map(c => [c.id, c.status]));

                // 3. Fetch existing assessment
                const assessment = await db.query.privacyAssessments.findFirst({
                    where: and(
                        eq(privacyAssessments.clientId, assessmentClientId),
                        eq(privacyAssessments.type, 'nis2')
                    )
                });

                let responses: any = assessment?.responses || {};

                // MIGRATION: Map old question IDs to new NIS2 format to preserve existing data
                // This ensures backward compatibility with assessments that used old IDs
                const oldToNewIdMap: Record<string, string> = {
                    'rm_1': 'nis2_1.1',
                    'rm_3': 'nis2_2.1',
                    'ih_1': 'nis2_3.1',
                    'bc_2': 'nis2_4.1',
                    'sc_1': 'nis2_5.1',
                    'tr_1': 'nis2_8.1',
                    'mfa_1': 'nis2_11.7',
                    'bc_1': 'nis2_4.2',
                    'enc_1': 'nis2_9.1'
                };

                for (const [oldId, newId] of Object.entries(oldToNewIdMap)) {
                    if (responses[oldId] && !responses[newId]) {
                        console.log(`[NIS2 Migration] Migrating response from ${oldId} to ${newId}`);
                        responses[newId] = responses[oldId];
                    }
                }

                // 4. Update responses based on ISO mapping
                // Map ENISA Measure IDs to existing Questionnaire IDs or new Measure IDs
                const syncSummary: string[] = [];

                for (const mapping of mappings) {
                    const mappedIsoIds = mapping.iso27001ControlIds as string[];
                    if (!mappedIsoIds || mappedIsoIds.length === 0) continue;

                    const statuses = mappedIsoIds.map(id => controlStatusMap.get(id) || 'not_implemented');

                    let resolvedStatus: 'yes' | 'partial' | 'not_started' = 'not_started';
                    if (statuses.every(s => s === 'implemented')) {
                        resolvedStatus = 'yes';
                    } else if (statuses.some(s => s === 'implemented' || s === 'in_progress')) {
                        resolvedStatus = 'partial';
                    }

                    const qId = `nis2_${mapping.enisaMeasureId}`;

                    if (!responses[qId] || responses[qId].answer !== resolvedStatus) {
                        responses[qId] = {
                            ...responses[qId],
                            answer: resolvedStatus,
                            notes: (responses[qId]?.notes || '') + `\n[Auto-sync from ISO 27001: ${mappedIsoIds.join(', ')}]`
                        };
                        syncSummary.push(mapping.enisaMeasureTitle);
                    }
                }

                // 5. Save updated assessment
                if (syncSummary.length > 0) {
                    if (assessment) {
                        await db.update(privacyAssessments)
                            .set({
                                responses,
                                updatedAt: new Date(),
                                status: 'in_progress' // Default to in_progress if we sync
                            })
                            .where(eq(privacyAssessments.id, assessment.id));
                    } else {
                        await db.insert(privacyAssessments).values({
                            clientId: assessmentClientId,
                            type: 'nis2',
                            responses,
                            status: 'in_progress'
                        });
                    }
                }

                return {
                    success: true,
                    syncedMeasures: syncSummary.length,
                    measures: syncSummary
                };
            }),

        // ==================== THREAT INTELLIGENCE ====================

        getThreatTaxonomy: clientProcedure
            .query(() => {
                return ENISA_THREAT_TAXONOMY;
            }),

        getThreatScenarios: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));

                if (!client) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
                }

                const industry = client.industry || "General";
                return generateScenariosForClient(industry);
            }),

        // ==================== INCIDENT REPORTING ====================

        reportIncident: clientProcedure
            .input(z.object({
                clientId: z.number(),
                detectedAt: z.string(),
                severity: z.enum(["low", "medium", "high", "critical"]),
                cause: z.string(),
                description: z.string(),
                crossBorderImpact: z.boolean(),
                reporterName: z.string().optional(),
                affectedAssets: z.string().optional(),
                title: z.string().optional(),
                // NIS2 Fields
                isSignificant: z.boolean().optional(),
                significanceCriteria: z.array(z.string()).optional(),
                affectedUsersCount: z.number().optional(),
                serviceDisruptionDuration: z.number().optional(),
                estimatedFinancialLoss: z.number().optional(),
                isContinuityTriggered: z.boolean().optional(),
                earlyWarningSentAt: z.string().optional(),
                intermediateReportSentAt: z.string().optional(),
                finalReportSentAt: z.string().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                try {
                    const [incident] = await db.insert(incidents).values({
                        clientId: input.clientId,
                        title: input.title || `Incident Report - ${new Date().toLocaleDateString()}`,
                        detectedAt: new Date(input.detectedAt),
                        severity: input.severity,
                        cause: input.cause.length > 100 ? input.cause.substring(0, 100) : input.cause,
                        description: input.description,
                        crossBorderImpact: input.crossBorderImpact,
                        reporterName: input.reporterName || ctx.user?.name || "System",
                        affectedAssets: input.affectedAssets,
                        status: 'open',
                        // NIS2 Mapping
                        isSignificant: input.isSignificant || false,
                        significanceCriteria: input.significanceCriteria || [],
                        affectedUsersCount: input.affectedUsersCount || 0,
                        serviceDisruptionDuration: input.serviceDisruptionDuration || 0,
                        estimatedFinancialLoss: input.estimatedFinancialLoss || 0,
                        isContinuityTriggered: input.isContinuityTriggered || false,
                        earlyWarningSentAt: input.earlyWarningSentAt ? new Date(input.earlyWarningSentAt) : null,
                        intermediateReportSentAt: input.intermediateReportSentAt ? new Date(input.intermediateReportSentAt) : null,
                        finalReportSentAt: input.finalReportSentAt ? new Date(input.finalReportSentAt) : null
                    }).returning();

                    // In a real scenario, this might trigger emails to CSIRT
                    console.log(`[INCIDENT] New incident reported: ID ${incident.id} for Client ${input.clientId}`);

                    return { success: true, incidentId: incident.id };
                } catch (e: any) {
                    console.error("Failed to report incident:", e);
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to submit incident report"
                    });
                }
            }),

        getIncidents: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                return await db.select().from(incidents)
                    .where(eq(incidents.clientId, input.clientId))
                    .orderBy(incidents.createdAt);
            }),

        getIncident: clientProcedure
            .input(z.object({
                clientId: z.number(),
                incidentId: z.number()
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const incident = await db.select().from(incidents)
                    .where(and(
                        eq(incidents.clientId, input.clientId),
                        eq(incidents.id, input.incidentId)
                    ))
                    .limit(1);

                if (!incident.length) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Incident not found"
                    });
                }
                return incident[0];
            }),

        updateIncident: clientProcedure
            .input(z.object({
                clientId: z.number(),
                incidentId: z.number(),
                title: z.string().optional(),
                severity: z.enum(["low", "medium", "high", "critical"]).optional(),
                cause: z.string().optional(),
                description: z.string().optional(),
                crossBorderImpact: z.boolean().optional(),
                affectedAssets: z.string().optional(),
                status: z.enum(["open", "investigating", "mitigated", "resolved", "reported"]).optional(),
                reportedToAuthorities: z.boolean().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();

                const updateData: any = { updatedAt: new Date() };
                if (input.title !== undefined) updateData.title = input.title;
                if (input.severity !== undefined) updateData.severity = input.severity;
                if (input.cause !== undefined) updateData.cause = input.cause.length > 100 ? input.cause.substring(0, 100) : input.cause;
                if (input.description !== undefined) updateData.description = input.description;
                if (input.crossBorderImpact !== undefined) updateData.crossBorderImpact = input.crossBorderImpact;
                if (input.affectedAssets !== undefined) updateData.affectedAssets = input.affectedAssets;
                if (input.status !== undefined) updateData.status = input.status;
                if (input.reportedToAuthorities !== undefined) updateData.reportedToAuthorities = input.reportedToAuthorities;

                await db.update(incidents)
                    .set(updateData)
                    .where(and(
                        eq(incidents.clientId, input.clientId),
                        eq(incidents.id, input.incidentId)
                    ));

                console.log(`[INCIDENT] Updated incident ID ${input.incidentId}`);
                return { success: true };
            })
    });
};




