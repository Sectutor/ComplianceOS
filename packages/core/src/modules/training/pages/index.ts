/**
 * Training Module - Pages Index
 * 
 * Entry point for training module pages.
 */

export { default as TrainingManagement } from './TrainingManagement';
export { default as EmployeeOnboarding } from './EmployeeOnboarding';

// Route configuration for the module
export const trainingRoutes = [
    { path: '/training', component: TrainingManagement },
    { path: '/employee-onboarding', component: EmployeeOnboarding },
];
