/**
 * Dashboard Module - Index
 */

export { dashboardRouter } from './router';
export { default } from './router';
export const dashboardModuleConfig = {
    name: 'dashboard',
    version: '1.0.0',
    description: 'Dashboard module',
    permissions: ['dashboard:read'],
    dependencies: ['core', 'clients'],
} as const;
