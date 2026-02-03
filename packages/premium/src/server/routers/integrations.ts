
import { z } from "zod";
import { db, schema } from "@complianceos/core";
const { integrations, integrationDefinitions } = schema;
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const integrationsRouter = (t: any, clientProcedure: any, isAuthed: any) => {
    return t.router({
        // List all supported integration types (Marketplace logic)
        listAvailable: clientProcedure.query(async () => {
            const d = await db.getDb();
            // Fetch definitions from DB to see what is enabled
            const defs = await d.select().from(integrationDefinitions).where(eq(integrationDefinitions.isActive, true));
            // Map known providers to static info combined with DB status
            const staticInfo: Record<string, any> = {
                'jira': { name: 'Jira', description: 'Sync issues and defects directly with your engineering team.', category: 'Issue Tracking', logo: '/icons/jira.svg' },
                'slack': { name: 'Slack', description: 'Receive real-time alerts for compliance risks and tasks.', category: 'Communication', logo: '/icons/slack.svg' },
                'github': { name: 'GitHub', description: 'Monitor code changes and pull requests.', category: 'Version Control', logo: '/icons/github.svg' },
                'aws': { name: 'AWS', description: 'Automated evidence collection for AWS resources.', category: 'Cloud Infrastructure', logo: '/icons/aws.svg' }
            };

            return Object.keys(staticInfo).map(key => {
                const def = defs.find(d => d.provider === key);
                const info = staticInfo[key];
                return {
                    id: key,
                    ...info,
                    isComingSoon: !def, // If no definition in DB, it's not ready
                };
            });
        }),

        // ADMIN: Configure an integration provider
        configureProvider: clientProcedure
            .input(z.object({
                provider: z.string(),
                name: z.string(),
                clientId: z.string(),
                clientSecret: z.string(),
                scopes: z.string().optional(),
                redirectUri: z.string().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                // Ensure admin (simple check, ideally middleware)
                if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'owner') {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
                }

                const d = await db.getDb();
                await d.insert(integrationDefinitions).values({
                    provider: input.provider,
                    name: input.name,
                    clientId: input.clientId,
                    clientSecret: input.clientSecret,
                    scopes: input.scopes,
                    redirectUri: input.redirectUri
                }).onConflictDoUpdate({
                    target: [integrationDefinitions.provider],
                    set: {
                        name: input.name,
                        clientId: input.clientId,
                        clientSecret: input.clientSecret,
                        scopes: input.scopes,
                        redirectUri: input.redirectUri,
                        updatedAt: new Date()
                    }
                });
                return { success: true };
            }),

        // List active connections for the current client
        listActive: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const d = await db.getDb();
                return await d.select().from(integrations).where(eq(integrations.clientId, input.clientId));
            }),

        // Generate OAuth URL
        getAuthUrl: clientProcedure
            .input(z.object({
                clientId: z.number(),
                provider: z.string()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                const [def] = await d.select().from(integrationDefinitions).where(eq(integrationDefinitions.provider, input.provider));

                if (!def || !def.isActive) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Integration ${input.provider} is not configured or disabled.` });
                }

                if (input.provider === 'jira') {
                    const callbackUrl = def.redirectUri || 'http://localhost:5173/auth/callback/jira';
                    const scopes = def.scopes || 'read:jira-user read:jira-work write:jira-work manage:jira-webhook offline_access';

                    const state = btoa(JSON.stringify({ clientId: input.clientId, provider: 'jira' }));
                    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${def.clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&response_type=code&prompt=consent`;

                    return { url };
                }

                // Generic fallback? Or error
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Provider ${input.provider} logic not fully implemented yet` });
            }),

        // Disconnect integration
        disconnect: clientProcedure
            .input(z.object({
                clientId: z.number(),
                provider: z.string()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                await d.delete(integrations)
                    .where(and(
                        eq(integrations.clientId, input.clientId),
                        eq(integrations.provider, input.provider)
                    ));
                return { success: true };
            }),

        // Exchange code for token (called by Callback UI)
        exchangeCode: clientProcedure
            .input(z.object({
                clientId: z.number(),
                provider: z.string(), // Changed to string to be generic
                code: z.string(),
                redirectUri: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                const [def] = await d.select().from(integrationDefinitions).where(eq(integrationDefinitions.provider, input.provider));

                if (!def || !def.isActive) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Integration credentials missing' });
                }

                if (input.provider === 'jira') {
                    const callbackUrl = input.redirectUri || def.redirectUri || 'http://localhost:5173/auth/callback/jira';

                    try {
                        const response = await fetch('https://auth.atlassian.com/oauth/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                grant_type: 'authorization_code',
                                client_id: def.clientId,
                                client_secret: def.clientSecret,
                                code: input.code,
                                redirect_uri: callbackUrl
                            })
                        });

                        const data = await response.json();
                        if (!response.ok) {
                            console.error("Jira Token Exchange Error", data);
                            throw new Error(data.error_description || 'Failed to exchange token');
                        }

                        // Parse external account ID if possible (need to fetch profile "me")
                        // But for now, save tokens

                        // Upsert logic
                        // We need to fetch cloudId as well, which is a separate call to https://api.atlassian.com/oauth/token/accessible-resources

                        const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
                            headers: { Authorization: `Bearer ${data.access_token}` }
                        });
                        const resources = await resourcesRes.json();
                        const cloudId = resources[0]?.id; // Default to first cloud ID / site
                        const siteName = resources[0]?.name;

                        await d.insert(integrations).values({
                            clientId: input.clientId,
                            provider: 'jira', // or input.provider
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                            // Calculate expiry (expires_in is seconds)
                            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
                            externalAccountId: cloudId,
                            scopes: data.scope ? data.scope.split(' ') : [],
                            metadata: { siteName: siteName, resources: resources },
                            updatedAt: new Date()
                        }).onConflictDoUpdate({
                            target: [integrations.clientId, integrations.provider],
                            set: {
                                accessToken: data.access_token,
                                refreshToken: data.refresh_token,
                                expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
                                externalAccountId: cloudId,
                                metadata: { siteName: siteName, resources: resources },
                                updatedAt: new Date()
                            }
                        });

                        return { success: true };

                    } catch (err: any) {
                        console.error("Integration Error", err);
                        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
                    }
                }
                return { success: false };
            })
    });
};
