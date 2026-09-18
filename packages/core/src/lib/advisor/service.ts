import { llmService } from '../llm/service';
import { AgentService } from '../ai/agent-service';

export async function suggestTechnologies(request: {
    clientId: number;
    controlId: number;
    vendorPreference?: string;
    budgetConstraint?: string;
}) {
    const userPrompt = `I need technology suggestions for implementing a compliance control.
Control ID: ${request.controlId}
${request.vendorPreference ? `Vendor Preference: ${request.vendorPreference}` : ''}
${request.budgetConstraint ? `Budget Constraint: ${request.budgetConstraint}` : ''}

Please provide 3-5 ranked technology options with pros, cons, and implementation effort.`;

    const response = await llmService.generate({
        systemPrompt: "You are a senior compliance architect.",
        userPrompt,
        temperature: 0.3,
        feature: 'tech_suggestion'
    });

    return {
        suggestions: [], // In core, we return the text for now or simple parse
        analysis: response.text
    };
}

export async function generateImplementationPlan(request: {
    clientId: number;
    controlId: number;
    selectedTech?: string;
}) {
    const userPrompt = `Create a detailed implementation plan for control ${request.controlId}.
${request.selectedTech ? `Selected Technology: ${request.selectedTech}` : ''}

Provide a step-by-step plan with prerequisites, tasks, and estimated durations.`;

    const response = await llmService.generate({
        systemPrompt: "You are a senior compliance architect.",
        userPrompt,
        temperature: 0.4,
        feature: 'implementation_plan'
    });

    return {
        steps: [], // Simple placeholder
        plan: response.text
    };
}

export async function generateVendorMitigationPlan(request: {
    clientId: number;
    vendorId: number;
}) {
    // Basic implementation for core
    return { plan: [], strategy: "Manual Review Required" };
}

export async function explainMapping(input: any) {
    return { explanation: "AI mapping explanation is a premium feature." };
}


export async function askQuestion(request: {
    clientId: number;
    question: string;
    context?: {
        type: 'control' | 'policy' | 'evidence' | 'regulation' | 'risk' | 'vendor' | 'gapanalysis' | 'page';
        id: string;
        data?: any;
    } | null;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
    // 1. Fetch live compliance snapshot from DB
    const contextSnapshot = await AgentService.buildContextSnapshot(request.clientId);

    // 2. Build entity-specific context block if a specific item is in focus
    let entityContextBlock = '';
    if (request.context?.data) {
        const { type, id, data } = request.context;
        try {
            switch (type) {
                case 'control':
                    entityContextBlock = `\n\n## Current Focus: Control\n- **Control:** ${data.name || data.title || id}\n- **Status:** ${data.status || 'unknown'}\n- **Category:** ${data.category || 'N/A'}\n- **Description:** ${data.description || data.requirementText || 'N/A'}`;
                    break;
                case 'policy':
                    entityContextBlock = `\n\n## Current Focus: Policy\n- **Policy:** ${data.name || data.title || id}\n- **Status:** ${data.status || 'unknown'}\n- **Version:** ${data.version || '1.0'}\n- **Frameworks:** ${Array.isArray(data.frameworks) ? data.frameworks.join(', ') : (data.frameworks || 'N/A')}`;
                    break;
                case 'risk':
                    entityContextBlock = `\n\n## Current Focus: Risk\n- **Risk:** ${data.title || id}\n- **Inherent Risk:** ${data.inherentRisk || 'unknown'} (Score: ${data.inherentScore || 'N/A'})\n- **Residual Risk:** ${data.residualRisk || 'N/A'}\n- **Status:** ${data.status || 'draft'}\n- **Description:** ${data.threatDescription || data.description || 'N/A'}`;
                    break;
                case 'vendor':
                    entityContextBlock = `\n\n## Current Focus: Vendor\n- **Vendor:** ${data.name || id}\n- **Risk Tier:** ${data.riskTier || 'N/A'}\n- **Category:** ${data.category || 'N/A'}\n- **Compliance Status:** ${data.complianceStatus || 'N/A'}`;
                    break;
                case 'evidence':
                    entityContextBlock = `\n\n## Current Focus: Evidence\n- **Evidence:** ${data.title || id}\n- **Status:** ${data.status || 'N/A'}\n- **Source:** ${data.source || 'N/A'}\n- **Description:** ${data.description || 'N/A'}`;
                    break;
                default:
                    if (data && typeof data === 'object') {
                        entityContextBlock = `\n\n## Current Focus: ${type}\n${JSON.stringify(data, null, 2).slice(0, 800)}`;
                    }
            }
        } catch (e) {
            // Entity context injection is non-critical — proceed without it
        }
    }

    // 3. Build agentic tools prompt
    const agentToolsPrompt = await AgentService.getAgentPrompt(request.clientId);

    // 4. Assemble the full system prompt
    const systemPrompt =
        `You are ComplianceOS AI — a precise compliance advisor with full visibility into this organization's GRC posture.\n` +
        `Always answer from the live data provided below. Never invent compliance scores, risk levels, or control statuses.${contextSnapshot}${entityContextBlock}${agentToolsPrompt}`;

    // 5. Generate with conversation history for multi-turn memory
    const response = await llmService.generate({
        systemPrompt,
        userPrompt: request.question,
        messages: request.conversationHistory,
        temperature: 0.3,
        feature: 'general_advisor',
    });

    const { cleanText, proposals } = AgentService.parseProposals(response.text);

    return {
        answer: cleanText,
        sources: [],
        proposals: proposals.length > 0 ? proposals : undefined,
    };
}

export async function analyzeRisk(request: {
    threat: string;
    vulnerability: string;
    assets: string[];
}) {
    const userPrompt = `
Risk Scenario Analysis:
Threat: "${request.threat}"
Vulnerability: "${request.vulnerability}"
Affected Assets: ${request.assets.join(', ')}

Based on this context, estimate:
1. Likelihood (Rare, Unlikely, Possible, Likely, Almost Certain)
2. Impact (Low, Medium, High, Very High)
3. Inherent Risk Level (Low, Medium, High, Very High)

Provide a short reasoning (max 2 sentences).

Output as JSON:
{
  "likelihood": "String",
  "impact": "String",
  "inherentRisk": "String",
  "reasoning": "String"
}`;

    const response = await llmService.generate({
        systemPrompt: "You are a risk management expert.",
        userPrompt,
        temperature: 0.2,
        jsonMode: true,
        feature: 'risk_analysis'
    });

    try {
        return JSON.parse(response.text);
    } catch (e) {
        return {
            likelihood: 'Possible',
            impact: 'Medium',
            inherentRisk: 'Medium',
            reasoning: 'AI analysis failed to parse. Defaulting to medium.'
        };
    }
}

export async function reindexKnowledgeBase(input: any) {
    console.warn('AI features are available in the Premium edition.');
    return { success: false, message: "Premium feature required." };
}

export async function generateRiskMitigationPlan(request: {
    riskTitle: string;
    riskDescription: string;
    riskContext?: string;
    currentMitigations?: string[];
}) {
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

    const response = await llmService.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        feature: 'risk_mitigation'
    });

    // Strip markdown code blocks if present
    const cleanResponse = (response.text || '')
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');

    return {
        mitigationPlan: cleanResponse || '<p>Failed to generate plan.</p>'
    };
}

export async function generateBcpContent(input: any) {
    console.warn('AI features are available in the Premium edition.');
    return "";
}
