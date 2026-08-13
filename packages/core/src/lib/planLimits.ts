export const PLAN_LIMITS = {
    consultant: {
        maxPolicies: Infinity,
        maxUsers: Infinity,
        maxClients: 2,
        aiEnabled: true,
        allowSelfHosted: true,
        aiRequestsPerHour: Infinity,
        aiRequestsPerDay: Infinity,
        aiTokensPerDay: Infinity,
        aiCostPerDayCents: Infinity,
    },
    enterprise: {
        maxPolicies: Infinity,
        maxUsers: Infinity,
        maxClients: Infinity,
        aiEnabled: true,
        allowSelfHosted: true,
        aiRequestsPerHour: Infinity,
        aiRequestsPerDay: Infinity,
        aiTokensPerDay: Infinity,
        aiCostPerDayCents: Infinity,
    }
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export const getPlanLimits = (tier: string | null | undefined) => {
    const validTier = (tier === 'enterprise') ? 'enterprise' : 'consultant';
    return PLAN_LIMITS[validTier];
};
