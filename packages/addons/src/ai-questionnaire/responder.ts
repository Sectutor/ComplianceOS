/**
 * AI Questionnaire Responder — Core Response Engine
 *
 * Takes a list of questionnaire questions and drafts responses by:
 * 1. Looking up past responses from the knowledge base (exact + fuzzy match)
 * 2. Searching relevant policy and control text via LLM extraction
 * 3. Falling back to LLM-generated best-effort answers from client context
 * 4. Scoring confidence and flagging items that need human review
 *
 * Designed to be testable and decoupled from the DB layer:
 * - `knowledgeBase` is an injected object (could be in-memory, DB-backed, or API-driven)
 * - `callLlm` is an injected async function for LLM calls
 */

import {
  QuestionnaireKnowledgeBase,
} from './knowledge-base';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  category?: string;
  framework?: string;
  type: 'yes_no' | 'text' | 'multiple_choice' | 'file_upload';
  options?: string[];
}

export interface DraftResponse {
  questionId: string;
  answer: string;
  confidence: number; // 0–100
  sourceType: 'policy' | 'control' | 'past_response' | 'llm_generated' | 'unanswered';
  sourceReference?: string; // e.g. "Policy: Access Control Policy, Section 3.1"
  needsReview: boolean;
}

export interface DraftOptions {
  /** Minimum confidence (0–100) below which the response is flagged for review */
  confidenceThreshold?: number;
  /** Number of past responses to consider per question */
  pastResponsesLimit?: number;
  /** LLM provider identifier */
  llmProvider?: string;
  /** Client context summary to inject into LLM prompts */
  clientContext?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a question string for comparison / embedding lookup.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple substring / token-overlap similarity (0–1).
 * Used as a lightweight fallback when embedding search is unavailable.
 */
function tokenSimilarity(a: string, b: string): number {
  const aN = normalise(a);
  const bN = normalise(b);
  if (aN === bN) return 1;

  const aTokens = new Set(aN.split(' '));
  const bTokens = new Set(bN.split(' '));
  if (aTokens.size === 0 && bTokens.size === 0) return 1;
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  Array.from(aTokens).forEach(function(t: string) {
    if (bTokens.has(t)) intersection++;
  });

  const union = aTokens.size + bTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildPastResponsePrompt(question: string, entries: Array<{ question: string; answer: string; sourceType: string }>): string {
  const examples = entries
    .map(
      (e, i) =>
        `[Example ${i + 1}] (source: ${e.sourceType})\nQ: ${e.question}\nA: ${e.answer}\n`,
    )
    .join('\n');

  return (
    'You are a compliance questionnaire assistant. Below are past Q&A pairs that are similar to the current question.\n\n' +
    'Past responses:\n' +
    examples +
    '\n' +
    'Based on these past responses, draft an answer for the following question. ' +
    'Keep the answer concise, accurate, and consistent with the past responses.\n\n' +
    `QUESTION: ${question}\n\n` +
    'Draft answer:'
  );
}

function buildPolicyExtractionPrompt(
  question: string,
  policyText: string,
  policyName: string,
): string {
  return (
    'You are a compliance questionnaire assistant. The following text is from ' +
    `"${policyName}". Extract the most relevant portion(s) that could answer the question below. ` +
    'If the text does not contain information relevant to the question, say "NOT FOUND".\n\n' +
    `POLICY TEXT:\n${policyText}\n\n` +
    `QUESTION: ${question}\n\n` +
    'Relevant answer (or "NOT FOUND"):'
  );
}

function buildFallbackPrompt(
  question: string,
  category: string | undefined,
  clientContext: string,
): string {
  return (
    'You are a compliance questionnaire assistant for a security team. ' +
    'Answer the following question based on the client context provided. ' +
    'Be honest — if the context does not contain relevant information, provide a reasonable best-effort answer ' +
    'that a typical organisation in their industry would give, but flag any uncertainty.\n\n' +
    `CLIENT CONTEXT:\n${clientContext}\n\n` +
    (category ? `QUESTION CATEGORY: ${category}\n\n` : '') +
    `QUESTION: ${question}\n\n` +
    'Draft answer:'
  );
}

function buildConfidencePrompt(
  question: string,
  draftAnswer: string,
  sourceType: string,
): string {
  return (
    'Rate the confidence (0–100) that the following draft answer correctly answers the question. ' +
    'Return ONLY a number between 0 and 100.\n\n' +
    `QUESTION: ${question}\n` +
    `DRAFT ANSWER (${sourceType}): ${draftAnswer}\n\n` +
    'Confidence score:'
  );
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Draft responses for a batch of questionnaire questions.
 *
 * @param questions  The questions to answer.
 * @param knowledgeBase  Injected knowledge base for lookups and storage.
 * @param callLlm  Injected LLM caller (prompt → response string).
 * @param options  Thresholds, limits, and client context.
 */
export async function draftResponses(
  questions: QuestionnaireQuestion[],
  knowledgeBase: QuestionnaireKnowledgeBase,
  callLlm: (prompt: string, provider?: string) => Promise<string | null>,
  options: DraftOptions = {},
): Promise<DraftResponse[]> {
  const threshold = options.confidenceThreshold ?? 80;
  const limit = options.pastResponsesLimit ?? 50;
  const provider = options.llmProvider ?? 'deepseek';
  const clientContext = options.clientContext ?? '';

  const results: DraftResponse[] = [];

  for (const q of questions) {
    // 1. Try exact past-response match first
    const similar = await knowledgeBase.findSimilar(q.text, 5, limit);
    const bestExact = similar.find((s) => s.similarity >= 0.95);

    if (bestExact) {
      results.push({
        questionId: q.id,
        answer: bestExact.answer,
        confidence: 95 + Math.round(bestExact.similarity * 5),
        sourceType: 'past_response',
        sourceReference: `Matched past response (${Math.round(bestExact.similarity * 100)}% similar)`,
        needsReview: false,
      });
      continue;
    }

    // 2. Try fuzzy match via LLM using similar past responses
    if (similar.length > 0) {
      const bestFuzzy = similar[0]; // highest similarity
      if (bestFuzzy.similarity >= 0.6) {
        const llmPrompt = buildPastResponsePrompt(q.text, similar.slice(0, 3));
        const llmAnswer = await callLlm(llmPrompt, provider);

        if (llmAnswer) {
          const confidence = Math.round(Math.min(90, bestFuzzy.similarity * 100));
          results.push({
            questionId: q.id,
            answer: llmAnswer,
            confidence,
            sourceType: 'past_response',
            sourceReference: `Adapted from ${similar.length} similar past response(s)`,
            needsReview: confidence < threshold,
          });
          continue;
        }
      }
    }

    // 3. Try extracting from policies
    const policies = await knowledgeBase.getPolicies(3);
    let policyAnswer: string | null = null;
    let policySource: string | undefined;

    for (const policy of policies) {
      const prompt = buildPolicyExtractionPrompt(q.text, policy.content, policy.name);
      const answer = await callLlm(prompt, provider);
      if (answer && answer.trim() !== 'NOT FOUND') {
        policyAnswer = answer;
        policySource = `Policy: ${policy.name}`;
        break;
      }
    }

    if (policyAnswer) {
      results.push({
        questionId: q.id,
        answer: policyAnswer,
        confidence: 75,
        sourceType: 'policy',
        sourceReference: policySource,
        needsReview: true, // policy-derived answers always need review
      });
      continue;
    }

    // 4. Try extracting from controls
    const controls = await knowledgeBase.getControls(5);
    let controlAnswer: string | null = null;
    let controlSource: string | undefined;

    for (const ctrl of controls) {
      const prompt = buildPolicyExtractionPrompt(q.text, ctrl.description, `Control: ${ctrl.code}`);
      const answer = await callLlm(prompt, provider);
      if (answer && answer.trim() !== 'NOT FOUND') {
        controlAnswer = answer;
        controlSource = `Control: ${ctrl.code} — ${ctrl.name}`;
        break;
      }
    }

    if (controlAnswer) {
      results.push({
        questionId: q.id,
        answer: controlAnswer,
        confidence: 70,
        sourceType: 'control',
        sourceReference: controlSource,
        needsReview: true,
      });
      continue;
    }

    // 5. Fallback: LLM-generated best-effort answer
    if (clientContext) {
      const prompt = buildFallbackPrompt(q.text, q.category, clientContext);
      const llmAnswer = await callLlm(prompt, provider);

      if (llmAnswer) {
        // Ask the LLM to self-assess confidence
        let confidence = 50;
        try {
          const confPrompt = buildConfidencePrompt(q.text, llmAnswer, 'llm_generated');
          const confRaw = await callLlm(confPrompt, provider);
          if (confRaw) {
            const parsed = parseInt(confRaw.trim(), 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
              confidence = parsed;
            }
          }
        } catch {
          // keep default confidence
        }

        results.push({
          questionId: q.id,
          answer: llmAnswer,
          confidence,
          sourceType: 'llm_generated',
          sourceReference: undefined,
          needsReview: confidence < threshold,
        });
        continue;
      }
    }

    // 6. No answer could be generated at all
    results.push({
      questionId: q.id,
      answer: '',
      confidence: 0,
      sourceType: 'unanswered',
      sourceReference: undefined,
      needsReview: true,
    });
  }

  return results;
}
