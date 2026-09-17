/**
 * Self-Hosted Configuration
 * 
 * This module provides environment variable-based feature overrides
 * for self-hosted ComplianceOS instances.
 * 
 * Environment Variables:
 * - SELFHOSTED_FEATURES_ENABLED=1 - Enable self-hosted mode
 * - SELFHOSTED_DISABLE_SAAS_FEATURES=1 - Disable all SaaS-only features
 * - SELFHOSTED_ENABLE_* - Enable specific features (e.g., SELFHOSTED_ENABLE_RISKGAME=1)
 * - SELFHOSTED_DISABLE_* - Disable specific features (e.g., SELFHOSTED_DISABLE_AI=1)
 * - SELFHOSTED_CUSTOM_PLUGINS_PATH - Path to custom plugins directory
 * 
 * Usage:
 * import { getSelfHostedConfig } from '@/lib/selfhosted-config';
 * 
 * const config = getSelfHostedConfig();
 * if (config.isFeatureEnabled('riskGame')) {
 *   // Show feature
 * }
 */

/**
 * Get environment variable with fallback
 */
const getEnv = (key: string, defaultValue: string = ""): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    return defaultValue;
};

/**
 * Self-hosted feature configuration
 */
export interface SelfHostedFeatureConfig {
    enabled: boolean;
    selfHostedMode: boolean;
    disabledFeatures: string[];
    enabledFeatures: string[];
    customPluginsPath: string | null;
    customHooks: Record<string, unknown>;
}

/**
 * Get the self-hosted configuration from environment variables
 */
export function getSelfHostedConfig(): SelfHostedFeatureConfig {
    const isSelfHosted = getEnv('SELFHOSTED_FEATURES_ENABLED') === '1';
    const disableSaasFeatures = getEnv('SELFHOSTED_DISABLE_SAAS_FEATURES') === '1';
    const customPluginsPath = getEnv('SELFHOSTED_CUSTOM_PLUGINS_PATH') || null;

    // Parse enabled features (SELFHOSTED_ENABLE_*)
    const enabledFeatures: string[] = [];
    const disabledFeatures: string[] = [];

    // Check all environment variables for SELFHOSTED_ENABLE_ and SELFHOSTED_DISABLE_ prefixes
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('SELFHOSTED_ENABLE_') && value === '1') {
            const featureName = key.replace('SELFHOSTED_ENABLE_', '').toLowerCase();
            enabledFeatures.push(featureName);
        }
        if (key.startsWith('SELFHOSTED_DISABLE_') && value === '1') {
            const featureName = key.replace('SELFHOSTED_DISABLE_', '').toLowerCase();
            disabledFeatures.push(featureName);
        }
    }

    // SaaS-only features that should be disabled in self-hosted by default
    const saasOnlyFeatures = ['aassistant', 'cloudintegrations', 'multitenant'];

    return {
        enabled: isSelfHosted,
        selfHostedMode: isSelfHosted,
        disabledFeatures: disableSaasFeatures ? [...disabledFeatures, ...saasOnlyFeatures] : disabledFeatures,
        enabledFeatures,
        customPluginsPath,
        customHooks: {},
    };
}

/**
 * Check if a specific feature is enabled via self-hosted config
 */
export function isSelfHostedFeatureEnabled(featureName: string): boolean {
    const config = getSelfHostedConfig();

    if (!config.selfHostedMode) {
        return false;
    }

    const featureLower = featureName.toLowerCase();

    // Check if explicitly disabled
    if (config.disabledFeatures.includes(featureLower)) {
        return false;
    }

    // Check if explicitly enabled
    if (config.enabledFeatures.includes(featureLower)) {
        return true;
    }

    return false;
}

/**
 * Get custom plugins path for self-hosted instances
 */
export function getCustomPluginsPath(): string | null {
    const config = getSelfHostedConfig();
    return config.customPluginsPath;
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHosted(): boolean {
    return getSelfHostedConfig().selfHostedMode;
}

/**
 * Merge self-hosted config with client feature flags
 * Self-hosted env vars take precedence over database settings
 */
export function mergeFeatureFlags(
    databaseFlags: Record<string, boolean>,
    defaultFlags: Record<string, boolean>
): Record<string, boolean> {
    const selfHostedConfig = getSelfHostedConfig();

    // Start with default flags
    const merged = { ...defaultFlags };

    // Override with database flags
    Object.keys(databaseFlags).forEach(key => {
        merged[key] = databaseFlags[key];
    });

    // Apply self-hosted overrides (highest priority)
    if (selfHostedConfig.selfHostedMode) {
        // Disable features
        selfHostedConfig.disabledFeatures.forEach(feature => {
            merged[feature] = false;
        });

        // Enable features
        selfHostedConfig.enabledFeatures.forEach(feature => {
            merged[feature] = true;
        });
    }

    return merged;
}

export default {
    getSelfHostedConfig,
    isSelfHostedFeatureEnabled,
    getCustomPluginsPath,
    isSelfHosted,
    mergeFeatureFlags,
};
