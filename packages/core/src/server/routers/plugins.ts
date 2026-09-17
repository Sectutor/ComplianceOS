/**
 * Plugin Marketplace Router
 * 
 * Provides API endpoints for:
 * - Browsing available plugins in the marketplace
 * - Installing plugins from marketplace or URL
 * - Managing installed plugins
 * - Plugin settings
 * 
 * Plugin Access Levels:
 * - read:risks, read:controls, read:policies, read:evidence - Read data
 * - write:risks, write:controls, write:policies, write:evidence - Modify data
 * - ui:widgets, ui:menu, ui:pages - UI components
 * - api:custom - Custom API routes
 * - admin:system - Full system access (use with caution)
 */

import { router, protectedProcedure, adminProcedure, clientProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from '../../db';
import { eq, and } from 'drizzle-orm';

/**
 * Plugin manifest schema - defines what a plugin contains
 */
const PluginManifestSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    version: z.string(),
    description: z.string(),
    author: z.string(),
    authorUrl: z.string().optional(),
    license: z.string().default('MIT'),
    category: z.enum(['dashboard', 'risk', 'compliance', 'policy', 'evidence', 'training', 'reporting', 'integration', 'utility']),
    tags: z.array(z.string()).default([]),

    // Entry points
    frontend: z.string().optional(),     // Path to React component
    backend: z.string().optional(),      // Path to server-side code
    api: z.string().optional(),          // Custom API routes

    // Required permissions (like WordPress capabilities)
    permissions: z.array(z.string()).default([]),

    // UI slots this plugin occupies
    uiSlots: z.array(z.object({
        slot: z.string(),
        position: z.enum(['top', 'bottom', 'left', 'right', 'main']).default('main'),
        priority: z.number().default(100),
    })).default([]),

    // Settings schema
    settings: z.array(z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(['text', 'number', 'boolean', 'select', 'textarea']),
        default: z.any(),
        options: z.array(z.object({ label: z.string(), value: z.any() })).optional(),
        required: z.boolean().default(false),
    })).default([]),

    // Dependencies
    requires: z.record(z.string()).default({}),

    // Homepage / support
    homepage: z.string().optional(),
    supportUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
});

type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * Installed plugin record
 */
interface InstalledPlugin {
    id: string;
    clientId: number;
    manifest: PluginManifest;
    enabled: boolean;
    settings: Record<string, any>;
    installedAt: Date;
    updatedAt: Date;
}

/**
 * Built-in marketplace plugins (official ComplianceOS plugins)
 */
const MARKETPLACE_PLUGINS: PluginManifest[] = [
    {
        id: 'cos-risk-game',
        name: 'Risk Game',
        slug: 'risk-game',
        version: '1.0.0',
        description: 'Interactive risk simulation game for training and awareness',
        author: 'ComplianceOS',
        authorUrl: 'https://complianceos.com',
        license: 'Proprietary',
        category: 'training',
        tags: ['gamification', 'training', 'awareness'],
        frontend: '@/components/risk/RiskGame.tsx',
        permissions: ['read:risks', 'write:risks'],
        uiSlots: [{ slot: 'risk:sidebar', position: 'bottom', priority: 50 }],
        settings: [],
        requires: {},
        homepage: 'https://complianceos.com/plugins/risk-game',
        downloadUrl: 'https://complianceos.com/api/plugins/risk-game/download',
    },
    {
        id: 'cos-executive-dashboard',
        name: 'Executive Dashboard',
        slug: 'executive-dashboard',
        version: '1.0.0',
        description: 'Customizable executive summary dashboard with key metrics',
        author: 'ComplianceOS',
        authorUrl: 'https://complianceos.com',
        license: 'Proprietary',
        category: 'dashboard',
        tags: ['dashboard', 'executive', 'reporting'],
        frontend: '@/components/dashboard/ExecutiveDashboard.tsx',
        permissions: ['read:risks', 'read:controls', 'read:policies', 'read:compliance'],
        uiSlots: [{ slot: 'dashboard:main', position: 'main', priority: 10 }],
        settings: [
            {
                key: 'metrics',
                label: 'Display Metrics',
                type: 'select',
                default: 'all',
                options: [
                    { label: 'All Metrics', value: 'all' },
                    { label: 'Risks Only', value: 'risks' },
                    { label: 'Compliance Only', value: 'compliance' },
                ],
                required: false,
            },
        ],
        requires: {},
        homepage: 'https://complianceos.com/plugins/executive-dashboard',
    },
    {
        id: 'cos-gdpr-tools',
        name: 'GDPR Compliance Tools',
        slug: 'gdpr-tools',
        version: '1.0.0',
        description: 'Data protection and privacy tools for GDPR compliance',
        author: 'ComplianceOS',
        authorUrl: 'https://complianceos.com',
        license: 'Proprietary',
        category: 'compliance',
        tags: ['gdpr', 'privacy', 'data-protection'],
        permissions: ['read:data', 'write:data', 'read:dsar'],
        uiSlots: [],
        settings: [
            {
                key: 'retentionPeriod',
                label: 'Default Retention Period (days)',
                type: 'number',
                default: 365,
                required: false,
            },
        ],
        requires: {},
        homepage: 'https://complianceos.com/plugins/gdpr-tools',
    },
    {
        id: 'cos-threat-intel',
        name: 'Threat Intelligence',
        slug: 'threat-intel',
        version: '1.0.0',
        description: 'Real-time threat intelligence feeds and vulnerability tracking',
        author: 'ComplianceOS',
        authorUrl: 'https://complianceos.com',
        license: 'Proprietary',
        category: 'risk',
        tags: ['threat', 'intel', 'vulnerability'],
        permissions: ['read:threats', 'write:threats'],
        uiSlots: [],
        settings: [],
        requires: {},
        homepage: 'https://complianceos.com/plugins/threat-intel',
    },
    {
        id: 'cos-vendor-scorecard',
        name: 'Vendor Scorecard',
        slug: 'vendor-scorecard',
        version: '1.0.0',
        description: 'Vendor risk scoring and assessment tools',
        author: 'ComplianceOS',
        authorUrl: 'https://complianceos.com',
        license: 'Proprietary',
        category: 'risk',
        tags: ['vendor', 'scorecard', 'assessment'],
        permissions: ['read:vendors', 'write:vendors'],
        uiSlots: [{ slot: 'vendor:details', position: 'main', priority: 20 }],
        settings: [],
        requires: {},
        homepage: 'https://complianceos.com/plugins/vendor-scorecard',
    },
];

/**
 * Get marketplace plugins (browse available)
 */
async function getMarketplacePlugins(category?: string, search?: string): Promise<PluginManifest[]> {
    let plugins = [...MARKETPLACE_PLUGINS];

    if (category) {
        plugins = plugins.filter(p => p.category === category);
    }

    if (search) {
        const searchLower = search.toLowerCase();
        plugins = plugins.filter(p =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            p.tags.some(t => t.toLowerCase().includes(searchLower))
        );
    }

    return plugins;
}

/**
 * Plugin Router
 */
export const pluginRouter = router({
    /**
     * Get all available marketplace plugins
     */
    listMarketplace: protectedProcedure
        .input(z.object({
            category: z.string().optional(),
            search: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            const plugins = await getMarketplacePlugins(input?.category, input?.search);
            return {
                plugins,
                total: plugins.length,
                categories: ['dashboard', 'risk', 'compliance', 'policy', 'evidence', 'training', 'reporting', 'integration', 'utility'],
            };
        }),

    /**
     * Get a specific marketplace plugin
     */
    getMarketplacePlugin: protectedProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
            const plugin = MARKETPLACE_PLUGINS.find(p => p.slug === input.slug);
            if (!plugin) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Plugin not found in marketplace',
                });
            }
            return plugin;
        }),

    /**
     * Get installed plugins for current client
     */
    listInstalled: clientProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();

            // In a real implementation, this would query an installed_plugins table
            // For now, return built-in plugins that are "installed"
            const clientId = ctx.clientId;
            if (!clientId) {
                return [];
            }

            // Get plugins enabled for this client from client_settings
            const clientSettings = await db.query.clientSettings.findFirst({
                where: eq((await import('../../schema_client_settings')).clientSettings.clientId, clientId),
            });

            const enabledPlugins = (clientSettings?.customSettings as any)?.enabledPlugins || [];

            // Return installed plugins with status
            return MARKETPLACE_PLUGINS.map(plugin => ({
                ...plugin,
                installed: enabledPlugins.includes(plugin.id),
                enabled: enabledPlugins.includes(plugin.id),
            }));
        }),

    /**
     * Install a plugin from marketplace
     */
    install: clientProcedure
        .input(z.object({
            pluginId: z.string(),
            settings: z.record(z.any()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const db = await getDb();
                const clientId = ctx.clientId;

                if (!clientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Client context is missing',
                    });
                }

                // Find plugin in marketplace
                const plugin = MARKETPLACE_PLUGINS.find(p => p.id === input.pluginId);
                if (!plugin) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Plugin "${input.pluginId}" not found in marketplace`,
                    });
                }

                // Get current client settings
                const { clientSettings: clientSettingsTable } = await import('../../schema_client_settings');
                let clientSettings = await db.query.clientSettings.findFirst({
                    where: eq(clientSettingsTable.clientId, clientId),
                });

                const enabledPlugins = (clientSettings?.customSettings as any)?.enabledPlugins || [];

                if (enabledPlugins.includes(input.pluginId)) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Plugin "${plugin.name}" is already installed`,
                    });
                }

                // Check dependencies if any
                if (plugin.requires) {
                    for (const [depId, version] of Object.entries(plugin.requires)) {
                        if (!enabledPlugins.includes(depId)) {
                            throw new TRPCError({
                                code: 'PRECONDITION_FAILED',
                                message: `Plugin "${plugin.name}" requires "${depId}" (v${version}) to be installed first.`,
                            });
                        }
                    }
                }

                // Add plugin to enabled list
                const newEnabledPlugins = [...enabledPlugins, input.pluginId];

                if (clientSettings) {
                    // Update existing
                    await db.update(clientSettingsTable)
                        .set({
                            customSettings: {
                                ...(clientSettings.customSettings as any || {}),
                                enabledPlugins: newEnabledPlugins,
                                pluginSettings: {
                                    ...((clientSettings.customSettings as any)?.pluginSettings || {}),
                                    [input.pluginId]: input.settings || {},
                                },
                            },
                            updatedAt: new Date(),
                        })
                        .where(eq(clientSettingsTable.clientId, clientId));
                } else {
                    // Create new
                    await db.insert(clientSettingsTable)
                        .values({
                            clientId,
                            brandingOverrides: {},
                            featureFlags: {},
                            customSettings: {
                                enabledPlugins: newEnabledPlugins,
                                pluginSettings: {
                                    [input.pluginId]: input.settings || {},
                                },
                            },
                            version: 1,
                        });
                }

                return {
                    success: true,
                    plugin,
                    message: `Plugin "${plugin.name}" installed successfully`,
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('[Plugin Install Error]:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to install plugin. Please try again later.',
                    cause: error,
                });
            }
        }),

    /**
     * Uninstall a plugin
     */
    uninstall: clientProcedure
        .input(z.object({ pluginId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                const db = await getDb();
                const clientId = ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Client context is missing',
                    });
                }

                const { clientSettings: clientSettingsTable } = await import('../../schema_client_settings');
                const clientSettings = await db.query.clientSettings.findFirst({
                    where: eq(clientSettingsTable.clientId, clientId),
                });

                const enabledPlugins = (clientSettings?.customSettings as any)?.enabledPlugins || [];

                if (!enabledPlugins.includes(input.pluginId)) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Plugin is not installed and cannot be uninstalled',
                    });
                }

                // Check if other plugins depend on this one
                const dependentPlugins = MARKETPLACE_PLUGINS.filter(p => 
                    enabledPlugins.includes(p.id) && 
                    p.requires && 
                    p.requires[input.pluginId]
                );

                if (dependentPlugins.length > 0) {
                    throw new TRPCError({
                        code: 'PRECONDITION_FAILED',
                        message: `Cannot uninstall plugin. The following plugins depend on it: ${dependentPlugins.map(p => p.name).join(', ')}`,
                    });
                }

                // Remove plugin from enabled list
                const newEnabledPlugins = enabledPlugins.filter((id: string) => id !== input.pluginId);
                const pluginSettings = (clientSettings?.customSettings as any)?.pluginSettings || {};
                delete pluginSettings[input.pluginId];

                await db.update(clientSettingsTable)
                    .set({
                        customSettings: {
                            ...(clientSettings?.customSettings as any || {}),
                            enabledPlugins: newEnabledPlugins,
                            pluginSettings,
                        },
                        updatedAt: new Date(),
                    })
                    .where(eq(clientSettingsTable.clientId, clientId));

                const plugin = MARKETPLACE_PLUGINS.find(p => p.id === input.pluginId);

                return {
                    success: true,
                    message: `Plugin "${plugin?.name || input.pluginId}" uninstalled successfully`,
                };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('[Plugin Uninstall Error]:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to uninstall plugin. Please try again later.',
                });
            }
        }),

    /**
     * Enable/disable a plugin
     */
    toggle: clientProcedure
        .input(z.object({
            pluginId: z.string(),
            enabled: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const db = await getDb();
                const clientId = ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Client context is missing',
                    });
                }

                const { clientSettings: clientSettingsTable } = await import('../../schema_client_settings');
                const clientSettings = await db.query.clientSettings.findFirst({
                    where: eq(clientSettingsTable.clientId, clientId),
                });

                if (!clientSettings) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Client settings not found. Please install the plugin first.',
                    });
                }

                let enabledPlugins = (clientSettings?.customSettings as any)?.enabledPlugins || [];

                if (input.enabled && !enabledPlugins.includes(input.pluginId)) {
                    enabledPlugins = [...enabledPlugins, input.pluginId];
                } else if (!input.enabled) {
                    enabledPlugins = enabledPlugins.filter((id: string) => id !== input.pluginId);
                }

                await db.update(clientSettingsTable)
                    .set({
                        customSettings: {
                            ...(clientSettings?.customSettings as any || {}),
                            enabledPlugins,
                        },
                        updatedAt: new Date(),
                    })
                    .where(eq(clientSettingsTable.clientId, clientId));

                return { success: true, enabled: input.enabled };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('[Plugin Toggle Error]:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to ${input.enabled ? 'enable' : 'disable'} plugin.`,
                });
            }
        }),

    /**
     * Update plugin settings
     */
    updateSettings: clientProcedure
        .input(z.object({
            pluginId: z.string(),
            settings: z.record(z.any()),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const db = await getDb();
                const clientId = ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Client context is missing',
                    });
                }

                const { clientSettings: clientSettingsTable } = await import('../../schema_client_settings');
                const clientSettings = await db.query.clientSettings.findFirst({
                    where: eq(clientSettingsTable.clientId, clientId),
                });

                if (!clientSettings) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Client settings not found. Cannot update settings for uninstalled plugin.',
                    });
                }

                const pluginSettings = (clientSettings?.customSettings as any)?.pluginSettings || {};

                await db.update(clientSettingsTable)
                    .set({
                        customSettings: {
                            ...(clientSettings?.customSettings as any || {}),
                            pluginSettings: {
                                ...pluginSettings,
                                [input.pluginId]: input.settings,
                            },
                        },
                        updatedAt: new Date(),
                    })
                    .where(eq(clientSettingsTable.clientId, clientId));

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('[Plugin Settings Update Error]:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update plugin settings.',
                });
            }
        }),

    /**
     * Get plugin settings
     */
    getSettings: clientProcedure
        .input(z.object({ pluginId: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                const db = await getDb();
                const clientId = ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Client ID is required.',
                    });
                }

                const { clientSettings: clientSettingsTable } = await import('../../schema_client_settings');
                const clientSettings = await db.query.clientSettings.findFirst({
                    where: eq(clientSettingsTable.clientId, clientId),
                });

                const pluginSettings = (clientSettings?.customSettings as any)?.pluginSettings || {};
                return pluginSettings[input.pluginId] || {};
            } catch (error) {
                console.error('[Plugin Settings Fetch Error]:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve plugin settings.',
                });
            }
        }),
});

export default pluginRouter;
