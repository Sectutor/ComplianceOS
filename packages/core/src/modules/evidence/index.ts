/**
 * Evidence Module - Index
 */

export { evidenceRouter } from './router';
export { default } from './router';

export const evidenceModuleConfig = {
    name: 'evidence',
    version: '1.0.0',
    description: 'Evidence management module',
    permissions: [
        'evidence:read',
        'evidence:write',
        'evidence:admin',
    ],
    dependencies: ['core', 'clients'],
} as const;
