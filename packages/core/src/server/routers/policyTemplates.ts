
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as schema from "../../schema";
import { policyTemplates, clientPolicies } from "../../schema";
import { getDb } from "../../db";
import { eq, desc, or, and, sql, inArray } from "drizzle-orm";

// Configurable concurrency limit for policy generation to avoid overwhelming the LLM API
const CONCURRENCY_LIMIT = Number(process.env.POLICY_GENERATION_CONCURRENCY) || 3;

export const createPolicyTemplatesRouter = (t: any, publicProcedure: any, isAuthed: any, adminProcedure: any) => {
    return t.router({
        list: publicProcedure
            .use(isAuthed)
            .input(z.object({
                framework: z.string().optional(),
                clientId: z.number().optional()
            }).optional())
            .query(async ({ input, ctx }: any) => {
                const db = await getDb();

                const baseConditions = [
                    or(
                        eq(policyTemplates.isPublic, true),
                        eq(policyTemplates.ownerId, ctx.user.id),
                        input?.clientId ? eq(policyTemplates.clientId, input.clientId) : undefined
                    )
                ].filter(Boolean);

                const whereClause = and(...baseConditions as any);

                // If framework filter is provided and not 'all', filter by framework
                // frameworks is a JSON array, so we check if it contains the framework
                if (input?.framework && input.framework !== 'all') {
                    return await db.select().from(policyTemplates)
                        .where(and(
                            whereClause,
                            sql`${policyTemplates.frameworks}::jsonb @> ${JSON.stringify([input.framework])}::jsonb`
                        ));
                }

                return await db.select().from(policyTemplates)
                    .where(whereClause);
            }),

        get: publicProcedure
            .use(isAuthed)
            .input(z.object({ templateId: z.string() }))
            .query(async ({ input, ctx }: any) => {
                const db = await getDb();
                const [template] = await db.select().from(policyTemplates)
                    .where(eq(policyTemplates.templateId, input.templateId));

                if (!template) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
                }

                // Privacy check
                if (!template.isPublic && template.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
                    // Also check if clientId matches if user has access to that client
                    if (template.clientId) {
                        const [membership] = await db.select().from(schema.userClients)
                            .where(and(eq(schema.userClients.userId, ctx.user.id), eq(schema.userClients.clientId, template.clientId)));

                        if (!membership && ctx.user.role !== 'admin') {
                            throw new TRPCError({ code: "FORBIDDEN", message: "Private template" });
                        }
                    } else {
                        throw new TRPCError({ code: "FORBIDDEN", message: "Private template" });
                    }
                }

                return template;
            }),

        create: publicProcedure
            .use(isAuthed)
            .input(z.object({
                name: z.string(),
                content: z.string().optional(),
                sections: z.any().optional(),
                isPublic: z.boolean().default(false),
                clientId: z.number().optional(),
                tailoringQuestions: z.any().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const templateId = `tpl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                const [template] = await db.insert(policyTemplates).values({
                    templateId,
                    name: input.name,
                    content: input.content || "",
                    sections: input.sections,
                    ownerId: ctx.user.id,
                    isPublic: input.isPublic,
                    clientId: input.clientId,
                    tailoringQuestions: input.tailoringQuestions
                }).returning();

                return template;
            }),

        update: publicProcedure
            .use(isAuthed)
            .input(z.object({
                id: z.number(),
                name: z.string().optional(),
                content: z.string().optional(),
                isPublic: z.boolean().optional(),
                sections: z.any().optional(),
                tailoringQuestions: z.any().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();

                const [existing] = await db.select().from(policyTemplates).where(eq(policyTemplates.id, input.id));

                if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

                if (existing.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Not your template" });
                }

                const { id, ...data } = input;
                const [updated] = await db.update(policyTemplates)
                    .set(data)
                    .where(eq(policyTemplates.id, id))
                    .returning();

                return updated;
            }),

        delete: publicProcedure
            .use(isAuthed)
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const [existing] = await db.select().from(policyTemplates).where(eq(policyTemplates.id, input.id));

                if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

                if (existing.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Not your template" });
                }

                await db.delete(policyTemplates).where(eq(policyTemplates.id, input.id));
                return { success: true };
            }),

        deploy: publicProcedure
            .use(isAuthed)
            .input(z.object({
                templateId: z.string(),
                clientIds: z.array(z.number()),
                answers: z.record(z.any()).optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                try {
                    const dbConn = await getDb();
                    const { policyGenerator } = await import("../../lib/policy/policy-generation");

                    // Get Template
                    const [template] = await dbConn.select().from(policyTemplates)
                        .where(eq(policyTemplates.templateId, input.templateId));

                    if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

                    // Check Access
                    if (!template.isPublic && template.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
                        throw new TRPCError({ code: "FORBIDDEN", message: "No access to template" });
                    }

                    // Parallelize policy generation with concurrency limit
                    const results: { clientId: number; policyId: number }[] = [];

                    // Pre-fetch all memberships in a single batch query instead of sequential queries
                    const membershipCheckStart = Date.now();
                    const clientIdsToProcess: number[] = [];

                    // Batch check: get all user memberships for all clientIds at once
                    const isAdmin = ctx.user.role === 'admin';
                    if (isAdmin) {
                        // Admins have access to all clients
                        clientIdsToProcess.push(...input.clientIds);
                    } else {
                        // Get all memberships for this user in one query
                        const allMemberships = await dbConn.select({ clientId: schema.userClients.clientId })
                            .from(schema.userClients)
                            .where(eq(schema.userClients.userId, ctx.user.id));

                        const allowedClientIds = new Set(allMemberships.map((m: any) => m.clientId));

                        // Filter to only clients the user has access to
                        for (const clientId of input.clientIds) {
                            if (allowedClientIds.has(clientId)) {
                                clientIdsToProcess.push(clientId);
                            }
                        }
                    }
                    console.log(`[BulkDeploy] Membership check: ${Date.now() - membershipCheckStart}ms, processing ${clientIdsToProcess.length}/${input.clientIds.length} clients`);

                    // Process clients in batches with limited concurrency
                    const processStart = Date.now();
                    for (let i = 0; i < clientIdsToProcess.length; i += CONCURRENCY_LIMIT) {
                        const batch = clientIdsToProcess.slice(i, i + CONCURRENCY_LIMIT);
                        const batchResults = await Promise.all(
                            batch.map(async (clientId) => {
                                try {
                                    // Generate tailored content
                                    const genStart = Date.now();
                                    const tailoredContent = await policyGenerator.generate(clientId, template.id, {
                                        answers: input.answers
                                    });
                                    console.log(`[BulkDeploy] Generated policy for client ${clientId} in ${Date.now() - genStart}ms`);

                                    // Create policy from template
                                    const [policy] = await dbConn.insert(schema.clientPolicies).values({
                                        clientId,
                                        templateId: template.id,
                                        name: template.name,
                                        content: tailoredContent,
                                        status: 'draft',
                                        version: 1,
                                        owner: ctx.user.name,
                                        tailoringAnswers: input.answers
                                    }).returning();

                                    return { clientId, policyId: policy.id, success: true };
                                } catch (error) {
                                    console.error(`[BulkDeploy] Failed for client ${clientId}:`, error);
                                    return { clientId, policyId: 0, success: false };
                                }
                            })
                        );

                        results.push(...batchResults.filter(r => r.success).map(r => ({ clientId: r.clientId, policyId: r.policyId })));
                    }

                    console.log(`[BulkDeploy] Total processing time: ${Date.now() - processStart}ms`);
                    return { success: true, deployedTo: results.length, details: results };
                } catch (error: any) {
                    console.error('[PolicyTemplates deploy] Error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to deploy policy'
                    });
                }
            }),

        bulkDeploy: publicProcedure
            .use(isAuthed)
            .input(z.object({
                clientId: z.number(),
                templateIds: z.array(z.number()),
                answers: z.record(z.any()).optional(),
                tailor: z.boolean().optional(),
                instruction: z.string().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                try {
                    const dbConn = await getDb();
                    const { policyGenerator } = await import("../../lib/policy/policy-generation");

                    // Check client access
                    const membership = await dbConn.select().from(schema.userClients)
                        .where(and(eq(schema.userClients.userId, ctx.user.id), eq(schema.userClients.clientId, input.clientId)));

                    if (membership.length === 0 && ctx.user.role !== 'admin') {
                        throw new TRPCError({ code: "FORBIDDEN", message: "No access to client" });
                    }

                    // Get templates
                    const templates = await dbConn.select().from(policyTemplates)
                        .where(inArray(policyTemplates.id, input.templateIds));

                    // Filter accessible templates first
                    const accessibleTemplates = templates.filter((template: any) =>
                        template.isPublic || template.ownerId === ctx.user.id || ctx.user.role === 'admin'
                    );

                    // Process templates in parallel with concurrency limit
                    const results: { templateId: number; policyId: number }[] = [];
                    const processStart = Date.now();

                    for (let i = 0; i < accessibleTemplates.length; i += CONCURRENCY_LIMIT) {
                        const batch = accessibleTemplates.slice(i, i + CONCURRENCY_LIMIT);
                        const batchResults = await Promise.all(
                            batch.map(async (template: any) => {
                                try {
                                    const genStart = Date.now();
                                    const tailoredContent = await policyGenerator.generate(input.clientId, template.id, {
                                        answers: input.answers,
                                        tailorToIndustry: input.tailor,
                                        customInstruction: input.instruction
                                    });
                                    console.log(`[BulkDeploy] Generated policy for template ${template.id} in ${Date.now() - genStart}ms`);

                                    const [policy] = await dbConn.insert(schema.clientPolicies).values({
                                        clientId: input.clientId,
                                        templateId: template.id,
                                        name: template.name,
                                        content: tailoredContent,
                                        status: 'draft',
                                        version: 1,
                                        owner: ctx.user.name,
                                        tailoringAnswers: input.answers,
                                        isAiGenerated: !!input.tailor
                                    }).returning();

                                    return { templateId: template.id, policyId: policy.id, success: true };
                                } catch (error) {
                                    console.error(`[BulkDeploy] Failed for template ${template.id}:`, error);
                                    return { templateId: template.id, policyId: 0, success: false };
                                }
                            })
                        );

                        results.push(...batchResults.filter(r => r.success).map(r => ({ templateId: r.templateId, policyId: r.policyId })));
                    }

                    console.log(`[BulkDeploy] Total processing time for ${accessibleTemplates.length} templates: ${Date.now() - processStart}ms`);
                    return { success: true, deployed: results };
                } catch (error: any) {
                    console.error('[PolicyTemplates bulkDeploy] Error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to bulk deploy policies'
                    });
                }
            }),

        preview: publicProcedure
            .use(isAuthed)
            .input(z.object({
                clientId: z.number(),
                templateId: z.number().optional(),
                sections: z.array(z.string()).optional(),
                tailor: z.boolean().optional(),
                instruction: z.string().optional(),
                answers: z.record(z.any()).optional()
            }))
            .mutation(async ({ input }: any) => {
                try {
                    const { policyGenerator } = await import("../../lib/policy/policy-generation");

                    let content = "";
                    if (input.templateId) {
                        content = await policyGenerator.generate(input.clientId, input.templateId, {
                            tailorToIndustry: input.tailor,
                            customInstruction: input.instruction,
                            answers: input.answers
                        });
                    } else if (input.sections && input.sections.length > 0) {
                        content = await policyGenerator.generateFromSections(input.clientId, "New Policy", input.sections, {
                            tailorToIndustry: input.tailor,
                            customInstruction: input.instruction,
                            answers: input.answers
                        });
                    }

                    if (!content || content.trim().length === 0) {
                        throw new Error("Failed to generate policy content. Please check that the template has content or sections.");
                    }

                    return { content };
                } catch (error: any) {
                    console.error('[PolicyTemplates preview] Error generating policy:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to generate policy preview'
                    });
                }
            }),

        // Streaming policy generation for real-time preview
        previewStream: publicProcedure
            .use(isAuthed)
            .input(z.object({
                clientId: z.number(),
                templateId: z.number().optional(),
                sections: z.array(z.string()).optional(),
                tailor: z.boolean().optional(),
                instruction: z.string().optional(),
                answers: z.record(z.any()).optional()
            }))
            .mutation(async ({ input }: any) => {
                const { policyGenerator } = await import("../../lib/policy/policy-generation");
                const { llmService } = await import("../../lib/llm/service");

                let baseContent = "";
                if (input.templateId) {
                    baseContent = await policyGenerator.generate(input.clientId, input.templateId, {
                        tailorToIndustry: false,
                        customInstruction: "",
                        answers: input.answers
                    });
                } else if (input.sections && input.sections.length > 0) {
                    baseContent = await policyGenerator.generateFromSections(input.clientId, "New Policy", input.sections, {
                        tailorToIndustry: false,
                        customInstruction: "",
                        answers: input.answers
                    });
                }

                if (!baseContent || baseContent.trim().length === 0) {
                    throw new Error("Failed to generate policy content. Please check that the template has content or sections.");
                }

                // If AI tailoring is enabled, stream the AI response
                if (input.tailor || input.instruction) {
                    const db = await getDb();
                    const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, input.clientId));
                    if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

                    const language = client.policyLanguage || 'en';
                    const userPrompt = `You are an expert CISO and Compliance Officer. Please refine the following policy content for ${client.name} in the ${client.industry || 'general'} industry.\n\n${input.instruction ? `USER INSTRUCTION: ${input.instruction}` : ''}\n\nIMPORTANT: Write the ENTIRE refined policy in detail. Maintain professional tone. Use Markdown formatting with double newlines between sections.\n\nOriginal Policy:\n${baseContent}`;
                    const systemPrompt = "You are a specialized compliance policy writer. Always use strict Markdown with double newlines between sections.";

                    // Return base content and streaming params
                    return { 
                        baseContent, 
                        needsAiTailoring: true,
                        streamingParams: { 
                            userPrompt, 
                            systemPrompt, 
                            feature: 'policy_generation',
                            language
                        }
                    };
                }

                return { content: baseContent, needsAiTailoring: false };
            }),

        // Stream AI tailoring for a policy
        streamAiTailoring: publicProcedure
            .use(isAuthed)
            .input(z.object({
                clientId: z.number(),
                baseContent: z.string(),
                instruction: z.string().optional(),
                language: z.string().optional()
            }))
            .mutation(async function* ({ input }: any) {
                const { llmService } = await import("../../lib/llm/service");
                const db = await getDb();
                
                const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, input.clientId));
                if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

                const userPrompt = `You are an expert CISO and Compliance Officer. Please refine the following policy content for ${client.name} in the ${client.industry || 'general'} industry.\n\n${input.instruction ? `USER INSTRUCTION: ${input.instruction}` : ''}\n\nIMPORTANT: Write the ENTIRE refined policy in detail. Maintain professional tone. Use Markdown formatting with double newlines between sections.\n\nOriginal Policy:\n${input.baseContent}`;
                const systemPrompt = "You are a specialized compliance policy writer. Always use strict Markdown with double newlines between sections.";

                try {
                    for await (const chunk of llmService.generateStream(
                        { userPrompt, systemPrompt, feature: 'policy_generation', maxTokens: 8000 },
                        { endpoint: 'stream_ai_tailoring', clientId: input.clientId }
                    )) {
                        yield { chunk };
                    }
                    yield { done: true };
                } catch (error: any) {
                    console.error('[streamAiTailoring] Error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to stream AI response'
                    });
                }
            }),

        suggestQuestions: publicProcedure
            .use(isAuthed)
            .input(z.object({
                policyName: z.string(),
                industry: z.string().optional(),
                existingQuestions: z.array(z.string()).optional()
            }))
            .mutation(async ({ input }: any) => {
                const { policyGenerator } = await import("../../lib/policy/policy-generation");
                return await policyGenerator.suggestTailoringQuestions(
                    input.policyName,
                    input.industry,
                    input.existingQuestions
                );
            }),

        upgradeAll: publicProcedure
            .use(isAuthed)
            .input(z.object({
                dryRun: z.boolean().default(true)
            }).optional())
            .mutation(async ({ input, ctx }: any) => {
                if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner' && ctx.user.role !== 'super_admin') {
                    throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Owner required" });
                }
                const db = await getDb();
                const templates = await db.select().from(policyTemplates).orderBy(desc(policyTemplates.createdAt));

                const sanitize = (html: string, title: string) => {
                    let s = html || "";
                    // Strip fenced code blocks
                    s = s.replace(/```html([\s\S]*?)```/gi, "$1").replace(/```([\s\S]*?)```/gi, "$1");
                    // Extract <pre><code>...</code></pre>
                    s = s.replace(/<pre[\s\S]*?>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, "$1");
                    // Decode entities
                    s = s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
                    // Remove accidental [object Object] artifacts
                    s = s.replace(/\[object Object\]/g, "");
                    // Remove outer wrappers
                    const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    if (bodyMatch) s = bodyMatch[1];
                    // Drop style/script tags
                    s = s.replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
                    // Replace <section> with <div>
                    s = s.replace(/<section([^>]*)>/gi, "<div$1>").replace(/<\/section>/gi, "</div>");
                    // Ensure H1 title at top
                    try {
                        const container = globalThis.document ? document.createElement("div") : null;
                        if (container) {
                            container.innerHTML = s || "";
                            let h1 = container.querySelector("h1");
                            const t = (title || "Information Security Policy").trim();
                            if (!h1) {
                                h1 = document.createElement("h1");
                                h1.textContent = t;
                                container.insertBefore(h1, container.firstChild);
                            } else if (t && (h1.textContent || "").trim() !== t) {
                                h1.textContent = t;
                            }
                            s = container.innerHTML;
                        } else {
                            // Server-side fallback: prepend title if missing
                            if (!/\<h1[\s\S]*?\>/.test(s)) {
                                s = `<h1>${title || "Information Security Policy"}</h1>\n${s}`;
                            }
                        }
                    } catch {
                        if (!/\<h1[\s\S]*?\>/.test(s)) {
                            s = `<h1>${title || "Information Security Policy"}</h1>\n${s}`;
                        }
                    }
                    return s.trim();
                };

                const defaultSectionTitles = [
                    "Purpose",
                    "Scope",
                    "Roles and Responsibilities",
                    "Policy Statements",
                    "Procedures",
                    "Exceptions",
                    "Enforcement",
                    "Definitions",
                    "References",
                    "Revision History"
                ];

                const buildSkeleton = (title: string, sectionTitles?: string[]) => {
                    const t = (title || "Information Security Policy").trim();
                    const secs = (sectionTitles && sectionTitles.length > 0 ? sectionTitles : defaultSectionTitles);
                    const parts = secs.map(st => `<h2>${st}</h2>\n<p>[Content]</p>`);
                    return [`<h1>${t}</h1>`, ...parts].join("\n\n");
                };

                const results: Array<{ id: number; updated: boolean; changes: string[] }> = [];
                for (const tpl of templates) {
                    const changes: string[] = [];
                    let content = tpl.content || "";
                    const before = content;
                    const title = tpl.name || "Information Security Policy";
                    // If content empty, build skeleton using template sections or defaults
                    if (!content || content.trim().length === 0) {
                        const sectionTitles = Array.isArray(tpl.sections)
                            ? (tpl.sections as any[]).map(s => (typeof s === 'object' ? (s.title || 'Section') : String(s))).filter(Boolean)
                            : undefined;
                        content = buildSkeleton(title, sectionTitles);
                        changes.push("skeleton_built_for_empty_template");
                    }
                    const after = sanitize(content, title);
                    if (after !== before) {
                        changes.push("sanitized_html_and_title");
                    }

                    // Sections sanitation if present
                    let updatedSections = tpl.sections;
                    if (Array.isArray(updatedSections)) {
                        const newSections = updatedSections.map((s: any) => {
                            if (s && typeof s === 'object') {
                                const body = s.content || s.text || "";
                                const cleanBody = sanitize(body, title);
                                if (cleanBody !== body) changes.push(`section_${s.id || s.title}_sanitized`);
                                return { ...s, content: cleanBody };
                            }
                            return s;
                        });
                        updatedSections = newSections as any;
                    }

                    const updated = changes.length > 0;
                    results.push({ id: tpl.id, updated, changes });

                    if (updated && !input?.dryRun) {
                        await db.update(policyTemplates)
                            .set({
                                content: after,
                                sections: updatedSections
                            })
                            .where(eq(policyTemplates.id, tpl.id));
                    }
                }

                return {
                    templatesProcessed: templates.length,
                    templatesChanged: results.filter(r => r.updated).length,
                    dryRun: !!(input?.dryRun),
                    results
                };
            }),

        seedNIS2: adminProcedure
            .mutation(async () => {
                const dbConn = await getDb();
                const templates = [
                    {
                        templateId: "nis2-risk-management",
                        name: "NIS2 Information Security Risk Management Policy",
                        content: `<h1>Risk Management Policy</h1><p>This policy establishes the framework for identifying, assessing, and treating security risks in accordance with NIS2 Article 21(2)(a).</p><h2>1. Risk Assessment Methodology</h2><p>Risk assessments must be conducted at least annually or when significant changes occur...</p>`,
                        isPublic: true,
                        frameworks: JSON.stringify(["nis2"]),
                    },
                    {
                        templateId: "nis2-incident-handling",
                        name: "NIS2 Incident Handling & Response Policy",
                        content: `<h1>Incident Response Policy</h1><p>In alignment with NIS2 Article 21(2)(b), this policy defines how the organization detects and responds to security incidents.</p><h2>1. Classification</h2><p>Incidents are classified based on impact to essential services...</p>`,
                        isPublic: true,
                        frameworks: JSON.stringify(["nis2"]),
                    },
                    {
                        templateId: "nis2-supply-chain",
                        name: "NIS2 Supply Chain Security Policy",
                        content: `<h1>Supply Chain Security Policy</h1><p>Addressing NIS2 Article 21(2)(d), this policy governs security requirements for all direct suppliers and service providers.</p><h2>1. Vendor Assessment</h2><p>All Tier 1 suppliers must undergo a biennial security review...</p>`,
                        isPublic: true,
                        frameworks: JSON.stringify(["nis2"]),
                    },
                    {
                        templateId: "nis2-vulnerability-disclosure",
                        name: "NIS2 Vulnerability Handling & Disclosure Policy",
                        content: `<h1>Vulnerability Disclosure Policy</h1><p>Compliance with NIS2 Article 21(2)(e). Provides a coordinated framework for discovering and patching system flaws.</p><h2>1. Coordinated Disclosure</h2><p>We maintain a public security.txt file for reporting vulnerabilities...</p>`,
                        isPublic: true,
                        frameworks: JSON.stringify(["nis2"]),
                    }
                ];

                let inserted = 0;
                for (const tpl of templates) {
                    try {
                        const [existing] = await dbConn.select().from(policyTemplates)
                            .where(eq(policyTemplates.templateId, tpl.templateId));

                        if (!existing) {
                            await dbConn.insert(policyTemplates).values({
                                ...tpl,
                                sections: [],
                                tailoringQuestions: []
                            });
                            inserted++;
                        }
                    } catch (e) {
                        console.error("Error seeding NIS2 template", e);
                    }
                }
                return { inserted };
            }),
    });
};

