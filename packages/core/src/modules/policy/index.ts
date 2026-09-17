/**
 * Policy Module - Index
 * 
 * This is the entry point for the Policy module.
 */

export { policyRouter } from './router';
export { default } from './router';

export const policyModuleConfig = {
  name: 'policy',
  version: '1.0.0',
  description: 'Policy management module',
  permissions: [
    'policy:read',
    'policy:write',
    'policy:admin',
  ],
  dependencies: ['core', 'clients'],
} as const;
