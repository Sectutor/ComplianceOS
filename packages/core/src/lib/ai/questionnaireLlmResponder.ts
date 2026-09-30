/**
 * LLM-powered questionnaire answering.
 * Uses the configured LLM providers (Settings > AI Providers) to generate
 * auditor-grade answers grounded in the client's actual ISMS context
 * (policies, controls, evidence, vendors).
 *
 * Pipeline per run:
 *   1. Answer-library lookup (completed questionnaires, same client) —
 *      exact/fuzzy question matches are reused verbatim, no LLM spend.
 *   2. Remaining questions go to the LLM in batches, requesting strict JSON.
 *   3. Responses are fence-stripped and zod-validated; anything missing or
 *      malformed degrades to an honest "Needs Review" placeholder — never to
 *      a fabricated control assertion.
 */
import { getDb } from "../../db";
import { clientControls, controls, evidence, clientPolicies } from "../../schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { LLMService } from "../llm/service";
import {
  type QuestionnaireQuestion,
  type AnsweredQuestion,
  needsReviewAnswer,
} from "./questionnaireAutoResponder";
import { findLibraryMatches } from "../questionnaire/answerLibrary";

export interface LlmAnswerResult {
  answeredQuestions: AnsweredQuestion[];
  overallConfidence: number;
  engine: "llm" | "rules" | "library";
  modelUsed?: string;
}

const ANSWER_SCHEMA_INSTRUCTIONS = `Respond ONLY with a JSON object with exactly this shape:
{"answers":[{"questionId":"<id from input>","shortAnswer":"Yes|No|Partial|Not Applicable","answer":"detailed auditor-grade paragraph (3-6 sentences) grounded ONLY in the provided context","confidenceScore":<integer 0-100 based on how well the context supports the answer>,"supportingEvidence":"reference to specific policy/control/evidence from context, or empty string","policyCitation":"policy name or empty string","focusArea":"short category label"}]}
Include an entry for EVERY question in the input, using the exact questionId values provided.`;

/** Questions per LLM call — batches keep prompt overhead low while staying parseable. */
const BATCH_SIZE = 8;

async function gatherClientContext(clientId: number): Promise<string> {
  const db = await getDb();
  const parts: string[] = [];

  try {
    // Policies (names + status)
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
    // Context is best-effort; the honest placeholder still works without it
  }

  return parts.join("\n\n");
}

function buildBatchPrompt(questions: QuestionnaireQuestion[], clientContext: string): string {
  const questionLines = questions
    .map(q => `- questionId: ${q.questionId} | category: ${q.category || "n/a"} | ${q.questionText}`)
    .join("\n");
  return `You are a senior compliance analyst answering a vendor security questionnaire (CAIQ / SIG style) on behalf of the client organization.

Use ONLY the client security context below to answer. If the context does not support a definitive answer, answer honestly ("Partial" or state what would be needed) and lower your confidence — never fabricate specifics.

=== CLIENT SECURITY CONTEXT ===
${clientContext || "(No structured context available — answer conservatively)"}
=== END CONTEXT ===

QUESTIONS:
${questionLines}

${ANSWER_SCHEMA_INSTRUCTIONS}`;
}

/**
 * Strip markdown code fences and extract the outermost JSON object from an
 * LLM response. Returns null when no JSON can be located. Pure, unit-tested.
 */
export function extractJsonPayload(text: string): string | null {
  if (!text) return null;
  let cleaned = text.trim();
  // Remove ``` / ```json fences anywhere around the payload
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const start =
    firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start === -1) return null;
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);
  if (end <= start) return null;
  return cleaned.slice(start, end + 1);
}

const llmAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        shortAnswer: z.string().default("Needs Review"),
        answer: z.string().default(""),
        confidenceScore: z.coerce.number().min(0).max(100).default(50),
        supportingEvidence: z.string().optional().default(""),
        policyCitation: z.string().optional().default(""),
        focusArea: z.string().optional(),
      })
    )
    .default([]),
});

/** Build the honest placeholder for a question, keyed consistently. */
function placeholderFor(q: QuestionnaireQuestion): AnsweredQuestion {
  const ph = needsReviewAnswer(q.questionText, q.category);
  ph.questionId = q.questionId;
  return ph;
}

export async function llmAnswerQuestionnaire(
  clientId: number,
  questions: QuestionnaireQuestion[]
): Promise<LlmAnswerResult> {
  const safeQuestions = Array.isArray(questions) ? questions.filter(q => q?.questionText) : [];

  // 1. Answer library first — approved answers from completed questionnaires
  //    are reused verbatim and cost zero tokens.
  const byId = new Map<string, AnsweredQuestion>();
  const libraryMatches = await findLibraryMatches(
    clientId,
    safeQuestions.map(q => ({ questionId: q.questionId, questionText: q.questionText }))
  );
  const remaining: QuestionnaireQuestion[] = [];
  for (const q of safeQuestions) {
    const match = libraryMatches.get(q.questionId);
    if (match) {
      byId.set(q.questionId, {
        questionId: q.questionId,
        questionText: q.questionText,
        shortAnswer: "Reused",
        answer: match.answer,
        confidenceScore: 95,
        supportingEvidence: `Answer library: "${match.sourceQuestionnaireName}" (${Math.round(match.similarity * 100)}% question match)`,
        policyCitation: "",
        focusArea: match.focusArea || q.category,
      });
    } else {
      remaining.push(q);
    }
  }

  let usedLlm = 0;
  let modelUsed: string | undefined;

  if (remaining.length > 0) {
    let llm: LLMService;
    try {
      llm = new LLMService();
    } catch {
      // No provider configured — remaining questions stay honestly unanswered.
      for (const q of remaining) byId.set(q.questionId, placeholderFor(q));
      return finalize(byId, safeQuestions, false, undefined);
    }

    const clientContext = await gatherClientContext(clientId);

    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE);
      let parsed: z.infer<typeof llmAnswerSchema> | null = null;
      try {
        const response = await llm.generate(
          {
            systemPrompt: "You are a senior compliance analyst answering vendor security questionnaires (CAIQ/SIG style). Answer only from the provided client context. Never fabricate specifics. Respond with the required JSON object.",
            userPrompt: buildBatchPrompt(batch, clientContext),
            jsonMode: true,
            temperature: 0.2,
            maxTokens: 700 * BATCH_SIZE,
          },
          { endpoint: "questionnaire_autoanswer", clientId }
        );

        modelUsed = modelUsed || response.model;
        const payload = extractJsonPayload(typeof response.text === "string" ? response.text : JSON.stringify(response.text));
        if (payload) parsed = llmAnswerSchema.parse(JSON.parse(payload));
      } catch (err: any) {
        console.warn(`[llmAnswer] LLM batch failed (${err?.message}); questions degrade to Needs Review`);
      }

      const answerById = new Map<string, z.infer<typeof llmAnswerSchema>["answers"][number]>();
      if (parsed) {
        for (const a of parsed.answers) answerById.set(a.questionId, a);
      }
      for (const q of batch) {
        const a = answerById.get(q.questionId);
        if (a && a.answer.trim()) {
          usedLlm++;
          byId.set(q.questionId, {
            questionId: q.questionId,
            questionText: q.questionText,
            shortAnswer: a.shortAnswer || "Needs Review",
            answer: a.answer,
            confidenceScore: a.confidenceScore,
            supportingEvidence: a.supportingEvidence || "",
            policyCitation: a.policyCitation || "",
            focusArea: a.focusArea || q.category,
          });
        } else {
          // Missing/malformed entry: honest placeholder, never a fabricated Yes.
          byId.set(q.questionId, placeholderFor(q));
        }
      }
    }
  }

  return finalize(byId, safeQuestions, usedLlm > 0, modelUsed);
}

function finalize(
  byId: Map<string, AnsweredQuestion>,
  all: QuestionnaireQuestion[],
  usedLlm: boolean,
  modelUsed?: string
): LlmAnswerResult {
  const answeredQuestions = all
    .map(q => byId.get(q.questionId))
    .filter((a): a is AnsweredQuestion => !!a);

  const hasLibrary = answeredQuestions.some(a => a.shortAnswer === "Reused");
  const overallConfidence =
    answeredQuestions.length > 0
      ? Math.round(answeredQuestions.reduce((acc, r) => acc + r.confidenceScore, 0) / answeredQuestions.length)
      : 0;

  return {
    answeredQuestions,
    overallConfidence,
    engine: usedLlm ? "llm" : hasLibrary ? "library" : "rules",
    modelUsed,
  };
}
