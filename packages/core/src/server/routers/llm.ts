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

export const createLlmRouter = (t: any, publicProcedure: any, isAuthed: any, adminProcedure: any) => {
    return t.router({
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
                    
                    // We use the direct testConnection instead of generate to ensure we test THIS specific key
                    const isSuccessful = await llmService.testConnection({
                        provider: input.provider,
                        model: input.model,
                        apiKey: testKey,
                        baseUrl: input.baseUrl
                    });

                    if (!isSuccessful) {
                        throw new Error('Connection failed. Please check your API key and model name.');
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
                    
                    console.log('[LLM Test] Connection and save successful. Returning:', {
                        success: isSuccessful,
                        message: "Connection successful and provider saved!",
                        id: providerId
                    });
                    return { 
                        success: true, 
                        message: 'Connection successful! Provider settings saved.',
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
