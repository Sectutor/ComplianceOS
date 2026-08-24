/**
 * LLM-powered questionnaire answering.
 * Uses the configured LLM providers (Settings > AI Providers) to generate
 * auditor-grade answers grounded in the client's actual ISMS context
 * (policies, controls, evidence, vendors). Falls back to the rule-based
 * responder when no LLM provider is available or the call fails.
 */
import { getDb } from "../../db";
import { clientControls, controls, evidence, clientPolicies } from "../../schema";
import { eq } from "drizzle-orm";
import { LLMService } from "../llm/service";
import {
  autoAnswerQuestionnaire,
  type QuestionnaireQuestion,
  type AnsweredQuestion,
} from "./questionnaireAutoResponder";

export interface LlmAnswerResult {
  answeredQuestions: AnsweredQuestion[];
  overallConfidence: number;
  engine: "llm" | "rules";
  modelUsed?: string;
}

const ANSWER_SCHEMA_INSTRUCTIONS = `Respond ONLY with a JSON object with exactly these keys:
- "shortAnswer": one of "Yes", "No", "Partial", "Not Applicable"
- "answer": detailed auditor-grade paragraph (3-6 sentences) grounded ONLY in the provided context
- "confidenceScore": integer 0-100 based on how well the context supports the answer
- "supportingEvidence": reference to specific policy/control/evidence from context, or "No direct evidence found"
- "policyCitation": policy name or empty string
- "focusArea": short category label`;

async function gatherClientContext(clientId: number): Promise<string> {
  const db = await getDb();
  const parts: string[] = [];

  try {
    // Policies (names + first ~300 chars of content)
    const policies = await db
      .select({ name: clientPolicies.name, status: clientPolicies.status })
      .from(clientPolicies)
      .where(eq(clientPolicies.clientId, clientId))
      .limit(40);
    if (policies.length) {
      parts.push(
        "IMPLEMENTED POLICIES:\n" +
          policies.map(p => `- ${p.name} [${p.status}]`).join("\n")
      );
    }

    // Implemented controls (framework + name)
    const ctrlRows = await db
      .select({
        framework: controls.framework,
        controlId: controls.controlId,
        name: controls.name,
        status: clientControls.status,
      })
      .from(clientControls)
      .innerJoin(controls, eq(controls.id, clientControls.controlId))
      .where(eq(clientControls.clientId, clientId))
      .limit(120);
    if (ctrlRows.length) {
      const implemented = ctrlRows.filter(c => c.status === "implemented");
      const inProgress = ctrlRows.filter(c => c.status === "in_progress");
      parts.push(
        `IMPLEMENTED CONTROLS (${implemented.length} of ${ctrlRows.length} total):\n` +
          implemented.slice(0, 60).map(c => `- ${c.framework} ${c.controlId}: ${c.name}`).join("\n") +
          (inProgress.length ? `\nIN-PROGRESS CONTROLS (${inProgress.length}):\n` + inProgress.slice(0, 20).map(c => `- ${c.framework} ${c.controlId}: ${c.name}`).join("\n") : "")
      );
    }

    // Verified evidence samples
    const evRows = await db
      .select({ evidenceId: evidence.evidenceId, description: evidence.description, status: evidence.status })
      .from(evidence)
      .where(eq(evidence.clientId, clientId))
      .limit(30);
    if (evRows.length) {
      parts.push(
        "EVIDENCE ARTIFACTS AVAILABLE:\n" +
          evRows.map(e => `- ${e.evidenceId} [${e.status}] ${e.description?.slice(0, 100) || ""}`).join("\n")
      );
    }
  } catch (e) {
    // Context is best-effort; rules engine fallback still works without it
  }

  return parts.join("\n\n");
}

function buildPrompt(questionText: string, clientContext: string): string {
  return `You are a senior compliance analyst answering a vendor security questionnaire (CAIQ / SIG style) on behalf of the client organization.

Use ONLY the client security context below to answer. If the context does not support a definitive answer, answer honestly ("Partial" or state what would be needed) and lower your confidence — never fabricate specifics.

=== CLIENT SECURITY CONTEXT ===
${clientContext || "(No structured context available — answer conservatively)"}
=== END CONTEXT ===

QUESTION:
${questionText}

${ANSWER_SCHEMA_INSTRUCTIONS}`;
}

export async function llmAnswerQuestionnaire(
  clientId: number,
  questions: QuestionnaireQuestion[]
): Promise<LlmAnswerResult> {
  let llm: LLMService;
  try {
    llm = new LLMService();
  } catch {
    return { ...(await autoAnswerQuestionnaire(clientId, questions)), engine: "rules" };
  }

  const clientContext = await gatherClientContext(clientId);
  const answeredQuestions: AnsweredQuestion[] = [];
  let usedLlm = 0;
  let modelUsed: string | undefined;

  for (const q of questions) {
    try {
      const response = await llm.generate(
        {
          systemPrompt: "You are a senior compliance analyst answering vendor security questionnaires (CAIQ/SIG style). Answer only from the provided client context. Never fabricate specifics. Respond with the required JSON object.",
          userPrompt: buildPrompt(q.questionText, clientContext),
          jsonMode: true,
          temperature: 0.2,
          maxTokens: 700,
        },
        { endpoint: "questionnaire_autoanswer", clientId }
      );

      modelUsed = modelUsed || response.model;
      const parsed = typeof response.text === "string" ? JSON.parse(response.text) : response.text;
      usedLlm++;
      answeredQuestions.push({
        questionId: q.questionId,
        questionText: q.questionText,
        shortAnswer: String(parsed.shortAnswer || "Partial"),
        answer: String(parsed.answer || ""),
        confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 50)),
        supportingEvidence: String(parsed.supportingEvidence || ""),
        policyCitation: parsed.policyCitation ? String(parsed.policyCitation) : undefined,
        focusArea: parsed.focusArea ? String(parsed.focusArea) : q.category,
      });
    } catch (err: any) {
      console.warn(`[llmAnswer] LLM failed for "${q.questionId}" (${err.message}); falling back to rules for this question`);
      const fallback = await autoAnswerQuestionnaire(clientId, [q]);
      answeredQuestions.push(fallback.answeredQuestions[0]);
    }
  }

  const overallConfidence =
    answeredQuestions.length > 0
      ? Math.round(answeredQuestions.reduce((a, r) => a + r.confidenceScore, 0) / answeredQuestions.length)
      : 0;

  return {
    answeredQuestions,
    overallConfidence,
    engine: usedLlm > 0 ? "llm" : "rules",
    modelUsed,
  };
}
