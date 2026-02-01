
import { config } from "dotenv";
config();
import { getDb } from "../packages/core/src/db";
import { policyTemplates } from "../packages/core/src/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Seeding NIST AI RMF Policy Templates...");
    const db = await getDb();

    const templates = [
        {
            templateId: "nist_ai_aup_001",
            name: "AI Acceptable Use Policy (AUP)",
            content: `
# AI Acceptable Use Policy (AUP)
**Version:** 1.0  
**Status:** Template

## 1. Purpose
To define the acceptable and responsible use of artificial intelligence (AI) technologies, including Generative AI and Large Language Models (LLMs), within the organization.

## 2. Scope
This policy applies to all employees, contractors, and third-party partners utilizing organizational data or assets to interact with AI systems.

## 3. Approved AI Tools
Users may only use AI tools that have been explicitly approved by the IT/Security department.
*   **Tier 1 (Approved):** Enterprise-grade tools with data protection agreements (e.g., Enterprise ChatGPT, Microsoft Copilot).
*   **Tier 2 (Prohibited):** Consumer-grade tools that use input data for model training.

## 4. Data Handling & Privacy
*   **Confidential Data:** NEVER input trade secrets, customer PII, or internal-only source code into unapproved AI tools.
*   **Anonymization:** Data must be anonymized before being used for prompt engineering where possible.

## 5. Prohibited Uses
*   Using AI to generate malicious code or phishing content.
*   Using AI for automated decision-making that impacts employee status without human review.

## 6. Human-in-the-Loop
All AI-generated content (code, reports, documents) must be reviewed by a human for accuracy, bias, and security before being finalized or published.
            `.trim(),
            isPublic: true,
            ownerId: 1
        },
        {
            templateId: "nist_ai_sdlc_001",
            name: "AI System Development & Lifecycle Policy",
            content: `
# AI System Development & Lifecycle Policy
**Version:** 1.0  
**Status:** Template

## 1. Overview
This policy outlines the governance requirements for the internal development, deployment, and monitoring of AI systems, aligned with the NIST AI RMF 1.0.

## 2. Inventory & Classification (MAP)
Every AI system must be registered in the AI System Inventory. Systems will be classified based on risk:
*   **Critical:** Real-time production impact, safety-critical.
*   **High:** Processes PII or financial data.
*   **Medium/Low:** Internal productivity tools.

## 3. Impact Assessments (MEASURE)
All High and Critical risk AI systems must undergo an AI Impact Assessment before deployment. This assessment must cover:
*   Safety and Bias.
*   Data Privacy & Protection.
*   Security & Robustness.

## 4. Model Cards & Documentation
Developers must maintain "Model Cards" for all internal models, documenting the training data, intended use, and known limitations.

## 5. Continuous Monitoring (MANAGE)
Active AI systems must be monitored for:
*   Model Drift (accuracy degradation).
*   Adversarial attacks on prompts or endpoints.
*   Compliance with ethical guardrails.
            `.trim(),
            isPublic: true,
            ownerId: 1
        }
    ];

    for (const t of templates) {
        // Check if exists
        const [existing] = await db.select().from(policyTemplates).where(eq(policyTemplates.templateId, t.templateId));
        if (existing) {
            console.log(`Updating existing template: ${t.name}`);
            await db.update(policyTemplates).set(t).where(eq(policyTemplates.id, existing.id));
        } else {
            console.log(`Inserting new template: ${t.name}`);
            await db.insert(policyTemplates).values(t);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

main();
