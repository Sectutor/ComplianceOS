/**
 * Compliance Module - Index
 * 
 * This is the entry point for the Compliance module.
 * It exports the router and provides module metadata.
 */

// Import the router
export { complianceRouter } from './router';
export { default } from './router';

// Module configuration
export const complianceModuleConfig = {
    name: 'compliance',
    version: '1.0.0',
    description: 'Compliance and controls management module',
    permissions: [
        'compliance:read',
        'compliance:write',
        'compliance:admin',
    ],
    dependencies: ['core', 'clients'],
} as const;

// Re-export types for convenience
export type {
    ClientControl,
    ComplianceRequirement,
} from '../../schema';
