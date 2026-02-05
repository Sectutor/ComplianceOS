/**
 * AI Advisor Service
 * Orchestrates RAG retrieval + LLM generation for compliance guidance
 */

import { llmService } from '../llm/service';
import { retrieveControls, retrieveCatalogTech, retrievePolicies, retrieveEvidence, retrieveRisks, retrieveClientControls, retrieveVendorInfo, RetrievalResult } from './retrieval';
import type {
    SuggestTechnologiesRequest,
    SuggestTechnologiesResponse,
    TechnologySuggestion,
    ImplementationPlanRequest,
    ImplementationPlanResponse,
    ExplainMappingRequest,
    ExplainMappingResponse,
    AskQuestionRequest,
    AskQuestionResponse,
    Citation,
    PromptContext,
    VendorMitigationPlanRequest,
    VendorMitigationPlanResponse,
    MitigationStep,
    AnalyzeRiskRequest,
    AnalyzeRiskResponse,
    GenerateRiskMitigationPlanRequest,
    GenerateRiskMitigationPlanResponse
} from './types';
import { getDb } from '../../db';
import {
    controls, clientControls, regulationMappings, clientPolicies, vendors,
    vendorScans, vendorCveMatches, vendorBreaches, evidence,
    employeeTaskAssignments, employees, users, projectTasks,
    bcPlans
} from '../../schema';
import { eq, and, desc } from 'drizzle-orm';
import { IndexingService } from './indexing';

/**
 * System prompt for the advisor
 */
function getSystemPrompt(context: Partial<PromptContext>): string {
    return `You are a senior compliance and security advisor for ${context.clientName || 'a company'}.

Your role is to:
1. Provide direct, actionable answers
2. Cite sources using [1], [2] notation when context is provided
3. Consider the client's industry: ${context.industry || 'general'}
4. Tailor suggestions to their framework: ${context.framework || 'best practices'}

Response guidelines:
- Answer the question directly without section headers like "Summary" or "Recommendations"
- Keep answers concise and to the point
- Only include source citations if you have actual context to cite
- Focus on practical, actionable information`;
}

/**
 * Suggest technologies for implementing a control
 */
export async function suggestTechnologies(
    request: SuggestTechnologiesRequest
): Promise<SuggestTechnologiesResponse> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get control details
    const [control] = await db
        .select()
        .from(controls)
        .where(eq(controls.id, request.controlId))
        .limit(1);

    if (!control) throw new Error('Control not found');

    // Get client-specific control status if available
    const [clientControl] = await db
        .select()
        .from(clientControls)
        .where(
            and(
                eq(clientControls.clientId, request.clientId),
                eq(clientControls.controlId, request.controlId)
            )
        )
        .limit(1);

    // Retrieve relevant catalog technologies
    const catalogResults = await retrieveCatalogTech(
        control.controlId || '',
        control.framework || '',
        request.vendorPreference || '',
        5
    );

    // Build context for LLM
    const contextSummary = catalogResults
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join('\n\n');

    const userPrompt = `Control: ${control.controlId} - ${control.name}
Framework: ${control.framework}
Current Status: ${clientControl?.status || 'not_implemented'}
${request.vendorPreference ? `Vendor Preference: ${request.vendorPreference}` : ''}
${request.budgetConstraint ? `Budget: ${request.budgetConstraint}` : ''}

Retrieved Technologies:
${contextSummary}

Question: What are the best technology solutions to implement this control? Provide 3-5 ranked options with:
- Technology name and vendor
- Brief description
- Pros (2-3 points)
- Cons (2-3 points)
- Implementation effort (low/medium/high)
- Confidence score (0-1)

Cite sources using [1], [2], etc. for each recommendation.`;

    // Generate response
    const response = await llmService.generate({
        systemPrompt: getSystemPrompt({
            clientName: 'the client', // Would fetch from DB
            framework: control.framework || undefined,
        }),
        userPrompt,
        temperature: 0.3, // Lower for more factual responses
        feature: 'tech_suggestion'
    });

    // Parse response into structured format
    const suggestions = parseTechnologySuggestions(response.text, catalogResults);

    return {
        suggestions,
        contextSummary: `Retrieved ${catalogResults.length} technologies from catalog`,
    };
}

/**
 * Generate implementation plan for a control
 */
export async function generateImplementationPlan(
    request: ImplementationPlanRequest
): Promise<ImplementationPlanResponse> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get control details
    const [control] = await db
        .select()
        .from(controls)
        .where(eq(controls.id, request.controlId))
        .limit(1);

    if (!control) throw new Error('Control not found');

    // Get technologies if a specific one is selected
    let selectedTech = '';
    if (request.selectedTech) {
        const techResults = await retrieveCatalogTech(
            control.controlId || '',
            control.framework || '',
            request.selectedTech,
            1
        );
        if (techResults.length > 0) {
            selectedTech = techResults[0].content;
        }
    }

    const userPrompt = `Control: ${control.controlId} - ${control.name}
Description: ${control.description || ''}
${selectedTech ? `Selected Technology:\n${selectedTech}` : ''}

Create a detailed implementation plan with:
1. Prerequisites (what needs to be in place first)
2. Step-by-step implementation (5-10 steps)
3. Estimated duration for each step
4. Recommended owner/role for each step
5. Overall timeline estimate

Format each step as:
Step N: [Title]
Description: [What to do]
Owner: [Role, e.g., "Security Engineer", "IT Admin"]
Duration: [e.g., "2-3 days", "1 week"]

Cite any sources used.`;

    const response = await llmService.generate({
        systemPrompt: getSystemPrompt({
            framework: control.framework || undefined,
        }),
        userPrompt,
        temperature: 0.4,
        feature: 'implementation_plan'
    });

    // Parse response
    const plan = parseImplementationPlan(response.text);

    return plan;
}

/**
 * Explain regulation-to-control mapping and coverage
 */
export async function explainMapping(
    request: ExplainMappingRequest
): Promise<ExplainMappingResponse> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get regulation mappings for this article
    const mappings = await db
        .select()
        .from(regulationMappings)
        .where(
            and(
                eq(regulationMappings.clientId, request.clientId),
                eq(regulationMappings.regulationId, request.regulationId),
                eq(regulationMappings.articleId, request.articleId)
            )
        );

    // TODO: Retrieve mapped policies and evidence
    const policies = await db
        .select()
        .from(clientPolicies)
        .where(eq(clientPolicies.clientId, request.clientId))
        .limit(5);

    const contextSummary = `
Regulation: ${request.regulationId}
Article: ${request.articleId}
Mapped Items: ${mappings.length}
Policies Available: ${policies.length}
`;

    const userPrompt = `${contextSummary}

Explain:
1. What this regulation article requires
2. How the mapped controls/policies address it
3. Any coverage gaps or missing controls
4. Recommendations to improve coverage

Be specific and cite sources.`;

    console.log('[Advisor] Generating answer with LLM...');
    let response;
    try {
        response = await llmService.generate({
            systemPrompt: getSystemPrompt({}),
            userPrompt,
            temperature: 0.3,
            feature: 'explain_mapping'
        });
        console.log('[Advisor] LLM generation successful');
    } catch (error: any) {
        console.error('[Advisor] LLM generation failed:', error);
        throw new Error(`LLM generation failed: ${error.message}`);
    }

    return {
        explanation: response.text,
        mappedControls: [], // Would populate from mappings
        evidenceLinks: [],
        gaps: [],
        sources: [],
    };
}

/**
 * Answer general compliance questions with context
 */
export async function askQuestion(
    request: AskQuestionRequest
): Promise<AskQuestionResponse> {
    console.log(`[Advisor] Asking question: "${request.question}" for client ${request.clientId}`);

    try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Build conversation history for context (Available for all handlers)
        let conversationContext = '';
        if (request.conversationHistory && request.conversationHistory.length > 0) {
            // Include last 6 messages (3 turns) for context
            const recentHistory = request.conversationHistory.slice(-6);
            conversationContext = '\n\n--- CONVERSATION HISTORY ---\n' +
                recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}`).join('\n') +
                '\n---\n';
        }

        // === AGGREGATE QUERY DETECTION ===
        // Detect count/list questions that need database queries, not RAG
        // More specific patterns to avoid false matches on "what is the X policy" (content) vs "what policies" (list)
        const countPoliciesPattern = /\b(how many|count|number of|list)\s+(the\s+)?(policies|policy)\b|\bwhat\s+(are\s+)?(our|the|all)\s+(policies|policy)\b|\bwhat\s+policies\b/i;
        const countEvidencePattern = /\b(how many|count|number of|list)\s+(the\s+)?(evidence|documents?|files?)\b|\bwhat\s+(are\s+)?(our|the|all)\s+(evidence|documents?|files?)\b/i;

        if (countPoliciesPattern.test(request.question) && request.clientId > 0) {
            console.log('[Advisor] Detected policy count/list question - querying database directly');
            const policies = await db.select({
                id: clientPolicies.id,
                name: clientPolicies.name
            }).from(clientPolicies).where(eq(clientPolicies.clientId, request.clientId));

            if (policies.length === 0) {
                return {
                    answer: `**You have 0 policies** for this client.\n\nWould you like to create one? Go to the Policies section to add a new policy.`,
                    sources: []
                };
            }

            const policyList = policies.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
            return {
                answer: `**You have ${policies.length} ${policies.length === 1 ? 'policy' : 'policies'}:**\n\n${policyList}`,
                sources: policies.map(p => ({ type: 'policy' as const, id: String(p.id), title: p.name || 'Untitled' }))
            };
        }

        if (countEvidencePattern.test(request.question) && request.clientId > 0) {
            console.log('[Advisor] Detected evidence count/list question - querying database directly');
            const evidenceItems = await db.select({
                id: evidence.id,
                filename: evidence.filename
            }).from(evidence).where(eq(evidence.clientId, request.clientId));

            if (evidenceItems.length === 0) {
                return {
                    answer: `**You have 0 evidence documents** for this client.\n\nUpload evidence files in the Evidence section.`,
                    sources: []
                };
            }

            const evidenceList = evidenceItems.slice(0, 10).map((e: any, i: number) => `${i + 1}. ${e.filename || 'Unnamed file'}`).join('\n');
            const moreText = evidenceItems.length > 10 ? `\n\n...and ${evidenceItems.length - 10} more.` : '';
            return {
                answer: `**You have ${evidenceItems.length} evidence ${evidenceItems.length === 1 ? 'document' : 'documents'}:**\n\n${evidenceList}${moreText}`,
                sources: evidenceItems.slice(0, 10).map((e: any) => ({ type: 'evidence' as const, id: String(e.id), title: e.filename || 'Evidence' }))
            };
        }

        // Vendor count/list pattern
        const countVendorsPattern = /\b(how many|count|number of|list|what).*(vendors?|suppliers?|third.?part(?:y|ies))\b/i;
        if (countVendorsPattern.test(request.question) && request.clientId > 0) {
            console.log('[Advisor] Detected vendor count/list question - querying database directly');
            const vendorItems = await db.select({
                id: vendors.id,
                name: vendors.name,
                category: vendors.category,
                criticality: vendors.criticality
            }).from(vendors).where(eq(vendors.clientId, request.clientId));

            if (vendorItems.length === 0) {
                return {
                    answer: `**You have 0 vendors** for this client.\n\nAdd vendors in the Vendor Management section.`,
                    sources: []
                };
            }

            const vendorList = vendorItems.map((v: any, i: number) =>
                `${i + 1}. **${v.name}** (${v.category || 'General'}) - ${v.criticality || 'Unknown'} criticality`
            ).join('\n');
            return {
                answer: `**You have ${vendorItems.length} ${vendorItems.length === 1 ? 'vendor' : 'vendors'}:**\n\n${vendorList}`,
                sources: vendorItems.map((v: any) => ({ type: 'vendor' as const, id: String(v.id), title: v.name || 'Vendor' }))
            };
        }

        // === POLICY SUMMARY/HIGHLIGHT DETECTION ===
        // Detect questions asking for policy summaries, highlights, or content
        const policySummaryPattern = /\b(highlights?|summarize?|summary|overview|explain|describe|tell me about).*(policy|policies|the policy)\b/i;
        const specificPolicyPattern = /\b(highlights?|summarize?|summary|overview|explain|describe|tell me about).*policy\b/i;

        if ((policySummaryPattern.test(request.question) || specificPolicyPattern.test(request.question)) && request.clientId > 0) {
            console.log('[Advisor] Detected policy summary/highlight question - fetching policy content');
            const policies = await db.select({
                id: clientPolicies.id,
                name: clientPolicies.name,
                content: clientPolicies.content
            }).from(clientPolicies).where(eq(clientPolicies.clientId, request.clientId));

            if (policies.length === 0) {
                return {
                    answer: `No policies found for this client. Create a policy in the Policies section first.`,
                    sources: []
                };
            }

            // If only one policy, summarize it
            // If multiple, ask which one or provide list
            if (policies.length === 1) {
                const policy = policies[0];
                const contentPreview = policy.content?.substring(0, 3000) || 'No content available';

                const response = await llmService.generate({
                    systemPrompt: getSystemPrompt({}),
                    userPrompt: `The user asked: "${request.question}"

Here is the policy content:
---
Policy Name: ${policy.name}
Content: ${contentPreview}
---

Provide the key highlights of this policy in a concise bullet-point format.`,
                    temperature: 0.3,
                    feature: 'general_advisor'
                });

                return {
                    answer: response.text,
                    sources: [{ type: 'policy' as const, id: String(policy.id), title: policy.name || 'Policy' }]
                };
            } else {
                // Multiple policies - ask which one or provide brief overview of all
                const policyList = policies.map((p, i) => `${i + 1}. **${p.name}**`).join('\n');
                return {
                    answer: `You have ${policies.length} policies. Which one would you like me to summarize?\n\n${policyList}\n\nAsk about a specific policy by name, e.g., "summarize the Change Management Policy"`,
                    sources: policies.map(p => ({ type: 'policy' as const, id: String(p.id), title: p.name || 'Policy' }))
                };
            }
        }

        // === GAP ANALYSIS REMEDIATION ===
        if (request.context?.type === 'gapanalysis' && request.context.data) {
            console.log('[Advisor] Handling Gap Analysis Remediation request');
            const data = request.context.data; // { controlName, description, framework, currentStatus, notes }

            const userPrompt = `I need remediation advice for a compliance gap.
            
Control: ${data.controlName} (${request.context.id})
Framework: ${data.framework}
Description: ${data.description}
Current Status: ${data.currentStatus || 'Not Implemented'}
User Notes: ${data.notes || 'None'}

Please provide a specific, actionable remediation plan to close this gap.
Include:
1. What needs to be done (Process/Technology)
2. Common pitfalls to avoid
3. Suggested evidence to demonstrate compliance`;

            const response = await llmService.generate({
                systemPrompt: getSystemPrompt({ framework: data.framework }),
                userPrompt,
                temperature: 0.4,
                feature: 'general_advisor'
            });

            return {
                answer: response.text,
                sources: []
            };
        }

        // === PAGE CONTEXT HANDLER ===
        // Handle generic page context provided by the frontend
        if (request.context?.type === 'page' && request.context.data) {
            console.log(`[Advisor] Handling Page Context request for ${request.context.data.pageTitle}`);
            const data = request.context.data; // { pageTitle, description, keyTopics, dataSummary, ... }

            const contextSummary = `
Current Page: ${data.pageTitle}
Description: ${data.description}
Key Topics: ${Array.isArray(data.keyTopics) ? data.keyTopics.join(', ') : 'General'}
${data.dataSummary ? `Page Data Summary: ${JSON.stringify(data.dataSummary, null, 2)}` : ''}
`;

            const userPrompt = `${conversationContext}
${contextSummary}

User Question: ${request.question}

Instructions:
1. Provide assistance specific to the "${data.pageTitle}" page.
2. Use the provided description and topics to understand user intent.
3. If the user asks "what can I do here", explain the purpose of this page.
4. If relevant, suggest next steps based on the page function.`;

            const response = await llmService.generate({
                systemPrompt: getSystemPrompt({ clientName: 'the organization' }),
                userPrompt,
                temperature: 0.3,
                feature: 'general_advisor'
            });

            return {
                answer: response.text,
                sources: []
            };
        }

        // === RAG RETRIEVAL ===
        // Retrieve relevant context based on question - search ALL content types
        const [
            relevantControls,
            relevantPolicies,
            relevantEvidence,
            relevantRisks,
            relevantClientControls,
            relevantVendors,
            relevantKnowledgeBase
        ] = await Promise.all([
            retrieveControls(request.question, undefined, 3),
            retrievePolicies(request.question, request.clientId, 3),
            retrieveEvidence(request.question, request.clientId, 2),
            retrieveRisks(request.question, request.clientId, 2),
            retrieveClientControls(request.question, request.clientId, 3),
            retrieveVendorInfo(request.question, request.clientId, 3),
            retrieveKnowledgeBase(request.question, request.clientId, 5) // High priority for explicit Q&A
        ]);

        console.log(`[Advisor] Retrieved: ${relevantControls.length} global controls, ${relevantPolicies.length} policies, ${relevantEvidence.length} evidence, ${relevantRisks.length} risks, ${relevantClientControls.length} client controls, ${relevantVendors.length} vendors, ${relevantKnowledgeBase.length} KB entries`);

        // Detect if this is a client-specific question (about "our", "we have", etc.)
        const clientSpecificPatterns = /\b(our|we have|do we|we need|my|our company|this client|this organization)\b/i;
        const isClientSpecificQuestion = clientSpecificPatterns.test(request.question);
        const hasClientData = relevantPolicies.length > 0 || relevantEvidence.length > 0 || relevantRisks.length > 0 || relevantClientControls.length > 0 || relevantVendors.length > 0 || relevantKnowledgeBase.length > 0;

        // If it's a client-specific question but we have no client data, return a clear "no data" response
        if (isClientSpecificQuestion && !hasClientData && request.clientId > 0) {
            console.log('[Advisor] Client-specific question with no data - returning accurate response');
            return {
                answer: `I searched your organization's policies and evidence but couldn't find any relevant information about "${request.question.substring(0, 50)}...". 

This could mean:
- No policies or evidence have been uploaded yet for this topic
- The content hasn't been indexed for AI search
- The specific information isn't documented

**Next steps:**
- Check if relevant policies exist in the Policies section
- Upload any related evidence documents
- Create a new policy if one is needed`,
                sources: []
            };
        }

        const contextParts = [];
        if (relevantControls.length) {
            contextParts.push("--- RELEVANT FRAMEWORK CONTROLS ---");
            contextParts.push(relevantControls.map((r: RetrievalResult) => `[Control ${r.metadata?.controlId || 'N/A'}]: ${r.content}`).join('\n'));
        }
        if (relevantClientControls.length) {
            contextParts.push("--- CLIENT CONTROL IMPLEMENTATIONS ---");
            contextParts.push(relevantClientControls.map((r: RetrievalResult) => `[Control: ${r.metadata?.name || 'Control'} - ${r.metadata?.status || 'Unknown'}]: ${r.content}`).join('\n'));
        }
        if (relevantPolicies.length) {
            contextParts.push("--- RELEVANT POLICIES ---");
            contextParts.push(relevantPolicies.map((r: RetrievalResult) => `[Policy: ${r.metadata?.title || 'Untitled'}]: ${r.content}`).join('\n'));
        }
        if (relevantEvidence.length) {
            contextParts.push("--- RELEVANT EVIDENCE ---");
            contextParts.push(relevantEvidence.map((r: RetrievalResult) => `[Evidence: ${r.metadata?.filename || 'File'}]: ${r.content}`).join('\n'));
        }
        if (relevantRisks.length) {
            contextParts.push("--- RELEVANT RISKS ---");
            contextParts.push(relevantRisks.map((r: RetrievalResult) => `[Risk: ${r.metadata?.title || 'Risk'}]: ${r.content}`).join('\n'));
        }
        if (relevantKnowledgeBase.length) {
            contextParts.push("--- KNOWLEDGE BASE (PREVIOUSLY ANSWERED QUESTIONS) ---");
            contextParts.push(relevantKnowledgeBase.map((r: RetrievalResult) => `[Q&A: ${r.metadata?.question || 'Question'}]: \nQuestion: ${r.metadata?.question}\nAnswer: ${r.metadata?.answer}`).join('\n\n'));
        }
        if (relevantVendors.length) {
            contextParts.push("--- RELEVANT VENDORS ---");
            contextParts.push(relevantVendors.map((r: RetrievalResult) => `[Vendor: ${r.metadata?.name || 'Vendor'}]: ${r.content}`).join('\n'));
        }

        const contextSummary = contextParts.join('\n\n');

        // Build conversation history for context
        // (Moved to top of function)

        // Adjust prompt based on whether we have context
        let userPrompt: string;
        if (contextSummary.trim().length === 0) {
            // No context available - ask for general knowledge but be honest about it
            userPrompt = `${conversationContext}Current Question: ${request.question}

Note: No specific organizational data was found for this query. Please provide a general compliance/security answer based on industry best practices. Be clear that this is general guidance, not based on the organization's actual policies or evidence. If this appears to be a follow-up question, use the conversation history to understand the context.`;
        } else {
            // We have context - use it
            userPrompt = `${conversationContext}Current Question: ${request.question}

Relevant Context from this organization's data:
${contextSummary}

IMPORTANT: Base your answer ONLY on the context provided above. Cite sources using [1], [2], etc. If the context doesn't fully answer the question, say so clearly. If this appears to be a follow-up question, use the conversation history to understand what was previously discussed.`;
        }

        console.log('[Advisor] Generating answer with LLM...');
        const response = await llmService.generate({
            systemPrompt: getSystemPrompt({}),
            userPrompt,
            temperature: 0.3, // Lower temperature for more factual answers
            feature: 'general_advisor'
        });
        console.log('[Advisor] LLM generation successful');

        // Calculate confidence from max vector similarity
        const allRetrieved = [
            ...relevantControls,
            ...relevantPolicies,
            ...relevantEvidence,
            ...relevantRisks,
            ...relevantClientControls,
            ...relevantVendors,
            ...relevantKnowledgeBase
        ];

        let confidence = 0.1;
        if (allRetrieved.length > 0) {
            // Use max score as confidence indicator
            confidence = Math.max(...allRetrieved.map(r => r.score || 0));
        }

        return {
            answer: response.text,
            sources: [
                ...relevantControls.map((r: RetrievalResult) => ({ type: 'control' as const, id: r.docId, title: r.metadata?.name || r.docId })),
                ...relevantPolicies.map((r: RetrievalResult) => ({ type: 'policy' as const, id: r.docId, title: r.metadata?.title || 'Policy' })),
                ...relevantEvidence.map((r: RetrievalResult) => ({ type: 'evidence' as const, id: r.docId, title: r.metadata?.filename || 'Evidence' })),
                ...relevantKnowledgeBase.map((r: RetrievalResult) => ({ type: 'knowledge_base' as const, id: r.docId, title: r.metadata?.question || 'Q&A' }))
            ],
            confidence
        };
    } catch (error: any) {
        console.error('[Advisor] askQuestion failed:', error);
        throw error;
    }
}

/**
 * Generate vendor risk mitigation plan
 */
export async function generateVendorMitigationPlan(
    request: VendorMitigationPlanRequest
): Promise<VendorMitigationPlanResponse> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // 1. Fetch Vendor
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, request.vendorId));
    if (!vendor) throw new Error('Vendor not found');

    // 2. Fetch Latest Scan & CVEs
    const [scan] = await db.select().from(vendorScans)
        .where(eq(vendorScans.vendorId, request.vendorId))
        .orderBy(desc(vendorScans.scanDate))
        .limit(1);

    const cves = await db.select().from(vendorCveMatches)
        .where(eq(vendorCveMatches.vendorId, request.vendorId))
        .orderBy(desc(vendorCveMatches.matchScore))
        .limit(10);

    const breaches = await db.select().from(vendorBreaches)
        .where(eq(vendorBreaches.vendorId, request.vendorId));

    // 3. Prompt Construction
    const cveSummary = cves.map((c: any) => `- ${c.cveId} (Score: ${c.matchScore}): ${c.status}`).join('\n');
    const breachSummary = breaches.map((b: any) => `- ${b.title} (${b.breachDate}): ${b.severity}`).join('\n');

    const userPrompt = `Vendor: ${vendor.name} (${vendor.category})
Risk Score: ${scan?.riskScore || 'N/A'}
Criticality: ${vendor.criticality}

Identified Vulnerabilities (Top 10):
${cveSummary || 'None identified'}

Known Breaches:
${breachSummary || 'None found'}

Generate a comprehensive risk mitigation plan for this vendor.
Structure the response as a JSON-like list of steps.
For the CVEs, suggest specific patching or isolation strategies.
For breaches, suggest monitoring and legal/contractual safeguards.
Also provide an estimated timeline.

Output Format:
Steps:
1. [Title] - [Priority] - [Effort] - [Owner]
   Description: ...
   
Analysis: [Summary of the risk landscape]`;

    // 4. Generate
    const response = await llmService.generate({
        systemPrompt: getSystemPrompt({ clientName: 'the organization', industry: 'General' }),
        userPrompt,
        temperature: 0.4,
        feature: 'vendor_mitigation'
    });

    // 5. Parse
    return parseVendorMitigationPlan(response.text, vendor.name, scan?.riskScore || 0, cveSummary);
}

/**
 * Generate or enhance Business Continuity Plan content
 */
export async function generateBcpContent(
    request: import('./types').GenerateBcpContentRequest
): Promise<import('./types').GenerateBcpContentResponse> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Fetch Plan Details for Context
    const [plan] = await db.select().from(bcPlans).where(eq(bcPlans.id, request.planId));
    if (!plan) throw new Error('Plan not found');

    // Build Prompt based on Section
    let specificInstructions = "";
    switch (request.sectionKey) {
        case 'intro':
            specificInstructions = "Draft a professional 'Introduction' section for a Business Continuity Plan. Focus on the objective of minimizing operational disruption and ensuring personnel safety.";
            break;
        case 'scope':
            specificInstructions = "Draft a 'Scope' section defining what this plan covers (critical departments, systems) and what is excluded.";
            break;
        case 'activation':
            specificInstructions = "Draft 'Activation Criteria' for the plan. Define specific triggers (e.g., system outage > 4 hours, physical site unavailability) that warrant invoking this continuity plan.";
            break;
        case 'messages': // Using 'messages' as key for communication templates
            specificInstructions = "Draft a communication template to employees regarding a business disruption. Keep it calm, clear, and directive.";
            break;
        default:
            specificInstructions = `Draft content for the '${request.sectionKey}' section of the Business Continuity Plan.`;
    }

    const modeInstructions = request.mode === 'improve'
        ? "Improve the following existing content below to be more professional, concise, and actionable. Do not change the underlying meaning."
        : "Draft new content from scratch based on best practices (ISO 22301).";

    const userPrompt = `Plan Title: ${plan.title}
Department/Scope: ${(plan.content as any)?.metadata?.department || "General Organization"}

Task: ${specificInstructions}
Mode: ${modeInstructions}

${request.context ? `Existing Content / Context:
${request.context}` : ''}

Output should be in clear Markdown format.`;

    const response = await llmService.generate({
        systemPrompt: getSystemPrompt({ clientName: 'the organization', industry: 'General', framework: 'ISO 22301' }),
        userPrompt,
        temperature: 0.5,
        feature: 'bcp_generation'
    });

    return {
        content: response.text
    };
}

/**
 * Re-index knowledge base (Policies, Evidence, Controls, Risks, Vendors)
 */
export async function reindexKnowledgeBase(
    clientId: number | undefined,
    type: 'all' | 'policies' | 'evidence' | 'controls' | 'risks' | 'vendors' | 'assignments' = 'all'
) {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    let stats = {
        policies: 0,
        evidence: 0,
        controls: 0,
        risks: 0,
        vendors: 0,
        errors: 0
    };

    // Index Policies
    if (type === 'all' || type === 'policies') {
        const policies = clientId
            ? await db.query.clientPolicies.findMany({ where: eq(clientPolicies.clientId, clientId) })
            : await db.query.clientPolicies.findMany();

        for (const p of policies) {
            if (!p.content) continue;
            try {
                await IndexingService.indexDocument(
                    p.clientId,
                    'policy',
                    p.id.toString(),
                    {
                        title: p.name,
                        content: p.content,
                        updatedAt: p.updatedAt?.toISOString() || new Date().toISOString()
                    },
                    {
                        title: p.name,
                        url: `/clients/${p.clientId}/policies/${p.id}`
                    }
                );
                stats.policies++;
            } catch (err) {
                console.error(`Failed to index policy ${p.id}`, err);
                stats.errors++;
            }
        }
    }

    // Index Evidence
    if (type === 'all' || type === 'evidence') {
        try {
            const evidenceItems = clientId
                ? await db.select().from(evidence).where(eq(evidence.clientId, clientId))
                : await db.select().from(evidence);

            for (const e of evidenceItems) {
                const content = (e as any).summary || (e as any).description || (e as any).extractedText;
                if (!content) continue;

                try {
                    await IndexingService.indexDocument(
                        e.clientId,
                        'evidence',
                        e.id.toString(),
                        content,
                        {
                            filename: (e as any).filename,
                            url: (e as any).url
                        }
                    );
                    stats.evidence++;
                } catch (err) {
                    console.error(`Failed to index evidence ${e.id}`, err);
                    stats.errors++;
                }
            }
        } catch (e) {
            console.warn("Evidence indexing skipped (table or fields mismatch)", e);
        }
    }

    // Index Controls (client-specific implementation details)
    if (type === 'all' || type === 'controls') {
        try {
            const controlsList = clientId
                ? await db.select({
                    cc: clientControls,
                    c: controls
                }).from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id))
                    .where(eq(clientControls.clientId, clientId))
                : await db.select({
                    cc: clientControls,
                    c: controls
                }).from(clientControls)
                    .innerJoin(controls, eq(clientControls.controlId, controls.id));

            for (const { cc, c } of controlsList) {
                const controlContent = `Control: ${c.name}\nCode: ${c.code || 'N/A'}\nStatus: ${cc.status}\nImplementation Notes: ${cc.implementationNotes || 'No notes'}\nDescription: ${c.description || ''}`;

                try {
                    await IndexingService.indexDocument(
                        cc.clientId,
                        'control',
                        cc.id.toString(),
                        controlContent,
                        {
                            controlId: c.id,
                            controlCode: c.code,
                            name: c.name,
                            status: cc.status,
                            url: `/clients/${cc.clientId}/controls/${c.id}`
                        }
                    );
                    stats.controls++;
                } catch (err) {
                    console.error(`Failed to index control ${cc.id}`, err);
                    stats.errors++;
                }
            }
        } catch (e) {
            console.warn("Controls indexing skipped", e);
        }
    }

    // Index Risks
    if (type === 'all' || type === 'risks') {
        try {
            const risksList = clientId
                ? await db.select().from(risks).where(eq(risks.clientId, clientId))
                : await db.select().from(risks);

            for (const r of risksList) {
                const riskContent = `Risk: ${r.title}\nDescription: ${r.description || ''}\nCategory: ${r.category || 'General'}\nLikelihood: ${r.likelihood || 'Unknown'}\nImpact: ${r.impact || 'Unknown'}\nMitigation: ${(r as any).mitigation || (r as any).treatment || 'None specified'}`;

                try {
                    await IndexingService.indexDocument(
                        r.clientId,
                        'risk',
                        r.id.toString(),
                        riskContent,
                        {
                            title: r.title,
                            category: r.category,
                            url: `/clients/${r.clientId}/risks/${r.id}`
                        }
                    );
                    stats.risks++;
                } catch (err) {
                    console.error(`Failed to index risk ${r.id}`, err);
                    stats.errors++;
                }
            }
        } catch (e) {
            console.warn("Risks indexing skipped", e);
        }
    }

    // Index Vendors
    if (type === 'all' || type === 'vendors') {
        try {
            const vendorsList = clientId
                ? await db.select().from(vendors).where(eq(vendors.clientId, clientId))
                : await db.select().from(vendors);

            for (const v of vendorsList) {
                const vendorContent = `Vendor: ${v.name}\nCategory: ${v.category || 'General'}\nCriticality: ${v.criticality || 'Unknown'}\nStatus: ${v.status || 'Active'}\nDescription: ${(v as any).description || (v as any).notes || ''}`;

                try {
                    await IndexingService.indexDocument(
                        v.clientId,
                        'vendor',
                        v.id.toString(),
                        vendorContent,
                        {
                            name: v.name,
                            category: v.category,
                            criticality: v.criticality,
                            url: `/clients/${v.clientId}/vendors/${v.id}`
                        }
                    );
                    stats.vendors++;
                } catch (err) {
                    console.error(`Failed to index vendor ${v.id}`, err);
                    stats.errors++;
                }
            }
        } catch (e) {
            console.warn("Vendors indexing skipped", e);
        }
    }

    // Index Assignments (RACI)
    if (type === 'all' || type === 'assignments') {
        try {
            // Fetch assignments with employee details
            const assignments = clientId
                ? await db.select({
                    a: employeeTaskAssignments,
                    e: employees,
                    u: users
                }).from(employeeTaskAssignments)
                    .leftJoin(employees, eq(employeeTaskAssignments.employeeId, employees.id))
                    .leftJoin(users, eq(employees.userId, users.id))
                    .where(eq(employeeTaskAssignments.clientId, clientId))
                : await db.select({
                    a: employeeTaskAssignments,
                    e: employees,
                    u: users
                }).from(employeeTaskAssignments)
                    .leftJoin(employees, eq(employeeTaskAssignments.employeeId, employees.id))
                    .leftJoin(users, eq(employees.userId, users.id));

            for (const { a, e, u } of assignments) {
                const assigneeName = u?.name || e?.email || 'Unknown';
                const roleDescription = a.raciRole === 'responsible' ? 'Responsible for executing' :
                    a.raciRole === 'accountable' ? 'Accountable owner of' :
                        a.raciRole === 'consulted' ? 'Consulted expert for' :
                            'Informed stakeholder for';

                // Construct meaningful content based on task type
                let entityName = `Task ${a.taskId}`;
                let context = '';

                // Ideally fetching the entity name here would be best, but for speed we'll use generic description
                // In a real optimized system we'd join with the entity tables based on taskType

                const content = `Assignment: ${assigneeName} is ${a.raciRole.toUpperCase()} for ${a.taskType} #${a.taskId}.\nRole: ${roleDescription}\nNotes: ${a.notes || ''}`;

                try {
                    await IndexingService.indexDocument(
                        a.clientId,
                        'assignment',
                        a.id.toString(),
                        content,
                        {
                            assignee: assigneeName,
                            role: a.raciRole,
                            taskType: a.taskType,
                            taskId: a.taskId,
                            url: `/clients/${a.clientId}/assignments`
                        }
                    );
                    stats.assignments++;
                } catch (err) {
                    console.error(`Failed to index assignment ${a.id}`, err);
                    stats.errors++;
                }
            }
        } catch (e) {
            console.warn("Assignment indexing skipped", e);
        }
    }

    console.log(`[ReindexKnowledgeBase] Completed: ${JSON.stringify(stats)}`);
    return stats;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Analyze risk scenario and suggest scores
 */
export async function analyzeRisk(
    request: AnalyzeRiskRequest
): Promise<AnalyzeRiskResponse> {
    const userPrompt = `
Risk Scenario Analysis:
Threat: "${request.threat}"
Vulnerability: "${request.vulnerability}"
Affected Assets: ${request.assets.join(', ')}

Based on this context, estimate:
1. Likelihood (Rare, Unlikely, Possible, Likely, Almost Certain)
2. Impact (Low, Medium, High, Very High)
3. Inherent Risk Level (Low, Medium, High, Very High)

Provide a short reasoning (max 2 sentences) for why you chose these levels.

Output as JSON:
{
  "likelihood": "String",
  "impact": "String",
  "inherentRisk": "String",
  "reasoning": "String"
}`;

    const response = await llmService.generate({
        systemPrompt: getSystemPrompt({}),
        userPrompt,
        temperature: 0.2, // Low temp for consistent scoring
        jsonMode: true,
        feature: 'risk_analysis'
    });

    try {
        return JSON.parse(response.text) as AnalyzeRiskResponse;
    } catch (e) {
        // Fallback if JSON parse fails
        return {
            likelihood: 'Possible',
            impact: 'Medium',
            inherentRisk: 'Medium',
            reasoning: 'AI analysis failed to parse. Defaulting to medium.'
        };
    }
}

/**
 * Generate a detailed risk mitigation plan
 */
export async function generateRiskMitigationPlan(
    request: GenerateRiskMitigationPlanRequest
): Promise<GenerateRiskMitigationPlanResponse> {
    const systemPrompt = `You are a senior cybersecurity architect and risk manager.
Your task is to generate a comprehensive, actionable mitigation plan for a specific risk.
The output must be formatted as HTML content suitable for a rich text editor (using <h3>, <p>, <ul>, <li>, <strong> tags).
Do NOT include <html>, <body>, or markdown code blocks (like \`\`\`html). Just the raw HTML content.
Focus on:
1. Technical controls (what to implement)
2. Process controls (policies, reviews)
3. Verification steps (how to test)
`;

    const userPrompt = `
Risk: ${request.riskTitle}
Description: ${request.riskDescription}
Context: ${request.riskContext || 'General System'}
${request.currentMitigations?.length ? `Current Planned Mitigations: ${request.currentMitigations.join(', ')}` : ''}

Please provide a detailed mitigation plan.
`;

    const response = await llmService.generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7
    });

    // Strip markdown code blocks if present
    const cleanResponse = (response || '')
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');

    return {
        mitigationPlan: cleanResponse || '<p>Failed to generate plan.</p>'
    };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse LLM response into structured technology suggestions
 */
function parseTechnologySuggestions(
    text: string,
    catalogResults: any[]
): TechnologySuggestion[] {
    // Simple parsing - in production, use structured output or better parsing
    const suggestions: TechnologySuggestion[] = [];

    // Try to extract technology mentions
    catalogResults.forEach((result, index) => {
        const metadata = result.metadata || {};
        suggestions.push({
            techId: metadata.techId || `tech-${index}`,
            name: metadata.vendor || 'Unknown',
            vendor: metadata.vendor || 'Unknown',
            description: result.content.substring(0, 200),
            pros: metadata.pros || [],
            cons: metadata.cons || [],
            effort: metadata.effort || 'medium',
            sources: [{
                type: 'catalog',
                id: result.docId,
                title: `${metadata.vendor} ${metadata.techId}`,
            }],
            confidence: 0.8 - (index * 0.1), // Decreasing confidence
        });
    });

    return suggestions.slice(0, 5); // Top 5
}

/**
 * Parse implementation plan from LLM response
 */
function parseImplementationPlan(text: string): ImplementationPlanResponse {
    // Simple parsing - extract steps, prerequisites, duration
    const lines = text.split('\n');
    const steps: any[] = [];
    const prerequisites: string[] = [];

    let currentStep: any = null;

    for (const line of lines) {
        if (line.match(/^Step \d+:/i)) {
            if (currentStep) steps.push(currentStep);
            currentStep = {
                order: steps.length + 1,
                title: line.replace(/^Step \d+:\s*/i, ''),
                description: '',
                owner: '',
                estimatedDuration: '',
            };
        } else if (line.match(/^Description:/i) && currentStep) {
            currentStep.description = line.replace(/^Description:\s*/i, '');
        } else if (line.match(/^Owner:/i) && currentStep) {
            currentStep.owner = line.replace(/^Owner:\s*/i, '');
        } else if (line.match(/^Duration:/i) && currentStep) {
            currentStep.estimatedDuration = line.replace(/^Duration:\s*/i, '');
        } else if (line.match(/prerequisite/i)) {
            prerequisites.push(line);
        }
    }

    if (currentStep) steps.push(currentStep);

    return {
        steps,
        prerequisites,
        estimatedDuration: '2-4 weeks', // Could extract from text
        sources: [],
    };
}

function parseVendorMitigationPlan(text: string, vendorName: string, riskScore: number, cveSummary: string): VendorMitigationPlanResponse {
    const lines = text.split('\n');
    const steps: MitigationStep[] = [];
    let analysis = "";

    let currentStep: Partial<MitigationStep> | null = null;
    let inAnalysis = false;

    // Regex to match "1. Title - Priority - Effort - Owner"
    // or just "1. Title"
    const stepRegex = /^\d+\.\s*(.+?)(?:\s-\s(Critical|High|Medium|Low)\s-\s(.+?)\s-\s(.+))?$/i;

    for (const line of lines) {
        if (line.match(/^Analysis:/i)) {
            inAnalysis = true;
            analysis += line.replace(/^Analysis:\s*/i, '') + "\n";
            continue;
        }

        if (inAnalysis) {
            analysis += line + "\n";
            continue;
        }

        const match = line.match(stepRegex);
        if (match) {
            if (currentStep && currentStep.title) {
                steps.push(currentStep as MitigationStep);
            }
            currentStep = {
                id: crypto.randomUUID(),
                title: match[1].trim(),
                priority: (match[2] as any) || 'Medium',
                estimatedEffort: match[3] || '1 week',
                assignedTo: match[4] || 'Security Team',
                description: ''
            };
        } else if (currentStep && line.trim().length > 0) {
            currentStep.description += line.trim() + " ";
        }
    }
    if (currentStep && currentStep.title) steps.push(currentStep as MitigationStep);

    return {
        vendorName,
        riskScore,
        mitigationSteps: steps,
        estimatedTimeline: "2-4 Weeks",
        criticalVulnerabilities: (cveSummary.match(/Score: [8-9]|Score: 10/g) || []).length,
        cveAnalysis: analysis.trim()
    };
}
