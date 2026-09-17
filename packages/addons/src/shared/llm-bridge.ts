/**
 * LLM Bridge — Connects addon system to the core LLMService.
 *
 * Addons don't import core directly (they're in a separate package).
 * Instead, the core app injects the LLM bridge at startup.
 */

export interface LlmBridgeInterface {
  initialize(service: { complete: (req: any) => Promise<any> }): void;
  isAvailable(): boolean;
  generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      provider?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    }
  ): Promise<string | null>;
  generateJson<T>(
    prompt: string,
    options?: { systemPrompt?: string; provider?: string }
  ): Promise<T | null>;
}

class LlmBridgeImpl implements LlmBridgeInterface {
  private service: { complete: (req: any) => Promise<any> } | null = null;

  /** Called once at app startup by the core app */
  initialize(service: { complete: (req: any) => Promise<any> }): void {
    this.service = service;
  }

  isAvailable(): boolean {
    return this.service !== null;
  }

  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      provider?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    }
  ): Promise<string | null> {
    if (!this.service) {
      console.warn('[LlmBridge] LLMService not initialized — returning null');
      return null;
    }
    try {
      const response = await this.service.complete({
        userPrompt: prompt,
        systemPrompt: options?.systemPrompt,
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 2048,
        jsonMode: options?.jsonMode ?? false,
        feature: 'addon',
      });
      return response.text;
    } catch (error) {
      console.error('[LlmBridge] LLM call failed:', error);
      return null;
    }
  }

  async generateJson<T>(
    prompt: string,
    options?: { systemPrompt?: string; provider?: string }
  ): Promise<T | null> {
    const text = await this.generateText(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.1,
    });
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      console.warn('[LlmBridge] Failed to parse LLM JSON response');
      return null;
    }
  }
}

/** Singleton instance */
export const llmBridge = new LlmBridgeImpl();
