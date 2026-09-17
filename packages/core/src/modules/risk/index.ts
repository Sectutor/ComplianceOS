/**
 * Risk Module - Index
 * 
 * This is the entry point for the Risk module.
 * It exports the router and provides module metadata.
 */

// Import the router
export { riskRouter } from './router';
export { default } from './router';

// Module configuration
export const riskModuleConfig = {
    name: 'risk',
    version: '1.0.0',
    description: 'Risk management module',
    permissions: [
        'risk:read',
        'risk:write',
        'risk:admin',
    ],
    dependencies: ['core', 'clients'],
} as const;
