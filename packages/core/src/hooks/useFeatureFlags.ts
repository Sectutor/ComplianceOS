import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { isSelfHostedFeatureEnabled } from '@/lib/selfhosted-config';
import { areLocalPluginsEnabled } from '@/lib/local-plugins';

/**
 * Hook to check if a specific feature is enabled for the current client
 * 
 * Usage:
 * const { isFeatureEnabled } = useFeatureFlags();
 * 
 * if (isFeatureEnabled('aiAssistant')) {
 *   // Show AI features
 * }
 * 
 * if (isFeatureEnabled('customWorkflows')) {
 *   // Show custom workflow features
 * }
 */
export function useFeatureFlags() {
    const { selectedClientId } = useClientContext();

    const { data: clientSettings, isLoading } = trpc.settings.getClientSettings.useQuery(
        { clientId: selectedClientId || 0 },
        { enabled: !!selectedClientId }
    );

    const featureFlags = (clientSettings?.featureFlags as Record<string, boolean>) || {};

    // Default features that are enabled for all clients (visible in admin UI)
    const defaultFeatures: Record<string, boolean> = {
        aiAssistant: true,
        advancedAnalytics: true,
        threatIntel: true,
        customWorkflows: false,
        customBranding: true,
        evidenceManagement: true,
        policyManagement: true,
        riskManagement: true,
        complianceTracking: true,
        auditLogs: true,
        reporting: true,
    };

    // Client-specific features - these are NOT shown in admin UI by default
    // They must be explicitly enabled in the database
    const clientSpecificFeatures: Record<string, boolean> = {
        riskGame: false,  // Only specific clients have this enabled
    };

    const isFeatureEnabled = (featureName: string): boolean => {
        // Check self-hosted environment overrides first (highest priority for self-hosted)
        // Note: isSelfHostedFeatureEnabled only returns true if explicitly enabled in env
        if (isSelfHostedFeatureEnabled(featureName)) {
            return true;
        }

        // Check if it's a client-specific feature
        if (clientSpecificFeatures.hasOwnProperty(featureName)) {
            // Only enable if explicitly set in client settings
            if (featureFlags.hasOwnProperty(featureName)) {
                return featureFlags[featureName];
            }
            return false; // Hidden by default
        }

        // For standard features: if client has settings, use those; otherwise use defaults
        if (featureFlags.hasOwnProperty(featureName)) {
            return featureFlags[featureName];
        }
        return defaultFeatures[featureName] ?? false;
    };

    return {
        isFeatureEnabled,
        featureFlags: { ...defaultFeatures, ...featureFlags },
        isLoading,
        // Only return standard features for admin UI - hide client-specific features
        availableFeatures: Object.keys(defaultFeatures),
        // Self-hosted plugins
        localPluginsEnabled: areLocalPluginsEnabled(),
    };
}

/**
 * List of available feature flags with descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<string, { name: string; description: string; default: boolean }> = {
    aiAssistant: {
        name: 'AI Assistant',
        description: 'Enable AI-powered compliance recommendations and automation',
        default: true,
    },
    advancedAnalytics: {
        name: 'Advanced Analytics',
        description: 'Enable detailed compliance analytics and reporting dashboards',
        default: true,
    },
    threatIntel: {
        name: 'Threat Intelligence',
        description: 'Enable threat intelligence feeds and vulnerability tracking',
        default: true,
    },
    customWorkflows: {
        name: 'Custom Workflows',
        description: 'Enable custom workflow automation builder',
        default: false,
    },
    customBranding: {
        name: 'Custom Branding',
        description: 'Allow custom logo, colors, and portal title',
        default: true,
    },
    evidenceManagement: {
        name: 'Evidence Management',
        description: 'Enable evidence library and file management',
        default: true,
    },
    policyManagement: {
        name: 'Policy Management',
        description: 'Enable policy creation and distribution',
        default: true,
    },
    riskManagement: {
        name: 'Risk Management',
        description: 'Enable risk assessment and treatment tracking',
        default: true,
    },
    complianceTracking: {
        name: 'Compliance Tracking',
        description: 'Enable compliance framework mapping and tracking',
        default: true,
    },
    auditLogs: {
        name: 'Audit Logs',
        description: 'Enable comprehensive audit logging',
        default: true,
    },
    reporting: {
        name: 'Reporting',
        description: 'Enable report generation and exports',
        default: true,
    },
    // Premium features - disabled by default
    whiteLabeling: {
        name: 'White Labeling',
        description: 'Remove ComplianceOS branding completely',
        default: false,
    },
    apiAccess: {
        name: 'API Access',
        description: 'Enable REST API access for integrations',
        default: false,
    },
    sso: {
        name: 'Single Sign-On (SSO)',
        description: 'Enable SSO authentication providers',
        default: false,
    },
    advancedAutomation: {
        name: 'Advanced Automation',
        description: 'Enable complex workflow automation',
        default: false,
    },
    riskGame: {
        name: 'Risk Game',
        description: 'Interactive risk simulation game for training and awareness',
        default: false,
    },
};

export default useFeatureFlags;
