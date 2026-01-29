/**
 * Risk Calculation Utilities
 * Provides automated residual risk calculation based on inherent risk and control effectiveness
 */

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';
export type ControlEffectiveness = 'Effective' | 'Partially Effective' | 'Ineffective' | '';

/**
 * Map risk levels to numeric scores for calculation
 */
const RISK_SCORES: Record<RiskLevel, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
    'Very High': 4,
};

/**
 * Map control effectiveness to reduction values
 */
const CONTROL_REDUCTION: Record<ControlEffectiveness, number> = {
    'Effective': 2,
    'Partially Effective': 1,
    'Ineffective': 0,
    '': 0, // No controls = no reduction
};

/**
 * Convert numeric score back to risk level
 */
export function scoreToRiskLevel(score: number): RiskLevel {
    if (score <= 1) return 'Low';
    if (score <= 2) return 'Medium';
    if (score <= 3) return 'High';
    return 'Very High';
}

/**
 * Convert 1-16 matrix score to risk level (4-point scale)
 */
export function getMatrixScoreLevel(score: number): RiskLevel {
    if (score >= 12) return 'Very High';
    if (score >= 8) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
}

/**
 * Calculate residual risk based on inherent risk and control effectiveness
 * @param inherentRisk - The inherent risk level before controls
 * @param controlEffectiveness - How effective the implemented controls are
 * @returns The calculated residual risk level
 */
export function calculateResidualRisk(
    inherentRisk: RiskLevel | '',
    controlEffectiveness: ControlEffectiveness
): RiskLevel | '' {
    // If no inherent risk is set, return empty
    if (!inherentRisk) return '';

    const inherentScore = RISK_SCORES[inherentRisk];
    const reduction = CONTROL_REDUCTION[controlEffectiveness];

    // Calculate residual score (minimum of 1, cannot go below Low)
    const residualScore = Math.max(1, inherentScore - reduction);

    return scoreToRiskLevel(residualScore);
}

/**
 * Calculate residual score (numeric) based on inherent score and control effectiveness
 */
export function calculateResidualScore(
    inherentScore: number,
    controlEffectiveness: ControlEffectiveness
): number {
    const reduction = CONTROL_REDUCTION[controlEffectiveness] || 0;
    return Math.max(1, inherentScore - reduction);
}

/**
 * Calculate inherent score from likelihood and impact
 * @param likelihood - 1-5
 * @param impact - 1-5
 * @returns 1-25
 */
export function calculateInherentScore(likelihood: number, impact: number): number {
    return likelihood * impact;
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(riskLevel: RiskLevel | ''): string {
    switch (riskLevel) {
        case 'Very High':
            return 'bg-red-600 text-white';
        case 'High':
            return 'bg-orange-500 text-white';
        case 'Medium':
            return 'bg-amber-400 text-amber-950'; // Yellow/Amber with dark text for contrast
        case 'Low':
            return 'bg-green-600 text-white';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-400';
    }
}

export function getRiskLevelTextColor(riskLevel: RiskLevel | ''): string {
    switch (riskLevel) {
        case 'Very High':
            return 'text-red-700';
        case 'High':
            return 'text-orange-700';
        case 'Medium':
            return 'text-amber-700';
        case 'Low':
            return 'text-green-700';
        default:
            return 'text-gray-900';
    }
}

/**
 * Calculate risk score (numeric) for sorting and filtering
 */
export function getRiskScore(riskLevel: RiskLevel | ''): number {
    return riskLevel ? RISK_SCORES[riskLevel] : 0;
}
