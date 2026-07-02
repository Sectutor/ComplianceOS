/**
 * AI Questionnaire Responder — Addon Implementation
 *
 * This addon is typically triggered on-demand when a security questionnaire
 * (SIG, CAIQ, VSA, or custom) is received. It:
 *
 * 1. Accepts a parsed set of questions (via settings or API trigger)
 * 2. Loads the knowledge base with past responses, policies, and controls
 * 3. Drafts responses using the responder engine + LLM
 * 4. Returns draft responses, confidence scores, and review flags
 *
 * The real processing happens via the UI/API trigger — the scheduled handler
 * primarily validates settings and configuration.
 */

import { AddonExecutor } from '../runtime/executor';
import { FindingsPusher } from '../runtime/pusher';
import type { AddonRunConfig, NormalizedFinding } from '../shared/types';
import { QuestionnaireKnowledgeBase } from './knowledge-base';
import { draftResponses, type QuestionnaireQuestion } from './responder';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface AiQuestionnaireSettings {
  llmProvider: 'deepseek' | 'qwen' | 'openai';
  autoRespond: boolean;
  confidenceThreshold: number;
  pastResponsesLimit: number;
}

export function defaultAiQuestionnaireSettings(): AiQuestionnaireSettings {
  return {
    llmProvider: 'deepseek',
    autoRespond: false,
    confidenceThreshold: 80,
    pastResponsesLimit: 50,
  };
}

// ---------------------------------------------------------------------------
// Addon handler
// ---------------------------------------------------------------------------

/**
 * Register the ai-questionnaire addon handler with the executor.
 * Called once at application startup.
 */
export function registerAiQuestionnaire(
  executor: AddonExecutor,
  pusher: FindingsPusher,
): void {
  executor.register('ai-questionnaire', async (config: AddonRunConfig) => {
    const settings = config.settings as unknown as AiQuestionnaireSettings;
    const startTime = Date.now();

    console.log(
      '[AiQuestionnaire] Triggered for client ' + config.clientId,
    );

    // Get DB adapter from executor (injected by core app at registration time)
    const db = (executor as any).db;
    if (!db) {
      throw new Error(
        'No database adapter available. The AI Questionnaire Responder requires a DbAdapter to be set on the executor.',
      );
    }

    // ---------- Knowledge Base ----------
    const knowledgeBase = new QuestionnaireKnowledgeBase(
      config.clientId,
      {
        loadEntries: async (clientId: number) => {
          const rows = await db.query(
            'SELECT * FROM questionnaire_responses WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2',
            [clientId, settings.pastResponsesLimit ?? 50],
          );
          return rows.map((r: any) => ({
            id: String(r.id),
            question: r.question_text,
            answer: r.answer_text,
            sourceType: r.source_type ?? 'past_response',
            clientId: r.client_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        },
        saveEntry: async (entry: any) => {
          await db.execute(
            'INSERT INTO questionnaire_responses (id, client_id, question_text, answer_text, source_type, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              entry.id,
              entry.clientId,
              entry.question,
              entry.answer,
              entry.sourceType,
              entry.createdAt,
              entry.updatedAt,
            ],
          );
        },
        loadPolicies: async (clientId: number, limit: number) => {
          const rows = await db.query(
            'SELECT * FROM policies WHERE client_id = $1 ORDER BY updated_at DESC LIMIT $2',
            [clientId, limit],
          );
          return rows.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            content: r.content ?? '',
            version: r.version ?? '1.0',
            clientId: r.client_id,
          }));
        },
        loadControls: async (clientId: number, limit: number) => {
          const rows = await db.query(
            `SELECT cc.id, c.code, c.name, c.description, f.slug as framework, cc.client_id
             FROM client_controls cc
             JOIN controls c ON c.id = cc.control_id
             LEFT JOIN frameworks f ON f.id = c.framework_id
             WHERE cc.client_id = $1
             ORDER BY cc.updated_at DESC LIMIT $2`,
            [clientId, limit],
          );
          return rows.map((r: any) => ({
            id: String(r.id),
            code: r.code,
            name: r.name,
            description: r.description ?? '',
            framework: r.framework ?? '',
            clientId: r.client_id,
          }));
        },
      },
    );

    await knowledgeBase.init();

    // Build client context for LLM fallback
    const clientContext = await knowledgeBase.buildClientContext();

    // ---------- Parse questions from config ----------
    // Questions can be passed via settings when triggered from the API/UI.
    // For scheduled runs with no questions, this is a no-op.
    const rawQuestions = (config.settings as any).questions as
      | QuestionnaireQuestion[]
      | undefined;

    if (!rawQuestions || rawQuestions.length === 0) {
      console.log(
        '[AiQuestionnaire] No questions provided in settings. Skipping. ' +
          'Trigger this addon via the API/UI with a questionnaire payload.',
      );
      return {
        findings: [],
        summary: { total: 0, passed: 0, failed: 0, errors: 0 },
        evidenceArtifacts: [],
        durationSeconds: 0,
      };
    }

    // ---------- Draft responses ----------
    const callLlm = async (prompt: string, provider?: string): Promise<string | null> => {
      const { llmBridge } = await import('../shared/llm-bridge');
      return llmBridge.generateText(prompt, {
        systemPrompt: 'You are a security questionnaire response assistant. Answer based on the provided policy, control, and past response context. Be accurate and concise.',
        provider,
      });
    };

    const draftResults = await draftResponses(
      rawQuestions,
      knowledgeBase,
      callLlm,
      {
        confidenceThreshold: settings.confidenceThreshold ?? 80,
        pastResponsesLimit: settings.pastResponsesLimit ?? 50,
        llmProvider: settings.llmProvider ?? 'deepseek',
        clientContext,
      },
    );

    // ---------- Store and push results ----------
    const findings: NormalizedFinding[] = [];
    let needsReviewCount = 0;
    let autoRespondCount = 0;

    for (const dr of draftResults) {
      // Persist each drafted response in the knowledge base
      await knowledgeBase.storeResponse(
        rawQuestions.find((q) => q.id === dr.questionId)?.text ?? '',
        dr.answer,
        dr.sourceType === 'unanswered' ? 'llm_generated' : dr.sourceType,
      );

      if (dr.needsReview) {
        needsReviewCount++;
      }

      if (dr.sourceType !== 'unanswered') {
        autoRespondCount++;
      }

      findings.push({
        title: `Questionnaire Response: ${dr.questionId}`,
        severity: dr.needsReview ? 'medium' : 'info',
        description:
          `[${dr.sourceType}] ${dr.answer.slice(0, 200)}` +
          (dr.sourceReference ? ` (${dr.sourceReference})` : ''),
        frameworkMappings: [],
        resourceId: dr.questionId,
        remediation: dr.needsReview
          ? 'This response needs human review before submission.'
          : undefined,
        rawEvidence: {
          questionId: dr.questionId,
          answer: dr.answer,
          confidence: dr.confidence,
          sourceType: dr.sourceType,
          sourceReference: dr.sourceReference,
          needsReview: dr.needsReview,
        },
      });
    }

    // Push a summary evidence artifact
    pusher.pushEvidence({
      clientId: config.clientId,
      title:
        'AI Questionnaire Response Draft - ' + new Date().toISOString().split('T')[0],
      artifactType: 'questionnaire_draft',
      artifactData: {
        totalQuestions: rawQuestions.length,
        answered: draftResults.filter((r) => r.sourceType !== 'unanswered').length,
        unanswered: draftResults.filter((r) => r.sourceType === 'unanswered').length,
        needsReview: needsReviewCount,
        autoRespondReady:
          draftResults.filter(
            (r) => r.confidence >= (settings.confidenceThreshold ?? 80) && !r.needsReview,
          ).length,
        llmProvider: settings.llmProvider,
        confidenceThreshold: settings.confidenceThreshold,
        draftedAt: new Date().toISOString(),
        responses: draftResults.map((r) => ({
          questionId: r.questionId,
          confidence: r.confidence,
          sourceType: r.sourceType,
          needsReview: r.needsReview,
        })),
      },
      source: 'ai-questionnaire',
    });

    await pusher.flush();

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log(
      '[AiQuestionnaire] Completed for client ' + config.clientId + '. ' +
      'Questions: ' + rawQuestions.length + ', ' +
      'Answered: ' + autoRespondCount + ', ' +
      'Needs review: ' + needsReviewCount + ', ' +
      'Duration: ' + elapsed + 's',
    );

    return {
      findings,
      summary: {
        total: rawQuestions.length,
        passed: autoRespondCount,
        failed: needsReviewCount,
        errors: draftResults.filter((r) => r.sourceType === 'unanswered').length,
      },
      evidenceArtifacts: [
        {
          type: 'questionnaire_draft',
          data: {
            clientId: config.clientId,
            totalQuestions: rawQuestions.length,
            answered: draftResults.filter((r) => r.sourceType !== 'unanswered').length,
            unanswered: draftResults.filter((r) => r.sourceType === 'unanswered').length,
            needsReview: needsReviewCount,
            draftedAt: new Date().toISOString(),
          },
        },
      ],
      durationSeconds: elapsed,
    };
  });
}
