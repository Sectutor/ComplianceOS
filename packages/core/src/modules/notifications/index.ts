/**
 * Notifications Module - Index
 */

export { notificationsRouter } from './router';
export { default } from './router';

export const notificationsModuleConfig = {
    name: 'notifications',
    version: '1.0.0',
    permissions: ['notifications:read'],
    dependencies: ['core', 'clients'],
} as const;
