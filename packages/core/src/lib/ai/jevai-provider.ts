/**
 * JevAI Provider Adapter
 *
 * Wraps the JevAI (TypeSafe AI) `decide()` API with structured modes:
 *   - classifier: Categorize input into predefined labels with confidence
 *   - router:     Decide which workflow/path an input should go down
 *   - scorer:     Rate/rank inputs on a scale with explanations
 *   - extractor:  Pull structured data from unstructured input
 *
 * This adapter is privacy-aware: it should only be called through
 * the privacy gatekeeper, never directly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JevMode = "classifier" | "router" | "scorer" | "extractor";

export interface JevClassifierResult {
  label: string;
  confidence: number; // 0-100
  alternatives: Array<{ label: string; confidence: number }>;
}

export interface JevRouterResult {
  path: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ path: string; confidence: number }>;
}

export interface JevScorerResult {
  score: number; // 0-100
  label: string;
  confidence: number;
  reasoning: string;
  factors: Array<{ name: string; impact: "positive" | "negative" | "neutral"; weight: number }>;
}

export interface JevExtractorResult {
  extracted: Record<string, any>;
  confidence: number;
  missingFields: string[];
}

export interface JevApiKeyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider class
// ─────────────────────────────────────────────────────────────────────────────

export class JevAiProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: JevApiKeyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.model = config.model;
  }

  // ─── Classifier ──────────────────────────────────────────────────────────

  async classify(
    input: string,
    labels: string[],
    context?: string
  ): Promise<JevClassifierResult> {
    const response = await this.callApi({
      mode: "classifier",
      input,
      labels,
      context,
    });

    return {
      label: response.prediction?.label || labels[0],
      confidence: response.prediction?.confidence ?? 50,
      alternatives: response.prediction?.alternatives || [],
    };
  }

  // ─── Router ──────────────────────────────────────────────────────────────

  async route(
    input: string,
    paths: Array<{ id: string; description: string }>,
    context?: string
  ): Promise<JevRouterResult> {
    const response = await this.callApi({
      mode: "router",
      input,
      paths,
      context,
    });

    return {
      path: response.prediction?.path || paths[0]?.id || "default",
      confidence: response.prediction?.confidence ?? 50,
      reasoning: response.prediction?.reasoning || "",
      alternatives: response.prediction?.alternatives || [],
    };
  }

  // ─── Scorer ──────────────────────────────────────────────────────────────

  async score(
    input: string,
    criteria: Array<{ id: string; description: string; weight?: number }>,
    scale: { min: number; max: number; labels: string[] },
    context?: string
  ): Promise<JevScorerResult> {
    const response = await this.callApi({
      mode: "scorer",
      input,
      criteria,
      scale,
      context,
    });

    const score = response.prediction?.score ?? scale.min;
    const normalizedScore = ((score - scale.min) / (scale.max - scale.min)) * 100;

    return {
      score: Math.round(normalizedScore),
      label: this.scoreToLabel(normalizedScore, scale.labels),
      confidence: response.prediction?.confidence ?? 50,
      reasoning: response.prediction?.reasoning || "",
      factors: response.prediction?.factors || [],
    };
  }

  // ─── Extractor ───────────────────────────────────────────────────────────

  async extract(
    input: string,
    schema: Record<string, { type: string; description: string; required?: boolean }>,
    context?: string
  ): Promise<JevExtractorResult> {
    const response = await this.callApi({
      mode: "extractor",
      input,
      schema,
      context,
    });

    const extracted = response.prediction?.extracted || {};
    const requiredFields = Object.entries(schema)
      .filter(([_, def]) => def.required)
      .map(([key]) => key);
    const missingFields = requiredFields.filter((f) => extracted[f] === undefined);

    return {
      extracted,
      confidence: response.prediction?.confidence ?? 50,
      missingFields,
    };
  }

  // ─── Raw API call ────────────────────────────────────────────────────────

  private async callApi(payload: Record<string, any>): Promise<any> {
    const url = `${this.baseUrl}/v1/decide`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Jev-Model": this.model,
      },
      body: JSON.stringify({
        model: this.model,
        ...payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`JevAI API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    return response.json();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private scoreToLabel(score: number, labels: string[]): string {
    if (labels.length === 0) return String(score);
    const step = 100 / labels.length;
    const index = Math.min(Math.floor(score / step), labels.length - 1);
    return labels[index];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory — create from gatekeeper config
// ─────────────────────────────────────────────────────────────────────────────

export function createJevAiProvider(config: JevApiKeyConfig | undefined): JevAiProvider | null {
  if (!config || !config.apiKey) return null;
  return new JevAiProvider(config);
}
