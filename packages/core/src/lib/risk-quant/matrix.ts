
/**
 * Advanced Risk Matrix based on ENISA / ISO 31000
 * Provides qualitative descriptions for 5x5 matrix
 */

export interface MatrixLevel {
    value: number;
    label: string;
    description: string;
    color: string;
}

export const LIKELIHOOD_LEVELS: MatrixLevel[] = [
    { value: 1, label: 'Rare', description: 'May occur only in exceptional circumstances.', color: 'text-green-600' },
    { value: 2, label: 'Unlikely', description: 'Could occur at some time.', color: 'text-emerald-600' },
    { value: 3, label: 'Possible', description: 'Should occur at some time.', color: 'text-amber-600' },
    { value: 4, label: 'Likely', description: 'Will probably occur in most circumstances.', color: 'text-orange-600' },
    { value: 5, label: 'Almost Certain', description: 'Is expected to occur in most circumstances.', color: 'text-rose-600' },
];

export const IMPACT_LEVELS: MatrixLevel[] = [
    { value: 1, label: 'Insignificant', description: 'No financial loss, minor localized impact.', color: 'text-green-600' },
    { value: 2, label: 'Minor', description: 'Small loss, short-term disruption.', color: 'text-emerald-600' },
    { value: 3, label: 'Moderate', description: 'Significant loss, medium-term recovery.', color: 'text-amber-600' },
    { value: 4, label: 'Major', description: 'Large loss, major service interruption.', color: 'text-orange-600' },
    { value: 5, label: 'Catastrophic', description: 'Enormous loss, business shutdown feared.', color: 'text-rose-600' },
];

export function getMatrixLevel(value: number, type: 'likelihood' | 'impact'): MatrixLevel {
    const levels = type === 'likelihood' ? LIKELIHOOD_LEVELS : IMPACT_LEVELS;
    return levels.find(l => l.value === value) || levels[2];
}

export function getScoreLevel(score: number): { label: string; color: string; bg: string } {
    if (score >= 20) return { label: 'Critical', color: 'text-red-900', bg: 'bg-red-200' };
    if (score >= 12) return { label: 'High', color: 'text-orange-900', bg: 'bg-orange-200' };
    if (score >= 8) return { label: 'Medium', color: 'text-amber-900', bg: 'bg-amber-200' };
    return { label: 'Low', color: 'text-emerald-900', bg: 'bg-emerald-200' };
}
