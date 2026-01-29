import { llmService } from "../../lib/llm/service";
import * as db from "../../db";

export interface AIReportContext {
    client: any;
    roadmap?: any;
    gapAnalysis?: any[];
    riskAssessments?: any[];
    controls?: any[];
    policies?: any[];
}

/**
 * AI Report Generation Service
 * Generates narrative sections using Claude
 */
export class ReportAI {
    // LLMService is used directly, no internal state needed


    /**
     * Generate Executive Summary
     */
    async generateExecutiveSummary(context: AIReportContext): Promise<string> {
        const prompt = this.buildExecutiveSummaryPrompt(context);

        try {
            const response = await llmService.generate({
                userPrompt: prompt,
                systemPrompt: "You are a cybersecurity consultant writing an Executive Summary for a Strategic Roadmap Report.",
                temperature: 0.7,
                maxTokens: 1500,
                feature: 'report_generation'
            });

            return response.text;
        } catch (error) {
            console.error("Failed to generate executive summary:", error);
            return "Executive Summary could not be generated due to an AI service error.";
        }
    }

    /**
     * Generate section-specific AI insights
     */
    async generateSectionInsights(
        sectionType: "risk_appetite" | "objectives" | "resources" | "governance",
        context: AIReportContext
    ): Promise<string> {
        const prompt = this.buildSectionPrompt(sectionType, context);

        try {
            const response = await llmService.generate({
                userPrompt: prompt,
                systemPrompt: "You are a cybersecurity consultant providing strategic insights for a roadmap report.",
                temperature: 0.7,
                maxTokens: 800,
                feature: 'report_generation'
            });

            return response.text;
        } catch (error) {
            console.error(`Failed to generate insights for ${sectionType}:`, error);
            return "";
        }
    }

    /**
     * Build Executive Summary prompt
     */
    private buildExecutiveSummaryPrompt(context: AIReportContext): string {
        const { client, roadmap, gapAnalysis, riskAssessments, controls } = context;

        return `You are a Senior Strategic Advisor writing an Executive Summary for a Comprehensive Roadmap Report.
your Goal is to sell the roadmap to the client.

**Client Context:**
- Organization: ${client?.name || "N/A"}
- Industry: ${client?.industry || "N/A"}
- Size: ${client?.size || "N/A"}

**Strategic Context:**
- Roadmap Title: ${roadmap?.title || "N/A"}
- Strategic Vision: ${roadmap?.vision || "N/A"}
- Framework: ${roadmap?.framework || "N/A"}
- Target Date: ${roadmap?.targetDate ? new Date(roadmap.targetDate).toLocaleDateString() : "N/A"}

**Data Insights:**
- Gap Analysis: ${gapAnalysis?.length || 0} gaps identified
- Active Risks: ${riskAssessments?.length || 0} risks (${riskAssessments?.filter((r: any) => r.riskLevel === 'critical' || r.riskLevel === 'high').length || 0} high/critical)
- Control Implementation: ${controls?.filter((c: any) => c.status === "implemented").length || 0} of ${controls?.length || 0} controls active

**Task:**
Write a high-impact Executive Summary (350-400 words) structured as follows:
1.  **Strategic Health Assessment:** Start with a "Compliance Health Score" (e.g., "Current Maturity: Reactive/Developing") and a bold statement on the organization's current posture.
2.  **Critical Business Drivers:** Explain WHY this roadmap is urgent (connecting risks to business impact).
3.  **The Path Forward:** Highlight the top 3 high-value initiatives in the roadmap.
4.  **Target Outcomes:** Conclude with the tangible business value expected upon completion (e.g., "Market mitigation", "Certification readiness").

**Tone:**
Authoritative, commercially focused, and confidence-inspiring. Avoid passive voice. Speak directly to the C-Suite. use html formatting, with headers and lists.`;
    }

    /**
     * Build section-specific prompts
     */
    private buildSectionPrompt(
        sectionType: string,
        context: AIReportContext
    ): string {
        const { client, roadmap } = context;
        const toneCheck = "Maintain a Senior Partner tone: definitive, experienced, and strategic.";

        switch (sectionType) {
            case "risk_appetite":
                return `Conduct a Risk & Compliance Maturity Assessment.

**Context:**
- Org: ${client?.name} (${client?.industry})
- Framework: ${roadmap?.framework}

**Task:**
Provide a structured analysis (2 paragraphs + bullet points) that:
1.  **Defines the Target Maturity Level:** (e.g., from "Ad-Hoc" to "Managed") based on their industry.
2.  **Analyzes Risk Appetite:** Recommend a specific risk appetite statement appropriate for their size and industry.
3.  **Lists 3 Key Compliance Drivers:** The external pressures forcing this change.

${toneCheck} use html formatting.`;

            case "objectives":
                return `Provide a Strategic Alignment Analysis of the roadmap objectives.

**Objectives:**
${roadmap?.objectives?.map((obj: string, i: number) => `${i + 1}. ${obj}`).join("\n")}

**Task:**
Analyze these objectives and provide:
1.  **Strategic Relevance:** How these specific objectives reduce liability or unlock business growth.
2.  **Critical Path Warning:** Identify which objective is the "linchpin" that must be achieved first.
3.  **Execution Confidence:** A brief assessment of the feasibility of these goals.

${toneCheck} use html formatting.`;

            case "resources":
                return `Develop a Strategic Resource Investment Case.

**Framework:** ${roadmap?.framework}
**Timeline:** ${roadmap?.targetDate ? new Date(roadmap.targetDate).toLocaleDateString() : "TBD"}

**Task:**
Write a persuasive case for resource allocation covering:
1.  **Investment vs. Cost:** Frame compliance spend as "Revenue Enablement" or "Risk Insurance" rather than just cost.
2.  **Critical Roles:** Identify the 2-3 non-negotiable roles (internal or external) needed to succeed.
3.  **Toal Estimation:** Provide a rough order of magnitude estimation for the effort.

${toneCheck} use html formatting.`;

            case "governance":
                return `Design a Target Operating Model for Governance.

**Context:** ${client?.name} (${client?.size}) targeting ${roadmap?.framework}.

**Task:**
Propose a tailored governance structure:
1.  **The "Three Lines of Defense" Model:** Briefly explain how it applies here.
2.  **Oversight Cadence:** Specific recommendations for Board/Executive reporting frequencies.
3.  **Accountability:** Define who specifically should own the "Acceptance of Risk".

${toneCheck} use html formatting.`;

            default:
                return "";
        }
    }

    /**
     * Generate a concise strategic introduction for a report section
     */
    async generateSectionIntro(
        sectionType: string,
        context: AIReportContext
    ): Promise<string> {
        const prompt = this.buildSectionIntroPrompt(sectionType, context);
        if (!prompt) return "";

        try {
            const response = await llmService.generate({
                userPrompt: prompt,
                systemPrompt: "You are a Senior Strategic Advisor writing a formal report for a client. Write ONLY the requested paragraph. No headers, no markdown formatting like **bold**, just clear professional text.",
                temperature: 0.6,
                maxTokens: 300,
                feature: 'report_generation'
            });

            return response.text;
        } catch (error) {
            console.error(`Failed to generate intro for ${sectionType}:`, error);
            return "";
        }
    }

    private buildSectionIntroPrompt(sectionType: string, context: AIReportContext): string {
        const { client, roadmap } = context;
        const basicContext = `Client: ${client?.name}, Industry: ${client?.industry}, Framework: ${roadmap?.framework}`;

        switch (sectionType) {
            case "strategic_vision":
                return `Write a professional 2-3 sentence introduction for the "Strategic Vision & Business Context" section.
Context: ${basicContext}.
Goal: Set the stage by connecting the client's industry context to the need for a robust compliance strategy.`;

            case "risk_appetite":
                return `Write a professional 2-3 sentence introduction for the "Risk Appetite & Compliance Drivers" section.
Context: ${basicContext}.
Goal: Introduce the analysis of the organization's risk posture and the external drivers necessitating this roadmap.`;

            case "objectives_timeline":
                return `Write a professional 2-3 sentence introduction for the "Key Objectives & Milestones Timeline" section.
Context: ${basicContext}.
Goal: Frame the following objectives as critical steps towards achieving compliance and operational maturity.`;

            case "implementation_plan":
                return `Write a professional 2-3 sentence introduction for the "Implementation Plan" section.
Context: ${basicContext}.
Goal: Transition from strategy to execution, highlighting the structured approach to remediation.`;

            case "resource_allocation":
                return `Write a professional 2-3 sentence introduction for the "Resource Allocation" section.
Context: ${basicContext}.
Goal: Emphasize that the following resource requirements are essential investments for success.`;

            case "governance":
                return `Write a professional 2-3 sentence introduction for the "Governance & Oversight" section.
Context: ${basicContext}.
Goal: Stress the importance of ongoing oversight to maintain the target compliance state.`;

            case "execution_dashboard":
                return `Write a professional 2-3 sentence introduction for the "Execution Dashboard" section.
Context: ${basicContext}.
Goal: Introduce the current status of the project and the metrics used to track progress.`;

            default:
                return "";
        }
    }
}

/**
 * Helper function to generate AI content
 */
export async function generateAIContent(
    type: "executive_summary" | "risk_appetite" | "objectives" | "resources" | "governance",
    context: AIReportContext
): Promise<string> {
    const ai = new ReportAI();

    if (type === "executive_summary") {
        return ai.generateExecutiveSummary(context);
    } else if (type === "risk_appetite" || type === "objectives" || type === "resources" || type === "governance") {
        return ai.generateSectionInsights(type as any, context);
    } else {
        return "";
    }
}

export async function generateSectionIntro(
    type: string,
    context: AIReportContext
): Promise<string> {
    const ai = new ReportAI();
    return ai.generateSectionIntro(type, context);
}
