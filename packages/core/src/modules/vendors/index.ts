/**
 * Vendors Module - Index
 */

export { vendorsRouter } from './router';
export { default } from './router';

export const vendorsModuleConfig = {
    name: 'vendors',
    version: '1.0.0',
    permissions: ['client', 'editor', 'admin'],
    dependencies: [],
    features: {
        assessments: true,
        contacts: true,
        contracts: true,
    },
};
