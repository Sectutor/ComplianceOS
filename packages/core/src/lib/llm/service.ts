/**
 * Enhanced LLM Service with Multi-Provider Support
 * Supports OpenAI, Anthropic, Google Gemini, and OpenAI-compatible APIs
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { getDb } from '../../db';
import { decrypt, encrypt } from '../crypto';
import { LLMProvider, llmProviders, aiUsageMetrics, llmRouterRules } from '../../schema';
import { desc, eq, and } from 'drizzle-orm';
import { logger } from '../logger';

// GLOBAL FIX: Force OpenAI to recognize this as a server environment
if (typeof globalThis !== 'undefined') {
    (globalThis as any).process = (globalThis as any).process || {};
    (globalThis as any).process.browser = false;
}

export interface CompletionRequest {
    systemPrompt?: string;
    userPrompt: string;
    /** Optional conversation history for multi-turn chat. Each entry is { role, content }. */
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean; // Enable JSON output mode
    schema?: z.ZodSchema; // Zod schema for structured output validation
    feature?: string; // Feature definition for routing (e.g. 'risk_analysis')
}

export interface CompletionResponse {
    text: string;
    provider: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface UsageMetadata {
    clientId?: number;
    userId?: number;
    endpoint: string;
}

export class LLMService {
    // Cache for provider configuration ( TTL: 5 minutes)
    private static providerCache: { providers: LLMProvider[]; timestamp: number } | null = null;
    private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    // Execution Mode: 'hybrid' (default) | 'local_only' (air-gapped) | 'cloud_only'
    private static executionMode: 'hybrid' | 'local_only' | 'cloud_only' = 'hybrid';

    public static setExecutionMode(mode: 'hybrid' | 'local_only' | 'cloud_only'): void {
        LLMService.executionMode = mode;
        LLMService.clearCache();
        console.log(`[LLMService] Execution mode set to: ${mode}`);
    }

    public static getExecutionMode(): 'hybrid' | 'local_only' | 'cloud_only' {
        return LLMService.executionMode;
    }

    public static isLocalProvider(provider: LLMProvider | { provider: string; baseUrl?: string | null }): boolean {
        const pType = (provider.provider || '').toLowerCase();
        if (['ollama', 'lmstudio', 'vllm', 'localai'].includes(pType)) return true;
        const url = (provider.baseUrl || '').toLowerCase();
        return url.includes('localhost') || url.includes('127.0.0.1') || url.includes(':11434') || url.includes(':1234') || url.includes(':8000') || url.includes(':8080') || url.includes('.internal') || url.includes('.local');
    }

    /**
     * Universal sanitizer for cleaning chain-of-thought traces, thinking blocks, and preambles
     */
    public static cleanResponseText(raw: string): string {
        if (!raw) return "";
        let text = raw;
        // 1. Remove XML/HTML thinking tags
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
        
        // 2. Extract actual draft content if wrapped in meta-analysis
        if (text.includes("Draft:") || text.includes("Draft -") || text.includes("Draft 1:")) {
            const draftParts = text.split(/Draft(?:\s*-\s*Paragraph\s*\d*:?|\s*\d*:?|:)\s*/i);
            if (draftParts.length > 1) {
                text = draftParts.slice(1).join('\n\n');
            }
        }

        // 3. Remove "Here's a thinking process:" and similar lead-in chatter
        text = text.replace(/^Here('s| is) a thinking process:?[\s\S]*?\n\n/i, '');
        text = text.replace(/^\*\*Thinking Process:\*\*[\s\S]*?\n\n/gi, '');
        text = text.replace(/^Thinking Process:[\s\S]*?\n\n/gi, '');
        text = text.replace(/^Here('s| is) (the|a) (draft|response|summary|conclusion|output):?\s*/i, '');
        
        // 4. Remove leftover raw prompt artifact bullets
        text = text.replace(/\*\*\d+\.\s*[^:]+:\*\*/g, '');
        text = text.replace(/^["']|["']$/g, '');
        return text.trim();
    }

    /**
     * Get the configured provider for a feature, or fallback to highest priority
     */
    private async getProviders(feature?: string): Promise<LLMProvider[]> {
        // Check cache first
        const now = Date.now();
        if (LLMService.providerCache &&
            (now - LLMService.providerCache.timestamp) < LLMService.CACHE_TTL_MS) {
            console.log('[LLMService] Using cached providers');
            return LLMService.filterByExecutionMode(LLMService.providerCache.providers);
        }

        const db = await getDb();
        if (!db) return [];

        const providers: LLMProvider[] = [];

        // 1. Try to find a specific rule for this feature
        if (feature) {
            const rule = await db.select({
                provider: llmProviders
            })
                .from(llmRouterRules)
                .innerJoin(llmProviders, eq(llmRouterRules.providerId, llmProviders.id))
                .where(and(
                    eq(llmRouterRules.feature, feature),
                    eq(llmProviders.isEnabled, true)
                ))
                .limit(1);

            if (rule.length > 0) {
                providers.push(rule[0].provider);
            }
        }

        // 2. Fallback to highest priority enabled provider
        const allProviders = await db.select()
            .from(llmProviders)
            .where(eq(llmProviders.isEnabled, true))
            .orderBy(desc(llmProviders.priority));

        // Add remaining providers (avoid duplicates)
        for (const p of allProviders) {
            if (!providers.find(existing => existing.id === p.id)) {
                providers.push(p);
            }
        }

        // 3. Check environment variables if no valid DB providers exist
        const hasLiveProvider = providers.some(p => !this.isPlaceholderKey(p.apiKey));
        if (!hasLiveProvider) {
            if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('placeholder')) {
                providers.unshift({
                    id: 9990,
                    name: 'OpenRouter (Live Env)',
                    provider: 'openrouter',
                    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
                    baseUrl: 'https://openrouter.ai/api/v1',
                    apiKey: encrypt(process.env.OPENROUTER_API_KEY),
                    isEnabled: true,
                    priority: 101,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
            if (process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes('placeholder')) {
                providers.unshift({
                    id: 9991,
                    name: 'DeepSeek (Live Env)',
                    provider: 'deepseek',
                    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
                    baseUrl: 'https://api.deepseek.com',
                    apiKey: encrypt(process.env.DEEPSEEK_API_KEY),
                    isEnabled: true,
                    priority: 100,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
            if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')) {
                providers.unshift({
                    id: 9992,
                    name: 'OpenAI (Live Env)',
                    provider: 'openai',
                    model: process.env.OPENAI_MODEL || 'gpt-4o',
                    baseUrl: process.env.OPENAI_BASE_URL || null,
                    apiKey: encrypt(process.env.OPENAI_API_KEY),
                    isEnabled: true,
                    priority: 99,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
            if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('placeholder')) {
                providers.unshift({
                    id: 9993,
                    name: 'Anthropic (Live Env)',
                    provider: 'anthropic',
                    model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
                    baseUrl: null,
                    apiKey: encrypt(process.env.ANTHROPIC_API_KEY),
                    isEnabled: true,
                    priority: 98,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
            if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('placeholder')) {
                providers.unshift({
                    id: 9994,
                    name: 'Gemini (Live Env)',
                    provider: 'gemini',
                    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
                    baseUrl: null,
                    apiKey: encrypt(process.env.GEMINI_API_KEY),
                    isEnabled: true,
                    priority: 97,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
        }

        // Update cache
        LLMService.providerCache = { providers, timestamp: now };

        return LLMService.filterByExecutionMode(providers);
    }

    private static filterByExecutionMode(providers: LLMProvider[]): LLMProvider[] {
        if (LLMService.executionMode === 'local_only') {
            const localOnly = providers.filter(p => LLMService.isLocalProvider(p));
            if (localOnly.length === 0) {
                console.warn('[LLMService] Air-Gapped Sovereign Mode is active, but no local LLM providers are configured.');
            }
            return localOnly;
        }

        if (LLMService.executionMode === 'cloud_only') {
            return providers.filter(p => !LLMService.isLocalProvider(p));
        }

        // Hybrid mode (default): use prioritized order (local or cloud)
        return providers;
    }

    /**
     * Clear the provider cache (useful when providers are updated)
     */
    public static clearCache(): void {
        LLMService.providerCache = null;
    }

    /**
     * Demo setups seed provider rows with placeholder API keys that can never
     * authenticate. Detect them so we fail fast with an actionable message
     * instead of burning provider round-trips on guaranteed 401s.
     */
    private isPlaceholderKey(apiKey: string | null | undefined): boolean {
        const k = (apiKey || '').trim();
        return !k || k.startsWith('enc:demo-') || k.includes('demo-placeholder');
    }

    /**
     * Track AI usage metrics
     */
    private async trackUsage(
        provider: LLMProvider,
        usage: CompletionResponse['usage'],
        metadata: UsageMetadata,
        latencyMs: number,
        success: boolean,
        errorMessage?: string
    ): Promise<void> {
        const db = await getDb();
        if (!db || !usage) return;

        try {
            // Calculate estimated cost (simplified pricing)
            const costPerMToken = this.getCostPerMToken(provider.provider, provider.model);
            const estimatedCostCents = Math.ceil(
                (usage.totalTokens / 1000000) * costPerMToken * 100
            );

            await db.insert(aiUsageMetrics).values({
                clientId: metadata.clientId,
                userId: metadata.userId,
                endpoint: metadata.endpoint,
                provider: provider.provider,
                model: provider.model,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                estimatedCostCents,
                latencyMs,
                success,
                errorMessage,
                requestMetadata: metadata as any,
            });
        } catch (error: any) {
            logger.error({ message: 'Failed to track AI usage', error: error.message });
        }
    }

    /**
     * Get cost per million tokens (simplified pricing)
     */
    private getCostPerMToken(provider: string, model: string): number {
        const pricing: Record<string, number> = {
            'gpt-4': 30,
            'gpt-4-turbo': 10,
            'gpt-3.5-turbo': 0.5,
            'claude-3-opus': 15,
            'claude-3-sonnet': 3,
            'claude-3-haiku': 0.25,
            'gemini-pro': 0.5,
            'gemini-1.5-pro': 3.5,
        };

        const key = model.toLowerCase();
        for (const [modelPrefix, cost] of Object.entries(pricing)) {
            if (key.includes(modelPrefix)) return cost;
        }

        return 1; // Default fallback
    }

    /**
     * Create OpenAI client (supports OpenAI and compatible APIs)
     */
    private getOpenAIClient(provider: LLMProvider): OpenAI {
        const apiKey = decrypt(provider.apiKey);

        // CLOAKING: Temporarily hide browser polyfills from OpenAI's environment check
        const g = global as any;
        const oldWindow = g.window;
        const oldLocation = g.location;
        const oldDocument = g.document;

        console.log(`- window: ${typeof oldWindow}, location: ${typeof oldLocation}, document: ${typeof oldDocument}`);

        try {
            // Unset globals that trigger "isBrowser" checks in OpenAI SDK
            if (g.window) delete (global as any).window;
            if (g.location) delete (global as any).location;
            if (g.document) delete (global as any).document;

            const config: any = {
                apiKey,
                dangerouslyAllowBrowser: true, // Double-down on security override
                maxRetries: 3,
                timeout: 60000 // 60s timeout - reduced from 180s for faster failure detection
            };

            if (provider.baseUrl) {
                config.baseURL = provider.baseUrl;
            } else if (provider.provider === 'ollama') {
                config.baseURL = 'http://127.0.0.1:11434/v1';
            } else if (provider.provider === 'lmstudio') {
                config.baseURL = 'http://127.0.0.1:1234/v1';
            } else if (provider.provider === 'vllm') {
                config.baseURL = 'http://127.0.0.1:8000/v1';
            } else if (provider.provider === 'localai') {
                config.baseURL = 'http://127.0.0.1:8080/v1';
            } else if (provider.provider === 'deepseek') {
                config.baseURL = 'https://api.deepseek.com';
            } else if (provider.provider === 'openrouter') {
                config.baseURL = 'https://openrouter.ai/api/v1';
            } else if (provider.provider === 'qwen') {
                config.baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
            }

            const client = new OpenAI(config);
            return client;
        } finally {
            // RESTORE: Put polyfills back for PDF/Word generation libraries
            if (oldWindow) (global as any).window = oldWindow;
            if (oldLocation) (global as any).location = oldLocation;
            if (oldDocument) (global as any).document = oldDocument;
        }
    }

    /**
     * Create Anthropic client
     */
    private getAnthropicClient(provider: LLMProvider): Anthropic {
        const apiKey = decrypt(provider.apiKey);

        // PDF/Word generation libraries polyfill window/document in this
        // Node process, which makes the SDK think it is running in a browser
        // and refuse to construct. Hide the polyfills while instantiating.
        const g = global as any;
        const oldWindow = g.window;
        const oldLocation = g.location;
        const oldDocument = g.document;
        try {
            if (g.window) delete g.window;
            if (g.location) delete g.location;
            if (g.document) delete g.document;
            return new Anthropic({ apiKey, timeout: 180000, dangerouslyAllowBrowser: true });
        } finally {
            if (oldWindow) g.window = oldWindow;
            if (oldLocation) g.location = oldLocation;
            if (oldDocument) g.document = oldDocument;
        }
    }

    /**
     * Create Google Gemini client
     */
    private getGeminiClient(provider: LLMProvider): GoogleGenerativeAI {
        const apiKey = decrypt(provider.apiKey);
        return new GoogleGenerativeAI(apiKey);
    }

    /**
     * Generate text completion with multi-provider support
     */
    async generate(
        request: CompletionRequest,
        metadata: UsageMetadata = { endpoint: 'generate' }
    ): Promise<CompletionResponse> {
        const overallStart = Date.now();
        const providers = await this.getProviders(request.feature);
        console.log(`[LLMService] Found ${providers.length} providers. Priority order:`, providers.map(p => p.name).join(', '));

        if (providers.length === 0) {
            console.error('[LLMService] No LLM providers configured in the database');
            throw new Error("No LLM provider configured. Please go to Settings > AI Providers and configure at least one LLM provider (OpenAI, Anthropic, or Gemini).");
        }

        const startTime = Date.now();
        let lastError: Error | undefined;
        let placeholderCount = 0;

        for (const provider of providers) {
            const providerStart = Date.now();
            try {
                if (this.isPlaceholderKey(decrypt(provider.apiKey))) {
                    placeholderCount++;
                    console.warn(`[LLMService] Provider ${provider.name} uses a demo placeholder API key - skipping`);
                    lastError = new Error(
                        `Provider "${provider.name}" has a demo placeholder API key. Add a real API key in Settings > AI Providers.`
                    );
                    continue;
                }

                let response: CompletionResponse;

                switch (provider.provider) {
                    case 'anthropic':
                        response = await this.generateAnthropic(provider, request);
                        break;
                    case 'gemini':
                        response = await this.generateGemini(provider, request);
                        break;
                    case 'openai':
                    case 'deepseek':
                    case 'openrouter':
                    case 'custom':
                    default:
                        response = await this.generateOpenAI(provider, request);
                        break;
                }

                const providerLatency = Date.now() - providerStart;
                console.log(`[LLMService] Provider ${provider.name} (${provider.model}) succeeded in ${providerLatency}ms. Response text length: ${response.text.length}`);

                // Validate structured output if schema provided
                if (request.schema && request.jsonMode) {
                    try {
                        const parsed = JSON.parse(response.text);
                        request.schema.parse(parsed);
                    } catch (error: any) {
                        logger.warn({ message: `Structured output validation failed (${provider.name})`, error: error.message });
                        // Continue anyway failure here is not provider failure
                    }
                }

                // Clean thinking tokens / meta-commentary from response text
                response.text = LLMService.cleanResponseText(response.text);

                const latencyMs = Date.now() - startTime;
                await this.trackUsage(provider, response.usage, metadata, latencyMs, true);

                return response;

            } catch (error: any) {
                const latencyMs = Date.now() - startTime;
                await this.trackUsage(
                    provider,
                    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    metadata,
                    latencyMs,
                    false,
                    error.message
                );

                console.warn(`[LLM] Provider ${provider.name} failed after ${latencyMs}ms:`, {
                    message: error.message,
                    stack: error.stack?.split('\n').slice(0, 3).join('\n')
                });
                lastError = error;
                // Continue to next provider
            }
        }

        // If we get here, all providers failed
        logger.error({ message: "All LLM providers failed", error: lastError?.message });
        const overallLatency = Date.now() - overallStart;
        console.log(`[LLMService] All providers failed after ${overallLatency}ms`);
        if (placeholderCount > 0 && placeholderCount === providers.length) {
            throw new Error(
                'AI features are not configured yet: the enabled AI providers use demo placeholder API keys. ' +
                'Add a real API key (OpenAI, Anthropic, or Gemini) under Settings > AI Providers, then try again.'
            );
        }
        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }

    /**
     * Generate using OpenAI or compatible API
     */
    private async generateOpenAI(
        provider: LLMProvider,
        request: CompletionRequest
    ): Promise<CompletionResponse> {
        const client = this.getOpenAIClient(provider);

        const messages: any[] = [
            { role: 'system', content: request.systemPrompt || 'You are a helpful compliance assistant.' },
            // Inject conversation history for multi-turn context
            ...(request.messages || []).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: request.userPrompt }
        ];

        const params: any = {
            model: provider.model,
            messages,
            temperature: request.temperature ?? 0.7,
        };

        if (request.maxTokens) params.max_tokens = request.maxTokens;
        if (request.jsonMode) params.response_format = { type: 'json_object' };

        // Cloak globals during request execution so OpenAI SDK fetch call does not detect browser environment
        const g = global as any;
        const oldWindow = g.window;
        const oldLocation = g.location;
        const oldDocument = g.document;

        let completion: any;
        let actualModel = provider.model;
        const candidateModels = provider.provider === 'openrouter'
            ? [provider.model, 'openrouter/free', 'nvidia/nemotron-3-super-120b-a12b:free', 'liquid/lfm-2.5-2.6b:free'].filter((m, i, a) => !!m && a.indexOf(m) === i)
            : [provider.model];

        let lastOpenAIError: any;
        for (const modelName of candidateModels) {
            params.model = modelName;
            try {
                if (g.window) delete (global as any).window;
                if (g.location) delete (global as any).location;
                if (g.document) delete (global as any).document;
                completion = await client.chat.completions.create(params);
                actualModel = modelName;
                break;
            } catch (err: any) {
                lastOpenAIError = err;
                const errStr = (err?.message || '') + ' ' + (err?.status || '');
                const isRateLimitOrNotFound = errStr.includes('429') || errStr.includes('404') || errStr.includes('Rate limit') || errStr.includes('unavailable');
                if (candidateModels.length > 1 && isRateLimitOrNotFound && modelName !== candidateModels[candidateModels.length - 1]) {
                    console.warn(`[LLMService] Model ${modelName} on ${provider.name} failed (${err.message}). Retrying with fallback model...`);
                    continue;
                }
                throw err;
            } finally {
                if (oldWindow) (global as any).window = oldWindow;
                if (oldLocation) (global as any).location = oldLocation;
                if (oldDocument) (global as any).document = oldDocument;
            }
        }

        if (!completion && lastOpenAIError) {
            throw lastOpenAIError;
        }

        // Validate response is not empty
        const text = completion?.choices?.[0]?.message?.content;
        if (!text || text.trim().length === 0) {
            console.error(`[LLMService] Empty response from ${provider.name}`);
            throw new Error(`Empty response from LLM provider ${provider.name}. Please try again or use a different provider.`);
        }

        return {
            text,
            provider: provider.provider,
            model: actualModel,
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            }
        };
    }

    /**
     * Generate using Anthropic Claude
     */
    private async generateAnthropic(
        provider: LLMProvider,
        request: CompletionRequest
    ): Promise<CompletionResponse> {
        const client = this.getAnthropicClient(provider);

        const params: any = {
            model: provider.model,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
            messages: [
                // Inject conversation history for multi-turn context
                ...(request.messages || []).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: request.userPrompt }
            ],
        };

        if (request.systemPrompt) {
            params.system = request.systemPrompt;
        }

        // Cloak globals during request execution so Anthropic SDK fetch call does not detect browser environment
        const g = global as any;
        const oldWindow = g.window;
        const oldLocation = g.location;
        const oldDocument = g.document;

        let completion: any;
        try {
            if (g.window) delete g.window;
            if (g.location) delete g.location;
            if (g.document) delete g.document;
            completion = await client.messages.create(params);
        } finally {
            if (oldWindow) g.window = oldWindow;
            if (oldLocation) g.location = oldLocation;
            if (oldDocument) g.document = oldDocument;
        }

        const text = completion.content
            .filter(block => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

        return {
            text,
            provider: provider.provider,
            model: provider.model,
            usage: {
                promptTokens: completion.usage.input_tokens,
                completionTokens: completion.usage.output_tokens,
                totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
            }
        };
    }

    /**
     * Generate using Google Gemini
     */
    private async generateGemini(
        provider: LLMProvider,
        request: CompletionRequest
    ): Promise<CompletionResponse> {
        const client = this.getGeminiClient(provider);
        const model = client.getGenerativeModel({ model: provider.model });

        // Build history turns as formatted text since this SDK uses a single prompt
        const historyText = (request.messages || [])
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');

        const prompt = request.systemPrompt
            ? `${request.systemPrompt}\n\n${historyText ? historyText + '\n' : ''}User: ${request.userPrompt}`
            : `${historyText ? historyText + '\n' : ''}User: ${request.userPrompt}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens || 2048,
            },
        });

        const response = result.response;
        const text = response.text();

        // Gemini doesn't provide detailed token usage in all cases
        const estimatedTokens = Math.ceil(text.length / 4);

        return {
            text,
            provider: provider.provider,
            model: provider.model,
            usage: {
                promptTokens: Math.ceil(prompt.length / 4),
                completionTokens: estimatedTokens,
                totalTokens: Math.ceil(prompt.length / 4) + estimatedTokens,
            }
        };
    }

    /**
     * Generate text completion with streaming
     */
    async *generateStream(
        request: CompletionRequest,
        metadata: UsageMetadata = { endpoint: 'generateStream' }
    ): AsyncGenerator<string, void, unknown> {
        const providers = await this.getProviders(request.feature);

        if (providers.length === 0) {
            console.error('[LLMService] No LLM providers configured for streaming');
            throw new Error("No LLM provider configured. Please go to Settings > AI Providers and configure at least one LLM provider (OpenAI, Anthropic, or Gemini).");
        }

        const startTime = Date.now();
        let lastError: Error | undefined;

        for (const provider of providers) {
            try {
                switch (provider.provider) {
                    case 'anthropic':
                        yield* this.streamAnthropic(provider, request);
                        break;
                    case 'gemini':
                        yield* this.streamGemini(provider, request);
                        break;
                    case 'openai':
                    case 'deepseek':
                    case 'openrouter':
                    case 'custom':
                    default:
                        yield* this.streamOpenAI(provider, request);
                        break;
                }

                const latencyMs = Date.now() - startTime;
                await this.trackUsage(
                    provider,
                    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    metadata,
                    latencyMs,
                    true
                );
                return;

            } catch (error: any) {
                const latencyMs = Date.now() - startTime;
                await this.trackUsage(
                    provider,
                    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                    metadata,
                    latencyMs,
                    false,
                    error.message
                );

                console.warn(`[LLM-Stream] Provider ${provider.name} failed:`, error.message);
                lastError = error;
                // Try next provider
            }
        }

        console.error("All LLM streaming providers failed:", lastError?.message);
        throw new Error(`All LLM streaming providers failed. Last error: ${lastError?.message}`);
    }

    /**
     * Stream using OpenAI or compatible API
     */
    private async *streamOpenAI(
        provider: LLMProvider,
        request: CompletionRequest
    ): AsyncGenerator<string, void, unknown> {
        const client = this.getOpenAIClient(provider);

        const stream = await client.chat.completions.create({
            model: provider.model,
            messages: [
                { role: 'system', content: request.systemPrompt || 'You are a helpful compliance assistant.' },
                { role: 'user', content: request.userPrompt }
            ],
            temperature: request.temperature ?? 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }

    /**
     * Stream using Anthropic Claude
     */
    private async *streamAnthropic(
        provider: LLMProvider,
        request: CompletionRequest
    ): AsyncGenerator<string, void, unknown> {
        const client = this.getAnthropicClient(provider);

        const params: any = {
            model: provider.model,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
            messages: [{ role: 'user', content: request.userPrompt }],
            stream: true,
        };

        if (request.systemPrompt) {
            params.system = request.systemPrompt;
        }

        const stream = await client.messages.create(params) as any;

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }
    }

    /**
     * Stream using Google Gemini
     */
    private async *streamGemini(
        provider: LLMProvider,
        request: CompletionRequest
    ): AsyncGenerator<string, void, unknown> {
        const client = this.getGeminiClient(provider);
        const model = client.getGenerativeModel({ model: provider.model });

        const prompt = request.systemPrompt
            ? `${request.systemPrompt}\n\n${request.userPrompt}`
            : request.userPrompt;

        const result = await model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens || 2048,
            },
        });

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield text;
            }
        }
    }

    /**
     * Generate embeddings for a given text
     */
    async getEmbeddings(text: string): Promise<number[]> {
        // Find a provider that supports embeddings
        // Priority: OpenAI -> First available provider with supportsEmbeddings=true
        const db = await getDb();

        let provider: LLMProvider | undefined;

        // Try to get explicit OpenAI provider first (preferred for embeddings usually)
        const openAIProvider = await db.select().from(llmProviders)
            .where(and(eq(llmProviders.provider, 'openai'), eq(llmProviders.isEnabled, true)))
            .limit(1);

        if (openAIProvider.length > 0) {
            provider = openAIProvider[0];
        } else {
            // Fallback to any provider supporting embeddings
            const embeddedProviders = await db.select().from(llmProviders)
                .where(and(eq(llmProviders.supportsEmbeddings, true), eq(llmProviders.isEnabled, true)))
                .orderBy(desc(llmProviders.priority))
                .limit(1);

            if (embeddedProviders.length > 0) {
                provider = embeddedProviders[0];
            }
        }

        if (!provider) {
            throw new Error("No embedding-capable LLM provider found. Please configure one in Settings.");
        }

        const startTime = Date.now();

        try {
            let embedding: number[] = [];

            if (provider.provider === 'openai' || provider.provider === 'azure-openai') {
                const client = this.getOpenAIClient(provider);
                const response = await client.embeddings.create({
                    model: 'text-embedding-3-small', // Default efficient model
                    input: text,
                    encoding_format: 'float',
                });
                embedding = response.data[0].embedding;
            } else if (provider.provider === 'gemini') {
                const client = this.getGeminiClient(provider);
                const model = client.getGenerativeModel({ model: 'text-embedding-004' });
                const result = await model.embedContent(text);
                embedding = result.embedding.values;
            } else {
                // Fallback/Custom (Not fully implemented for generic providers yet)
                throw new Error(`Provider ${provider.provider} embedding not yet supported`);
            }

            await this.trackUsage(
                provider,
                { promptTokens: Math.ceil(text.length / 4), completionTokens: 0, totalTokens: Math.ceil(text.length / 4) },
                { endpoint: 'getEmbeddings' },
                Date.now() - startTime,
                true
            );

            return embedding;

        } catch (error: any) {
            await this.trackUsage(
                provider,
                { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                { endpoint: 'getEmbeddings' },
                Date.now() - startTime,
                false,
                error.message
            );
            logger.error({ message: "Embedding Generation Failed", error: error.message });
            throw error;
        }
    }

    /**
     * Test a provider connection
     */
    async testConnection(provider: Partial<LLMProvider> & { apiKey: string }): Promise<{ success: boolean; message: string; isBalanceWarning?: boolean }> {
        try {
            switch (provider.provider) {
                case 'anthropic': {
                    const client = new Anthropic({ apiKey: provider.apiKey });
                    await client.messages.create({
                        model: provider.model || 'claude-3-haiku-20240307',
                        max_tokens: 5,
                        messages: [{ role: 'user', content: 'Test' }],
                    });
                    break;
                }

                case 'gemini': {
                    const client = new GoogleGenerativeAI(provider.apiKey);
                    const model = client.getGenerativeModel({ model: provider.model || 'gemini-pro' });
                    await model.generateContent('Test');
                    break;
                }

                default: {
                    const isLocal = ['ollama', 'lmstudio', 'vllm', 'localai'].includes(provider.provider || '');
                    const config: any = {
                        apiKey: provider.apiKey || (isLocal ? 'local' : 'sk-local'),
                        dangerouslyAllowBrowser: true,
                        timeout: 15000,
                    };
                    if (provider.baseUrl) {
                        config.baseURL = provider.baseUrl;
                    } else if (provider.provider === 'ollama') {
                        config.baseURL = 'http://127.0.0.1:11434/v1';
                    } else if (provider.provider === 'lmstudio') {
                        config.baseURL = 'http://127.0.0.1:1234/v1';
                    } else if (provider.provider === 'vllm') {
                        config.baseURL = 'http://127.0.0.1:8000/v1';
                    } else if (provider.provider === 'localai') {
                        config.baseURL = 'http://127.0.0.1:8080/v1';
                    } else if (provider.provider === 'deepseek') {
                        config.baseURL = 'https://api.deepseek.com';
                    } else if (provider.provider === 'openrouter') {
                        config.baseURL = 'https://openrouter.ai/api/v1';
                    } else if (provider.provider === 'qwen') {
                        config.baseURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
                    }

                    const client = new OpenAI(config);
                    let testModel = provider.model;
                    if (!testModel) {
                        if (provider.provider === 'ollama') testModel = 'llama3.2:3b';
                        else if (provider.provider === 'deepseek') testModel = 'deepseek-chat';
                        else if (provider.provider === 'openrouter') testModel = 'deepseek/deepseek-chat';
                        else testModel = 'gpt-4o';
                    }

                    await client.chat.completions.create({
                        model: testModel,
                        messages: [{ role: 'user', content: 'Test' }],
                        max_tokens: 5,
                    });
                    break;
                }
            }

            return { success: true, message: 'Connection successful!' };
        } catch (e: any) {
            logger.error({ message: "Test connection failed", error: e.message });

            const errMsg = e.message || '';
            const status = e.status || e.statusCode;

            // Detect 402 / Insufficient Balance (Key is authentic and valid, but credits needed)
            if (status === 402 || /insufficient|balance|credit/i.test(errMsg)) {
                return {
                    success: true,
                    isBalanceWarning: true,
                    message: `API Key authenticated successfully! Note: Upstream provider returned 402 (Insufficient Balance / credits). The provider has been saved and will activate once credits are refilled.`
                };
            }

            // 401 Unauthorized / Invalid Key
            if (status === 401 || /unauthorized|invalid api key|incorrect api key/i.test(errMsg)) {
                return {
                    success: false,
                    message: `Authentication failed: The provided API key was rejected by ${provider.provider || 'provider'}.`
                };
            }

            // 404 Model Not Found
            if (status === 404 || /model.*not.*found/i.test(errMsg)) {
                return {
                    success: false,
                    message: `Model "${provider.model}" was not found on ${provider.provider}. Please verify the model name.`
                };
            }

            return {
                success: false,
                message: errMsg || 'Connection failed. Please check your credentials and endpoint.'
            };
        }
    }
}

export const llmService = new LLMService();

