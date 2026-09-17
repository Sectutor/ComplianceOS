/**
 * Integrations Module - Index
 */

export { integrationsRouter } from './router';
export { default } from './router';

export const integrationsModuleConfig = {
    name: 'integrations',
    version: '1.0.0',
    permissions: ['client', 'editor', 'admin'],
    dependencies: [],
    features: {
        oauth: true,
        webhooks: true,
        sync: true,
    },
};
