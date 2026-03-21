/**
 * Custom Hooks System
 * 
 * This module provides a way for self-hosted instances to define
 * custom business logic hooks that can be executed from the UI.
 * 
 * Usage:
 * import { registerCustomHook, executeCustomHook } from '@/lib/custom-hooks';
 * 
 * // Register a custom button action
 * registerCustomHook('risk:approve', async (context) => {
 *   // Custom approval logic
 *   return { success: true };
 * });
 */

import { getSelfHostedConfig } from './selfhosted-config';

/**
 * Custom hook context
 */
export interface CustomHookContext {
    clientId: number;
    userId?: number;
    data: Record<string, any>;
    metadata?: Record<string, any>;
}

/**
 * Custom hook result
 */
export interface CustomHookResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Custom hook function type
 */
export type CustomHookFunction = (context: CustomHookContext) => Promise<CustomHookResult>;

/**
 * Custom hook definition
 */
export interface CustomHookDefinition {
    id: string;
    name: string;
    description: string;
    category: 'button' | 'validation' | 'transform' | 'notification';
    permissions?: string[];
    handler: CustomHookFunction;
}

/**
 * Registry of custom hooks
 */
const hookRegistry: Map<string, CustomHookDefinition> = new Map();

/**
 * Get all registered hooks
 */
export function getRegisteredHooks(): CustomHookDefinition[] {
    return Array.from(hookRegistry.values());
}

/**
 * Get hooks by category
 */
export function getHooksByCategory(category: string): CustomHookDefinition[] {
    return Array.from(hookRegistry.values()).filter(hook => hook.category === category);
}

/**
 * Get a specific hook by ID
 */
export function getHook(id: string): CustomHookDefinition | undefined {
    return hookRegistry.get(id);
}

/**
 * Register a custom hook
 */
export function registerCustomHook(hook: CustomHookDefinition): void {
    // Check if self-hosted mode is enabled (hooks should only be registered in self-hosted)
    const config = getSelfHostedConfig();
    
    if (!config.selfHostedMode) {
        console.warn(`[CustomHooks] Ignoring hook registration '${hook.id}' - not in self-hosted mode`);
        return;
    }
    
    hookRegistry.set(hook.id, hook);
    console.log(`[CustomHooks] Registered hook: ${hook.id}`);
}

/**
 * Execute a custom hook
 */
export async function executeCustomHook(
    hookId: string,
    context: CustomHookContext
): Promise<CustomHookResult> {
    const hook = hookRegistry.get(hookId);
    
    if (!hook) {
        return {
            success: false,
            error: `Hook '${hookId}' not found`,
        };
    }
    
    try {
        const result = await hook.handler(context);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Predefined hook categories for UI integration
 */

// Button hooks - for custom action buttons
export const ButtonHooks = {
    /**
     * Example: Add a custom "Escalate" button to risk items
     * 
     * In your customSettings JSON:
     * {
     *   "customButtons": [
     *     {
     *       "hookId": "risk:escalate",
     *       "label": "Escalate to Manager",
     *       "icon": "arrow-up"
     *     }
     *   ]
     * }
     */
    RISK_ESCALATE: 'risk:escalate',
    RISK_APPROVE: 'risk:approve',
    RISK_REJECT: 'risk:reject',
    
    // Policy hooks
    POLICY_APPROVE: 'policy:approve',
    POLICY_REJECT: 'policy:reject',
    
    // Control hooks
    CONTROL_IMPLEMENT: 'control:implement',
    CONTROL_VERIFY: 'control:verify',
    
    // Vendor hooks
    VENDOR_APPROVE: 'vendor:approve',
    VENDOR_BLOCK: 'vendor:block',
};

// Validation hooks - for custom validation logic
export const ValidationHooks = {
    RISK_CREATE: 'risk:validate:create',
    POLICY_SAVE: 'policy:validate:save',
    EVIDENCE_UPLOAD: 'evidence:validate:upload',
};

// Transform hooks - for data transformation
export const TransformHooks = {
    RISK_CALCULATE: 'risk:transform:calculate',
    COMPLIANCE_SCORE: 'compliance:transform:score',
};

// Notification hooks - for custom notifications
export const NotificationHooks = {
    RISK_CREATED: 'risk:notify:created',
    POLICY_APPROVED: 'policy:notify:approved',
};

/**
 * Hook to use in React components
 */
export function useCustomHooks() {
    const config = getSelfHostedConfig();
    
    return {
        isEnabled: config.selfHostedMode,
        hooks: getRegisteredHooks(),
        execute: executeCustomHook,
        getByCategory: getHooksByCategory,
    };
}

export default {
    registerCustomHook,
    executeCustomHook,
    getRegisteredHooks,
    getHooksByCategory,
    getHook,
    useCustomHooks,
    ButtonHooks,
    ValidationHooks,
    TransformHooks,
    NotificationHooks,
};
