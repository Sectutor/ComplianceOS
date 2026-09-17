/**
 * Employees Module - Index
 */

export { employeesRouter } from './router';
export { default } from './router';

export const employeesModuleConfig = {
    name: 'employees',
    version: '1.0.0',
    description: 'Employee management module',
    permissions: ['employees:read', 'employees:write', 'employees:admin'],
    dependencies: ['core', 'clients'],
} as const;
