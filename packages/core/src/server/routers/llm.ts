/**
 * LLM Router - Handles AI Provider Configuration
 * 
 * CRITICAL: This router manages LLM (AI) provider configuration including:
 * - Adding, updating, deleting LLM providers
 * - Feature-based routing rules
 * - Testing provider connections
 * 
 * This file should NEVER be modified again without explicit permission.
 * Any changes could break AI policy generation functionality.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { llmProviders, llmRouterRules } from "../../schema";
import { eq, desc } from "drizzle-orm";
import { encrypt, decrypt } from "../../lib/crypto";
import { LLMService } from "../../lib/llm/service";
import { localLLMDiscovery, LocalLLMDiscoveryService, fetchJsonBounded } from "../../lib/llm/localLLMDiscovery";

export const createLlmRouter = (t: any, publicProcedure: any, isAuthed: any, adminProcedure: any) => {
    return t.router({
        // Detect local LLM runtimes (Ollama, LM Studio, vLLM, LocalAI)
        detectLocalRuntimes: publicProcedure
            .use(isAuthed)
            .input(z.object({ customUrls: z.array(z.string()).optional() }).optional())
            .query(async ({ input }: any) => {
                try {
                    return await localLLMDiscovery.scanLocalRuntimes(input?.customUrls || []);
                } catch (err: any) {
                    console.error('[LLM Router] Failed to scan local runtimes:', err.message);
                    return [];
                }
            }),

        // Get curated recommended local models with hardware specs
        getRecommendedLocalModels: publicProcedure
            .use(isAuthed)
            .query(() => {
                return LocalLLMDiscoveryService.RECOMMENDED_MODELS;
            }),

        // Get and set Air-Gapped Sovereign execution mode
        getExecutionMode: publicProcedure
            .use(isAuthed)
            .query(() => {
                return { mode: LLMService.getExecutionMode() };
            }),

        setExecutionMode: adminProcedure
            .input(z.object({ mode: z.enum(['hybrid', 'local_only', 'cloud_only']) }))
            .mutation(({ input }: any) => {
                LLMService.setExecutionMode(input.mode);
                return { success: true, mode: input.mode };
            }),
        // Lightweight AI-readiness check for UI gating (buttons/tooltips).
        status: publicProcedure
            .use(isAuthed)
            .query(async () => {
                try {
                    const db = await getDb();
                    const providers = await db.select().from(llmProviders);
                    const enabled = providers.filter((p: any) => p.isEnabled);
                    const isPlaceholder = (k: string | null | undefined) =>
                        !k || k.startsWith('enc:demo-') || k.includes('demo-placeholder');
                    const usable = enabled.filter((p: any) => !isPlaceholder(decrypt(p.apiKey)));
                    return {
                        configured: usable.length > 0,
                        enabledCount: enabled.length,
                        usableCount: usable.length,
                    };
                } catch {
                    return { configured: false, enabledCount: 0, usableCount: 0 };
                }
            }),

        // List all LLM providers
        list: publicProcedure
            .use(isAuthed)
            .query(async ({ ctx }: any) => {
                try {
                    const db = await getDb();
                    const providers = await db.select().from(llmProviders).orderBy(desc(llmProviders.priority));

                    return providers.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        provider: p.provider,
                        model: p.model,
                        baseUrl: p.baseUrl,
                        priority: p.priority,
                        isEnabled: p.isEnabled,
                        supportsEmbeddings: p.supportsEmbeddings,
                        createdAt: p.createdAt,
                        apiKey: p.apiKey ? '********' : null
                    }));
                } catch (error: any) {
                    console.error('[LLM List] Error:', error);
                    return [];
                }
            }),

        // List available models for a provider (e.g. live OpenRouter models or curated vendor catalogs)
        listAvailableModels: publicProcedure
            .use(isAuthed)
            .input(z.object({
                provider: z.string(),
                apiKey: z.string().optional(),
                baseUrl: z.string().optional()
            }))
            .query(async ({ input }: any) => {
                const { provider } = input;
                if (provider === 'ollama') {
                    const probe = await localLLMDiscovery.probeRuntime({
                        type: 'ollama',
                        name: 'Ollama',
                        baseUrl: input.baseUrl || 'http://127.0.0.1:11434'
                    });
                    if (probe.isOnline && probe.models.length > 0) {
                        return probe.models.map(m => ({
                            id: m.id,
                            name: `${m.name}${m.size ? ` (${m.size})` : ''}`,
                            description: m.supportsEmbeddings ? 'Vector embedding model' : 'Local Ollama model'
                        }));
                    }
                    return [
                        { id: 'deepseek-r1:8b', name: 'DeepSeek R1 (8B)', description: 'Ollama local reasoning (8GB RAM)' },
                        { id: 'deepseek-r1:14b', name: 'DeepSeek R1 (14B)', description: 'Ollama pro reasoning (16GB RAM)' },
                        { id: 'qwen2.5:7b', name: 'Qwen 2.5 (7B)', description: 'Ollama policy & compliance drafting (8GB RAM)' },
                        { id: 'llama3.2:3b', name: 'Llama 3.2 (3B)', description: 'Ollama fast triage (4GB RAM)' },
                        { id: 'nomic-embed-text', name: 'Nomic Embed Text (v1.5)', description: 'Ollama local vector embeddings' },
                        { id: 'bge-large-en-v1.5', name: 'BGE Large English (v1.5)', description: 'Ollama high-accuracy vector embeddings' }
                    ];
                }

                if (provider === 'lmstudio') {
                    const probe = await localLLMDiscovery.probeRuntime({
                        type: 'lmstudio',
                        name: 'LM Studio',
                        baseUrl: input.baseUrl || 'http://127.0.0.1:1234/v1'
                    });
                    if (probe.isOnline && probe.models.length > 0) {
                        return probe.models.map(m => ({
                            id: m.id,
                            name: m.name,
                            description: 'Currently loaded in LM Studio'
                        }));
                    }
                    return [
                        { id: 'loaded-model', name: 'Currently Loaded Model in LM Studio', description: 'Default model served by LM Studio' }
                    ];
                }

                if (provider === 'vllm') {
                    const probe = await localLLMDiscovery.probeRuntime({
                        type: 'vllm',
                        name: 'vLLM',
                        baseUrl: input.baseUrl || 'http://127.0.0.1:8000/v1'
                    });
                    if (probe.isOnline && probe.models.length > 0) {
                        return probe.models.map(m => ({
                            id: m.id,
                            name: m.name,
                            description: 'vLLM GPU cluster model'
                        }));
                    }
                    return [
                        { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', name: 'DeepSeek R1 (70B Distill)', description: 'vLLM Enterprise GPU Cluster' },
                        { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 (70B Instruct)', description: 'vLLM Enterprise GPU Cluster' }
                    ];
                }

                if (provider === 'localai') {
                    return [
                        { id: 'gpt-4', name: 'LocalAI Default Alias (gpt-4)', description: 'LocalAI mapped model' }
                    ];
                }

                if (provider === 'openrouter') {
                    try {
                        const data = await fetchJsonBounded(
                            'https://openrouter.ai/api/v1/models', {
                            headers: input.apiKey && input.apiKey !== '********' ? { 'Authorization': `Bearer ${input.apiKey}` } : {},
                                timeoutMs: 2500
                        });
                        { // non-2xx already threw inside fetchJsonBounded
                            // response already parsed (with timeout) above
                            if (Array.isArray(data?.data)) {
                                return data.data.map((m: any) => ({
                                    id: m.id,
                                    name: m.name || m.id,
                                    description: m.description ? m.description.slice(0, 100) : '',
                                    contextLength: m.context_length
                                })).slice(0, 150);
                            }
                        }
                    } catch (err) {
                        console.warn('[LLM Router] Failed to fetch live OpenRouter models, using curated list:', err);
                    }
                    // Fallback curated OpenRouter models
                    return [
                        { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', description: 'State-of-the-art open reasoning model' },
                        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Chat)', description: 'Fast, highly capable general model' },
                        { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Anthropic flagship with hybrid reasoning' },
                        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Exceptional coding and analysis' },
                        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Fast, lightweight and cost-effective' },
                        { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', description: 'Flagship multimodal high-intelligence model' },
                        { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', description: 'Affordable and intelligent small model' },
                        { id: 'openai/o3-mini', name: 'OpenAI o3-mini', description: 'Advanced reasoning model for STEM and code' },
                        { id: 'openai/o1', name: 'OpenAI o1', description: 'Deep reasoning model for complex problems' },
                        { id: 'google/gemini-2.0-flash-001', name: 'Google Gemini 2.0 Flash', description: 'Next-gen multimodal speed and power' },
                        { id: 'google/gemini-2.0-pro-exp-02-05:free', name: 'Google Gemini 2.0 Pro (Free)', description: 'Experimental high-intelligence model' },
                        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B', description: 'Open source heavyweight' },
                        { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', description: 'Top tier multilingual and reasoning' },
                        { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2411', description: 'Flagship European LLM' }
                    ];
                }

                if (provider === 'deepseek') {
                    return [
                        { id: 'deepseek-chat', name: 'DeepSeek V3 (deepseek-chat)', description: 'General conversational and compliance reasoning' },
                        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (deepseek-reasoner)', description: 'Deep chain-of-thought mathematical and logic reasoning' }
                    ];
                }

                if (provider === 'openai') {
                    return [
                        { id: 'gpt-4o', name: 'GPT-4o (Omni)', description: 'Most capable multimodal flagship model' },
                        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, lightweight, affordable model' },
                        { id: 'o3-mini', name: 'o3-mini', description: 'Advanced reasoning for technical and coding tasks' },
                        { id: 'o1', name: 'o1', description: 'Maximum reasoning depth for complex compliance architectures' },
                        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High-capability legacy model with 128k context' },
                        { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', description: 'Efficient vector embeddings (1536 dim)' },
                        { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', description: 'High accuracy vector embeddings (3072 dim)' }
                    ];
                }

                if (provider === 'anthropic') {
                    return [
                        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Flagship hybrid reasoning model' },
                        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', description: 'Top tier coding and policy synthesis' },
                        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Ultra-fast sub-second latency model' },
                        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Deep analytical and narrative model' }
                    ];
                }

                if (provider === 'gemini') {
                    return [
                        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fastest next-gen multimodal reasoning' },
                        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '1M+ token context window for huge compliance audits' },
                        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'High speed and low latency' },
                        { id: 'text-embedding-004', name: 'Text Embedding 004', description: 'Vector embeddings' }
                    ];
                }

                if (provider === 'qwen') {
                    return [
                        { id: 'qwen-max', name: 'Qwen Max', description: 'Highest capability Alibaba flagship' },
                        { id: 'qwen-plus', name: 'Qwen Plus', description: 'Balanced speed and intelligence' },
                        { id: 'qwen-turbo', name: 'Qwen Turbo', description: 'High-throughput cost-effective model' }
                    ];
                }

                return [
                    { id: 'local-model', name: 'Local Model', description: 'Custom local model' }
                ];
            }),

        // Get routing rules
        getRoutes: publicProcedure
            .use(isAuthed)
            .query(async () => {
                const db = await getDb();
                return await db.select().from(llmRouterRules);
            }),

        // Set routing rule for a feature
        setRoute: adminProcedure
            .input(z.object({
                feature: z.string(),
                providerId: z.number().nullable()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                
                const existing = await db.select().from(llmRouterRules)
                    .where(eq(llmRouterRules.feature, input.feature))
                    .limit(1);

                if (existing.length > 0) {
                    await db.update(llmRouterRules)
                        .set({ providerId: input.providerId, updatedAt: new Date() })
                        .where(eq(llmRouterRules.feature, input.feature));
                } else {
                    await db.insert(llmRouterRules).values({
                        feature: input.feature,
                        providerId: input.providerId
                    });
                }

                LLMService.clearCache();
                return { success: true };
            }),

        // Create new LLM provider
        create: adminProcedure
            .input(z.object({
                name: z.string(),
                provider: z.string(),
                model: z.string(),
                apiKey: z.string(),
                baseUrl: z.string().optional(),
                priority: z.number().default(0),
                isEnabled: z.boolean().default(true),
                supportsEmbeddings: z.boolean().default(false)
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                
                const encryptedApiKey = encrypt(input.apiKey);
                
                console.log('[LLM Create] Creating provider:', input.name, input.model);
                
                const [newProvider] = await db.insert(llmProviders).values({
                    name: input.name,
                    provider: input.provider,
                    model: input.model,
                    apiKey: encryptedApiKey,
                    baseUrl: input.baseUrl || null,
                    priority: input.priority,
                    isEnabled: input.isEnabled,
                    supportsEmbeddings: input.supportsEmbeddings
                }).returning();

                console.log('[LLM Create] Created provider with ID:', newProvider.id);

                LLMService.clearCache();

                return {
                    id: newProvider.id,
                    name: newProvider.name,
                    provider: newProvider.provider,
                    model: newProvider.model,
                    baseUrl: newProvider.baseUrl,
                    priority: newProvider.priority,
                    isEnabled: newProvider.isEnabled,
                    supportsEmbeddings: newProvider.supportsEmbeddings,
                    createdAt: newProvider.createdAt,
                    apiKey: '********'
                };
            }),

        // Update LLM provider
        update: adminProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().optional(),
                provider: z.string().optional(),
                model: z.string().optional(),
                apiKey: z.string().optional(),
                baseUrl: z.string().optional(),
                priority: z.number().optional(),
                isEnabled: z.boolean().optional(),
                supportsEmbeddings: z.boolean().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const { id, ...data } = input;
                
                console.log(`[LLM Update] Updating provider ${id}:`, Object.keys(data).join(', '));
                
                if (data.apiKey && data.apiKey !== '********' && data.apiKey.trim() !== '') {
                    console.log(`[LLM Update] Encrypting new API key for provider ${id}`);
                    data.apiKey = encrypt(data.apiKey);
                } else {
                    delete data.apiKey; // Remove so it's not updated in DB
                }

                const [updated] = await db.update(llmProviders)
                    .set(data)
                    .where(eq(llmProviders.id, id))
                    .returning();

                if (!updated) {
                    console.error(`[LLM Update] Provider ${id} not found`);
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Provider with ID ${id} not found`
                    });
                }

                console.log(`[LLM Update] Successfully updated provider ${id}`);
                LLMService.clearCache();

                return {
                    id: updated.id,
                    name: updated.name,
                    provider: updated.provider,
                    model: updated.model,
                    baseUrl: updated.baseUrl,
                    priority: updated.priority,
                    isEnabled: updated.isEnabled,
                    supportsEmbeddings: updated.supportsEmbeddings,
                    createdAt: updated.createdAt,
                    apiKey: '********'
                };
            }),

        // Delete LLM provider
        delete: adminProcedure
            .input(z.object({
                id: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                
                await db.delete(llmProviders).where(eq(llmProviders.id, input.id));
                
                LLMService.clearCache();
                
                return { success: true };
            }),

        // Test LLM provider connection - using specific credentials
        test: adminProcedure
            .input(z.object({
                id: z.number().optional(), // ID if editing
                name: z.string(),
                provider: z.string(),
                model: z.string(),
                apiKey: z.string(),
                baseUrl: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                try {
                    let testKey = input.apiKey;
                    const db = await getDb();

                    // If key is masked, we need to fetch the real key from the database
                    if (testKey === '********') {
                        console.log('[LLM Test] Using stored key for testing...');
                        const existing = input.id 
                            ? await db.select().from(llmProviders).where(eq(llmProviders.id, input.id)).limit(1)
                            : await db.select().from(llmProviders).where(eq(llmProviders.name, input.name)).limit(1);
                        
                        if (existing.length === 0 || !existing[0].apiKey) {
                            throw new Error('No stored API key found to test with. Please enter a new key.');
                        }
                        
                        try {
                            testKey = decrypt(existing[0].apiKey);
                            console.log('[LLM Test] Successfully decrypted stored key for testing.');
                        } catch (decryptErr: any) {
                            console.error('[LLM Test] Decryption failed:', decryptErr.message);
                            throw new Error('Failed to decrypt stored API key. Please re-enter the key.');
                        }
                    }

                    const llmService = new LLMService();
                    
                    const testResult = await llmService.testConnection({
                        provider: input.provider,
                        model: input.model,
                        apiKey: testKey,
                        baseUrl: input.baseUrl
                    });

                    if (!testResult.success) {
                        throw new Error(testResult.message || 'Connection failed. Please check your API key and model name.');
                    }

                    // If successful, save/update the provider
                    let providerId: number;
                    
                    // Encrypt if we have a NEW key (not masked)
                    const encryptedApiKey = input.apiKey === '********' ? null : encrypt(input.apiKey);
                    
                    // Priority 1: Use ID if provided
                    // Priority 2: Use matching name
                    const existing = input.id 
                        ? await db.select().from(llmProviders).where(eq(llmProviders.id, input.id)).limit(1)
                        : await db.select().from(llmProviders).where(eq(llmProviders.name, input.name)).limit(1);
                    
                    if (existing.length > 0) {
                        console.log(`[LLM Test] Updating existing provider ${existing[0].id}`);
                        const updateData: any = {
                            name: input.name,
                            provider: input.provider,
                            model: input.model,
                            baseUrl: input.baseUrl || null,
                            isEnabled: true
                        };
                        
                        // Only update API key if it's a new one
                        if (encryptedApiKey) {
                            updateData.apiKey = encryptedApiKey;
                        }
                        
                        await db.update(llmProviders)
                            .set(updateData)
                            .where(eq(llmProviders.id, existing[0].id));
                        providerId = existing[0].id;
                    } else {
                        // For new providers, API key MUST be provided and NOT masked
                        if (input.apiKey === '********') {
                            throw new Error('API key cannot be "********" for new providers');
                        }
                        
                        console.log(`[LLM Test] No existing provider found. Creating new provider: ${input.name}`);
                        const [newProvider] = await db.insert(llmProviders).values({
                            name: input.name,
                            provider: input.provider,
                            model: input.model,
                            apiKey: encryptedApiKey!,
                            baseUrl: input.baseUrl || null,
                            priority: 0,
                            isEnabled: true,
                            supportsEmbeddings: false
                        }).returning();
                        providerId = newProvider.id;
                    }

                    LLMService.clearCache();
                    
                    return { 
                        success: true, 
                        message: testResult.message || 'Connection successful! Provider settings saved.',
                        isBalanceWarning: testResult.isBalanceWarning || false,
                        id: providerId
                    };
                } catch (error: any) {
                    console.error('[LLM Test] Error:', error.message);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Connection test failed'
                    });
                }
            })
    });
};
