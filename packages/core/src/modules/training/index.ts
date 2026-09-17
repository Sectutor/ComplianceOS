/**
 * Training Module - Index
 * 
 * This is the entry point for the Training module.
 * It exports the router and provides module metadata.
 */

// Import the router
export { trainingRouter } from './router';
export { default } from './router';

// Module configuration
export const trainingModuleConfig = {
    name: 'training',
    version: '1.0.0',
    description: 'Training and learning management module',
    permissions: [
        'training:read',
        'training:write',
        'training:admin',
    ],
    dependencies: ['core', 'clients'],
} as const;

// Re-export types for convenience
export type {
    TrainingModule,
    InsertTrainingModule,
    TrainingAssignment,
    InsertTrainingAssignment
} from '../../schema';
