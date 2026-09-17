/**
 * AI Questionnaire Responder — Knowledge Base
 *
 * Stores and retrieves past questionnaire Q&A pairs.
 * Also holds references to client policies and controls that can be
 * searched to derive answers.
 *
 * Designed to work with an injected storage layer so it can be
 * backed by an in-memory store (tests), a local index, or a database.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeBaseEntry {
  id: string;
  question: string;
  answer: string;
  sourceType: 'past_response' | 'policy' | 'control' | 'llm_generated';
  clientId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRecord {
  id: string;
  name: string;
  content: string;
  version: string;
  clientId: number;
}

export interface ControlRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  framework: string;
  clientId: number;
}

export interface SimilarEntry {
  question: string;
  answer: string;
  sourceType: string;
  similarity: number; // 0–1
}

// ---------------------------------------------------------------------------
// Knowledge Base class
// ---------------------------------------------------------------------------

export class QuestionnaireKnowledgeBase {
  private entries: Map<string, KnowledgeBaseEntry> = new Map();
  private policies: Map<string, PolicyRecord> = new Map();
  private controls: Map<string, ControlRecord> = new Map();
  private clientId: number;

  /**
   * @param clientId  The client this knowledge base is scoped to.
   * @param storage   Optional injected storage adapter (defaults to in-memory).
   */
  constructor(
    clientId: number,
    private storage?: {
      loadEntries: (clientId: number) => Promise<KnowledgeBaseEntry[]>;
      saveEntry: (entry: KnowledgeBaseEntry) => Promise<void>;
      loadPolicies: (clientId: number, limit: number) => Promise<PolicyRecord[]>;
      loadControls: (clientId: number, limit: number) => Promise<ControlRecord[]>;
    },
  ) {
    this.clientId = clientId;
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------

  /**
   * Load entries from the injected storage adapter (if any).
   * Call once before using the knowledge base.
   */
  async init(): Promise<void> {
    if (!this.storage) return;

    const [entries, policies, controls] = await Promise.all([
      this.storage.loadEntries(this.clientId),
      this.storage.loadPolicies(this.clientId, 50),
      this.storage.loadControls(this.clientId, 50),
    ]);

    for (const e of entries) {
      this.entries.set(e.id, e);
    }
    for (const p of policies) {
      this.policies.set(p.id, p);
    }
    for (const c of controls) {
      this.controls.set(c.id, c);
    }
  }

  // ------------------------------------------------------------------
  // Store
  // ------------------------------------------------------------------

  /**
   * Store a Q&A pair in the knowledge base.
   * If storage adapter is present, persists it there.
   */
  async storeResponse(
    question: string,
    answer: string,
    sourceType: KnowledgeBaseEntry['sourceType'],
  ): Promise<void> {
    const id = `kb_${this.clientId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const entry: KnowledgeBaseEntry = {
      id,
      question,
      answer,
      sourceType,
      clientId: this.clientId,
      createdAt: now,
      updatedAt: now,
    };

    this.entries.set(id, entry);

    if (this.storage) {
      await this.storage.saveEntry(entry);
    }
  }

  // ------------------------------------------------------------------
  // Retrieval
  // ------------------------------------------------------------------

  /**
   * Find entries whose question text is similar to the given question.
   * Uses token-overlap similarity as a lightweight approach.
   *
   * @param question  The question to match.
   * @param topK      Max number of results.
   * @param limit     Max entries to scan (for performance).
   */
  async findSimilar(
    question: string,
    topK: number = 5,
    limit: number = 50,
  ): Promise<SimilarEntry[]> {
    const allEntries = Array.from(this.entries.values()).slice(0, limit);

    const scored = allEntries
      .map((e) => ({
        question: e.question,
        answer: e.answer,
        sourceType: e.sourceType,
        similarity: this.calculateSimilarity(question, e.question),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
  }

  // ------------------------------------------------------------------
  // Policies & Controls
  // ------------------------------------------------------------------

  /**
   * Return up to `limit` policy records for this client.
   */
  async getPolicies(limit: number = 3): Promise<PolicyRecord[]> {
    if (this.storage) {
      return this.storage.loadPolicies(this.clientId, limit);
    }
    return Array.from(this.policies.values()).slice(0, limit);
  }

  /**
   * Return up to `limit` control records for this client.
   */
  async getControls(limit: number = 5): Promise<ControlRecord[]> {
    if (this.storage) {
      return this.storage.loadControls(this.clientId, limit);
    }
    return Array.from(this.controls.values()).slice(0, limit);
  }

  // ------------------------------------------------------------------
  // Client context builder
  // ------------------------------------------------------------------

  /**
   * Build a human-readable summary of the client's implemented controls,
   * policies, and evidence posture. This is injected into LLM prompts
   * as context when generating fallback answers.
   */
  async buildClientContext(): Promise<string> {
    const policies = await this.getPolicies(10);
    const controls = await this.getControls(10);
    const entries = Array.from(this.entries.values());

    const lines: string[] = [
      `Client ID: ${this.clientId}`,
      `Policies documented: ${policies.length}`,
      `Controls implemented: ${controls.length}`,
      `Past questionnaire responses: ${entries.length}`,
      '',
      '--- Policies ---',
    ];

    for (const p of policies) {
      lines.push(`- ${p.name} (v${p.version})`);
      // Include first 200 chars of each policy as signal
      const snippet = p.content.replace(/\s+/g, ' ').slice(0, 200);
      lines.push(`  ${snippet}...`);
    }

    lines.push('', '--- Controls ---');
    for (const c of controls) {
      lines.push(
        `- [${c.code}] ${c.name} (${c.framework}): ${c.description.slice(0, 150)}`,
      );
    }

    lines.push('', '--- Recent Past Responses ---');
    const recent = entries.slice(-10).reverse();
    for (const r of recent) {
      const qSnippet = r.question.slice(0, 100);
      const aSnippet = r.answer.slice(0, 100);
      lines.push(`- Q: ${qSnippet}...`);
      lines.push(`  A: ${aSnippet}...`);
    }

    return lines.join('\n');
  }

  /**
   * Seed the in-memory knowledge base with initial data.
   * Used by the connector to inject pre-loaded data at runtime.
   */
  seed(entries: KnowledgeBaseEntry[]): void {
    for (const e of entries) {
      this.entries.set(e.id, e);
    }
  }

  seedPolicies(policies: PolicyRecord[]): void {
    for (const p of policies) {
      this.policies.set(p.id, p);
    }
  }

  seedControls(controls: ControlRecord[]): void {
    for (const c of controls) {
      this.controls.set(c.id, c);
    }
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /**
   * Token-overlap similarity between two strings.
   * Scores 1.0 for exact match after normalisation.
   */
  private calculateSimilarity(a: string, b: string): number {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const aN = norm(a);
    const bN = norm(b);

    if (aN === bN) return 1;
    if (aN.length === 0 || bN.length === 0) return 0;

    const aTokens = aN.split(' ');
    const bTokens = bN.split(' ');
    const aSet = new Set(aTokens);
    const bSet = new Set(bTokens);

    let intersection = 0;
    Array.from(aSet).forEach(function(t: string) {
      if (bSet.has(t)) intersection++;
    });

    const union = aSet.size + bSet.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
