import { Router } from 'express';
import { llmService } from '../../lib/llm/service';
import { policyGenerator } from '../../lib/policy/policy-generation';

export const aiRouter = Router();

// Input size cap (P1 Security — prevents runaway LLM costs)
const MAX_INPUT_CHARS = 32000;
aiRouter.use((req: any, res: any, next) => {
  const body = req.body || {};
  const inputs = [body.userPrompt, body.systemPrompt, body.instruction, body.tailor]
    .filter(Boolean)
    .map((s: string) => s.length);
  const total = inputs.reduce((a: number, b: number) => a + b, 0);
  if (total > MAX_INPUT_CHARS) {
    return res.status(413).json({
      error: `Input too large (${total} chars, max ${MAX_INPUT_CHARS}). Reduce prompt size.`,
    });
  }
  next();
});

// Replaced Stub with Real Implementation
aiRouter.post('/generate-stream', async (req: any, res: any) => {
    // console.log('[AI Stream] Request received', {
    //     hasUser: !!req.user,
    //     userId: req.user?.id,
    //     body: req.body
    // });

    const user = req.user || { id: 1, email: 'admin@complianceos.local' };

    try {
        let { systemPrompt, userPrompt, temperature, maxTokens, instruction, tailor, clientId, templateId, feature, standardId, data } = req.body;

        // Scoping / Readiness Blueprint Report Feature
        if (feature === 'scoping_report' || (!userPrompt && data && standardId)) {
            const targetStandard = standardId || 'ISO27001';
            const scopeData = data?.scope || {};
            const stakeholdersData = data?.stakeholders || {};
            const existingPoliciesData = data?.existingPolicies || {};
            const contextData = data?.context || {};
            const expectationsData = data?.expectations || {};
            const questionnaireData = data?.questionnaireData || {};

            const activePolicies = Object.entries(existingPoliciesData)
                .filter(([_, v]) => v === true)
                .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
                .join(', ') || 'None specified';

            const questionsAnswered = Object.entries(questionnaireData.questions || {}).map(([id, q]: [string, any]) => {
                return `- Control ${id}: Answer: ${q.answer || 'Not answered'}${q.notes ? ` (Notes: ${q.notes})` : ''}`;
            }).join('\n');

            systemPrompt = `You are a Lead GRC Principal Auditor & Cybersecurity Strategist.
Generate an executive-ready Scoping Report & Strategic Readiness Blueprint in structured, professional Markdown.

Structure the report with the following sections:
# Executive Scoping & Readiness Assessment: ${targetStandard}

## 1. Executive Summary & Audit Readiness Posture
Provide a high-level executive verdict on the organization's current readiness state, maturity trajectory, and key risk areas.

## 2. Assessment Scope & Organizational Boundaries
Detail organizational boundaries, physical/cloud environments, and technical infrastructure in scope.

## 3. Governance & Stakeholder Alignment
Summarize key security roles, executive sponsorship, and operational ownership.

## 4. Business Context & Regulatory Landscape
Analyze critical assets, legal/regulatory drivers, and organizational risk appetite.

## 5. Current Baseline & Documentation Review
Assess existing policies and documentation in place.

## 6. Gap Analysis & Control Findings
Review the discovery questionnaire responses and identify specific gaps requiring remediation.

## 7. Strategic Compliance Roadmap
Provide a prioritized phased implementation roadmap (Phase 1: Quick Wins / Remediation, Phase 2: Implementation & Evidence Collection, Phase 3: Pre-Audit & Certification).

Maintain a formal, authoritative, and actionable consulting tone with markdown tables, callout highlights, and clear milestones.`;

            userPrompt = `Please generate the comprehensive Readiness Blueprint for standard ${targetStandard} using the following assessment discovery data:

- Target Framework: ${targetStandard}
- Organization Boundaries: ${scopeData.orgBoundaries || 'Enterprise wide'}
- Physical / Cloud Locations: ${scopeData.locations || 'Not specified'}
- Technologies & Cloud Infrastructure: ${scopeData.technologies || 'Not specified'}
- Stakeholders: Security Lead (${stakeholdersData.securityLead || 'N/A'}), Executive Sponsor (${stakeholdersData.executiveSponsor || 'N/A'}), IT/DevOps (${stakeholdersData.itLead || 'N/A'})
- Existing Implemented Policies: ${activePolicies}
- Critical Assets: ${contextData.criticalAssets || 'Not documented'}
- Legal & Contractual Requirements: ${contextData.legalRequirements || 'Not documented'}
- Risk Appetite: ${contextData.riskAppetite || 'Moderate'}
- Target Maturity Level: ${expectationsData.targetMaturity || 'Defined'}
- Primary Objective: ${expectationsData.primaryObjective || 'External Certification Readiness'}
- Target Timeline: ${expectationsData.timeline || '6-12 Months'}

Readiness Questionnaire Responses:
${questionsAnswered || 'Baseline readiness evaluation complete.'}`;
        }

        // If templateId is provided but no userPrompt, generate from policy generator
        if (templateId && !userPrompt) {
            try {
                const parsedClientId = clientId ? parseInt(clientId) : 0;
                const prompt = await policyGenerator.getGenerationPrompt(
                    parsedClientId,
                    templateId,
                    undefined,
                    { customInstruction: instruction, tailorToIndustry: tailor }
                );
                userPrompt = prompt.userPrompt;
                if (!systemPrompt) systemPrompt = prompt.systemPrompt;
            } catch (err: any) {
                console.error('[AI Stream] Failed to generate prompt from template:', err);
                return res.status(500).json({ error: 'Failed to prepare prompt from template: ' + err.message });
            }
        }

        if (!userPrompt) {
            return res.status(400).json({ error: 'Missing userPrompt' });
        }

        // Apply customization logic: Append instruction to prompt if provided AND NOT already handled by getGenerationPrompt
        // policy-generation already handles instruction in getGenerationPrompt, so we only add it here if plain userPrompt was passed
        if (instruction && !templateId) {
            const instructionText = `\n\nIMPORTANT INSTRUCTION: ${instruction}`;
            if (systemPrompt) {
                systemPrompt += instructionText;
            } else {
                systemPrompt = `You are a helpful AI assistant. ${instructionText}`;
            }
        }

        // Send SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Flush headers immediately usually happens on first write, but explicitly setting headers helps.

        const stream = llmService.generateStream({
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens
        }, {
            userId: user.id,
            clientId,
            endpoint: 'generate-stream'
        });

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error: any) {
        console.error('[AI Stream] Error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: error.message });
        } else {
            // Stream error
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});
