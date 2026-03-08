/**
 * Frameworks Module - Index
 */

export { frameworksRouter } from './router';
export { default } from './router';

export const frameworksModuleConfig = {
    name: 'frameworks',
    version: '1.0.0',
    permissions: ['frameworks:read'],
    dependencies: ['core'],
} as const;
