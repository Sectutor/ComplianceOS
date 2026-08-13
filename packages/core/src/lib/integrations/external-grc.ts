/**
 * External GRC Integration
 *
 * Integration for connecting to an external GRC tool (e.g., http://localhost:5173).
 */

import type {
    IntegrationManifest,
    IntegrationContext,
    IntegrationResult
} from '../types';

export const externalGRCManifest: IntegrationManifest = {
    slug: 'external-grc',
    name: 'External GRC Tool',
    version: '1.0.0',
    description: 'Connect to your existing external GRC tool (e.g. running on localhost:5173) to synchronize controls, policies, and evidence.',
    author: {
        name: 'ComplianceOS',
    },
    license: 'MIT',
    category: 'governance',
    tags: ['grc', 'governance', 'risk', 'compliance', 'external'],
    icon: '??',

    capabilities: {
        read: true,
        write: true,
        sync: true
    },

    authentication: {
        type: 'apiKey',
        fields: [
            {
                key: 'apiUrl',
                type: 'string',
                label: 'GRC API URL',
                description: 'The URL of your external GRC tool (e.g., http://localhost:5173/api)',
                required: true,
                placeholder: 'http://localhost:5173/api'
            },
            {
                key: 'apiKey',
                type: 'password',
                label: 'API Key',
                description: 'API key to authenticate with the external GRC tool',
                required: false,
                sensitive: true
            }
        ]
    },

    actions: [
        {
            id: 'sync-controls',
            name: 'Sync Controls',
            description: 'Synchronize controls from the external GRC tool',
            outputSchema: {
                type: 'object',
                properties: {
                    synced: { type: 'number' },
                    status: { type: 'string' }
                }
            }
        },
        {
            id: 'export-evidence',
            name: 'Export Evidence',
            description: 'Export evidence to the external GRC tool',
            inputSchema: {
                type: 'object',
                properties: {
                    evidenceId: { type: 'string' }
                },
                required: ['evidenceId']
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                }
            }
        }
    ],

    triggers: [],

    complianceosVersion: '1.0.0'
};

export const executeExternalGRCAction = async (
    actionId: string,
    context: IntegrationContext,
    params?: any
): Promise<IntegrationResult> => {
    const apiUrl = context.credentials.apiUrl;
    const apiKey = context.credentials.apiKey;
    
    console.log("[External GRC] Executing action: ${actionId} against ${apiUrl}");

    try {
        switch (actionId) {
            case 'sync-controls':
                // In a real implementation, we would make a fetch call to apiUrl
                // const response = await fetch("${apiUrl}/controls", {
                //     headers: { 'Authorization': "Bearer ${apiKey}" }
                // });
                return {
                    success: true,
                    data: { synced: 42, status: 'Success (Mocked)' },
                    timestamp: new Date()
                };
            
            case 'export-evidence':
                return {
                    success: true,
                    data: { success: true, message: "Evidence ${params?.evidenceId || 'unknown'} exported successfully (Mocked)" },
                    timestamp: new Date()
                };
            
            default:
                throw new Error("Unsupported action: ${actionId}");
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
};
