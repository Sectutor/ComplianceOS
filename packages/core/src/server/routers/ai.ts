
import { Router } from 'express';
import { llmService } from '../../lib/llm/service';
import { PolicyGenerator } from '../../lib/policy/policy-generation';

export const aiRouter = Router();

aiRouter.post('/generate-stream', async (req: any, res: any) => {
    console.log('[AI Stream] Handler entered');
    try {
        console.log('[AI Stream] Request Context:', {
            hasUser: !!req.user,
            userId: req.user?.id,
            userRole: req.user?.role,
            body: {
                feature: req.body.feature,
                clientId: req.body.clientId,
                templateId: req.body.templateId,
                hasData: !!req.body.data
            }
        });

        if (!req.user) {
            console.error('[AI Stream] Unauthorized: req.user is missing');
            return res.status(401).json({ error: 'Unauthorized: User context not found' });
        }

        const { clientId, templateId, tailor, instruction, userPrompt: customUserPrompt, systemPrompt: customSystemPrompt, module: policyModule } = req.body;

        let userPrompt = customUserPrompt;
        let systemPrompt = customSystemPrompt || "You are a helpful assistant.";

        if (clientId) {
            // Structured Policy Generation Request
            console.log('[AI Stream] Mode: Policy Generation');
            const policyGenerator = new PolicyGenerator();

            const promptData = await policyGenerator.getGenerationPrompt(clientId, templateId, req.body.sections, {
                tailorToIndustry: tailor,
                customInstruction: instruction,
                language: req.body.language
            });

            userPrompt = promptData.userPrompt;
            systemPrompt = promptData.systemPrompt;
        } else if (req.body.feature === 'scoping_report') {
            // Scoping Report Generation
            const { standardId, data } = req.body;
            console.log('[AI Stream] Mode: Scoping Report for', standardId);

            if (!data) {
                console.error('[AI Stream] Missing discovery data');
                return res.status(400).json({ error: 'Discovery data is required' });
            }

            systemPrompt = `You are a Senior Strategic Compliance Consultant and Lead Auditor for ${standardId}. 
            Your writing style is professional, analytical, and highly structured, typical of Big Four consulting firms. 
            Your goal is to provide a comprehensive, executive-grade Scoping & Readiness Blueprint.`;

            const policies = Object.entries(data.existingPolicies || {})
                .filter(([_, v]) => v === true)
                .map(([k, _]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
                .join(', ');

            const standardContext = standardId?.toUpperCase().includes('SOC')
                ? "This report must frame findings within the Trust Services Criteria (TSC), specifically Security, Availability, and Confidentiality. Mention the 'Discovery phase' as the foundation for the upcoming Type 1 / Type 2 audit."
                : standardId?.toUpperCase().includes('ISO')
                    ? "This report must follow the ISMS framework requirements (Chapters 4-10) and Annex A controls. Emphasize the alignment between business context and the Statement of Applicability (SoA)."
                    : "Focus on industry-standard compliance frameworks and risk-based scoping.";

            userPrompt = `
                Write a professional **Executive Scoping & Compliance Readiness Report** for **${standardId}** based on the discovery data provided below.

                ### Discovery Context:
                - **Boundaries & Scope:** ${data.scope?.orgBoundaries || "Not defined"}
                - **Physical Locations:** ${data.scope?.locations || "Not defined"}
                - **Infrastructure & App Stack:** ${data.scope?.technologies || "Not defined"}
                - **Leadership/Stakeholders:** ${JSON.stringify(data.stakeholders || {})}
                - **Maturity Baseline:** Existing policies identified: ${policies || "No existing documentation found"}
                - **Business Environment:** Critical Assets: ${data.context?.criticalAssets || "N/A"}, Regulatory context: ${data.context?.legalRequirements || "N/A"}
                - **Success Markers:** Primary Objective: ${data.expectations?.primaryObjective || "N/A"}, Target Maturity: ${data.expectations?.targetMaturity || "N/A"}, Timeline: ${data.expectations?.timeline || "N/A"}

                ### Mandatory Report Structure:
                // ... (Structure remains same)
                1.  **Section I: Executive Summary**: A 1-2 paragraph overview of the current compliance posture and the strategic importance of this ${standardId} project.
                2.  **Section II: Audit Boundary Definition**: Explicitly define what is "In-Scope" vs "Out-of-Scope" based on the boundaries and locations described.
                3.  **Section III: Stakeholder & Governance Mapping**: Analyze the project's sponsorship and internal ownership structure.
                4.  **Section IV: Current State Documentation Analysis**: Evaluate the impact of the ${policies ? 'identified policies' : 'missing policies'} on the starting readiness score.
                5.  **Section V: Technology & Risk Landscape**: Deep dive into the security implications of their specific stack (${data.scope?.technologies}).
                6.  **Section VI: Strategic Roadmap**: Breakdown the implementation into 3 phases (Foundation, Implementation, Validation) aligned with the ${data.expectations?.timeline} timeline.
                7.  **Section VII: Key Recommendations**: Provide 3-5 high-impact, actionable recommendations for leadership.

                ### Guidelines:
                - Use valid Markdown (headers, lists, bolding).
                - **Standard Specific Requirement**: ${standardContext}
                - Avoid generic filler. Be specific to the data provided.
                - Length: Aim for a comprehensive document (approx. 600-800 words).
            `;
        }

        if (!userPrompt) {
            console.error('[AI Stream] ERROR: No prompt generated (missing clientId or feature)');
            return res.status(400).json({ error: 'Request must include clientId or valid feature' });
        }

        console.log('[AI Stream] Setting SSE headers');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        console.log('[AI Stream] Initiating LLM stream...');
        const stream = llmService.generateStream({
            userPrompt,
            systemPrompt,
            feature: 'policy_generation',
            temperature: 0.7
        });

        console.log('[AI Stream] Consuming stream chunks...');
        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        console.log('[AI Stream] Stream closed successfully');

    } catch (error: any) {
        console.error('[AI Stream] CRITICAL ERROR:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } else {
            console.error('[AI Stream] Error occurred after headers sent, streaming error payload');
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});
