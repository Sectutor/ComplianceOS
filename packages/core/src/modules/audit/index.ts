/**
 * Audit Module - Index
 */

export { auditRouter } from './router';
export { default } from './router';

export const auditModuleConfig = {
    name: 'audit',
    version: '1.0.0',
    description: 'Audit logging module',
    permissions: ['audit:read', 'audit:admin'],
    dependencies: ['core', 'clients'],
} as const;
