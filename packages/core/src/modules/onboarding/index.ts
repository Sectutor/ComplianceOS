/**
 * Onboarding Module - Index
 */

export { onboardingRouter } from './router';
export { default } from './router';

export const onboardingModuleConfig = {
    name: 'onboarding',
    version: '1.0.0',
    permissions: ['client', 'editor', 'admin'],
    dependencies: [],
    features: {
        employees: true,
        training: true,
        acknowledgments: true,
        securitySetup: true,
        assetReceipts: true,
    },
};
