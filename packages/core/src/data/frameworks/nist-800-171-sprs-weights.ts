/**
 * NIST SP 800-171 DoD Assessment Methodology — SPRS Point Values
 *
 * Source: DoD Assessment Methodology v1.2.1
 * https://www.acq.osd.mil/cmmc/docs-resources.html
 *
 * Each NIST 800-171 requirement is assigned a point weight (1, 3, or 5).
 * The maximum SPRS score is 110.
 * Score = 110 − Σ(weight of each non-compliant requirement)
 * Minimum possible score = −203.
 *
 * Weight 5: Critical security requirements — failure is high impact
 * Weight 3: Important requirements — significant coverage gaps
 * Weight 1: Supporting requirements — lower individual impact
 */

export interface SprsWeight {
    controlId: string;
    weight: 1 | 3 | 5;
    family: string;
}

export const SPRS_WEIGHTS: SprsWeight[] = [
    // ── Access Control (AC) ─────────────────────────────
    { controlId: '3.1.1', weight: 5, family: 'AC' },
    { controlId: '3.1.2', weight: 5, family: 'AC' },
    { controlId: '3.1.3', weight: 5, family: 'AC' },
    { controlId: '3.1.4', weight: 1, family: 'AC' },
    { controlId: '3.1.5', weight: 5, family: 'AC' },
    { controlId: '3.1.6', weight: 1, family: 'AC' },
    { controlId: '3.1.7', weight: 1, family: 'AC' },
    { controlId: '3.1.8', weight: 1, family: 'AC' },
    { controlId: '3.1.9', weight: 1, family: 'AC' },
    { controlId: '3.1.10', weight: 1, family: 'AC' },
    { controlId: '3.1.11', weight: 1, family: 'AC' },
    { controlId: '3.1.12', weight: 3, family: 'AC' },
    { controlId: '3.1.13', weight: 3, family: 'AC' },
    { controlId: '3.1.14', weight: 3, family: 'AC' },
    { controlId: '3.1.15', weight: 1, family: 'AC' },
    { controlId: '3.1.16', weight: 1, family: 'AC' },
    { controlId: '3.1.17', weight: 3, family: 'AC' },
    { controlId: '3.1.18', weight: 1, family: 'AC' },
    { controlId: '3.1.19', weight: 3, family: 'AC' },
    { controlId: '3.1.20', weight: 3, family: 'AC' },
    { controlId: '3.1.21', weight: 1, family: 'AC' },
    { controlId: '3.1.22', weight: 1, family: 'AC' },

    // ── Awareness and Training (AT) ─────────────────────
    { controlId: '3.2.1', weight: 1, family: 'AT' },
    { controlId: '3.2.2', weight: 1, family: 'AT' },
    { controlId: '3.2.3', weight: 1, family: 'AT' },

    // ── Audit and Accountability (AU) ───────────────────
    { controlId: '3.3.1', weight: 5, family: 'AU' },
    { controlId: '3.3.2', weight: 5, family: 'AU' },
    { controlId: '3.3.3', weight: 1, family: 'AU' },
    { controlId: '3.3.4', weight: 1, family: 'AU' },
    { controlId: '3.3.5', weight: 3, family: 'AU' },
    { controlId: '3.3.6', weight: 1, family: 'AU' },
    { controlId: '3.3.7', weight: 1, family: 'AU' },
    { controlId: '3.3.8', weight: 3, family: 'AU' },
    { controlId: '3.3.9', weight: 1, family: 'AU' },

    // ── Configuration Management (CM) ───────────────────
    { controlId: '3.4.1', weight: 3, family: 'CM' },
    { controlId: '3.4.2', weight: 3, family: 'CM' },
    { controlId: '3.4.3', weight: 1, family: 'CM' },
    { controlId: '3.4.4', weight: 1, family: 'CM' },
    { controlId: '3.4.5', weight: 1, family: 'CM' },
    { controlId: '3.4.6', weight: 3, family: 'CM' },
    { controlId: '3.4.7', weight: 3, family: 'CM' },
    { controlId: '3.4.8', weight: 3, family: 'CM' },
    { controlId: '3.4.9', weight: 1, family: 'CM' },

    // ── Identification and Authentication (IA) ──────────
    { controlId: '3.5.1', weight: 5, family: 'IA' },
    { controlId: '3.5.2', weight: 5, family: 'IA' },
    { controlId: '3.5.3', weight: 5, family: 'IA' },
    { controlId: '3.5.4', weight: 3, family: 'IA' },
    { controlId: '3.5.5', weight: 1, family: 'IA' },
    { controlId: '3.5.6', weight: 1, family: 'IA' },
    { controlId: '3.5.7', weight: 3, family: 'IA' },
    { controlId: '3.5.8', weight: 1, family: 'IA' },
    { controlId: '3.5.9', weight: 1, family: 'IA' },
    { controlId: '3.5.10', weight: 5, family: 'IA' },
    { controlId: '3.5.11', weight: 1, family: 'IA' },

    // ── Incident Response (IR) ──────────────────────────
    { controlId: '3.6.1', weight: 5, family: 'IR' },
    { controlId: '3.6.2', weight: 3, family: 'IR' },
    { controlId: '3.6.3', weight: 1, family: 'IR' },

    // ── Maintenance (MA) ────────────────────────────────
    { controlId: '3.7.1', weight: 1, family: 'MA' },
    { controlId: '3.7.2', weight: 1, family: 'MA' },
    { controlId: '3.7.3', weight: 1, family: 'MA' },
    { controlId: '3.7.4', weight: 1, family: 'MA' },
    { controlId: '3.7.5', weight: 3, family: 'MA' },
    { controlId: '3.7.6', weight: 1, family: 'MA' },

    // ── Media Protection (MP) ───────────────────────────
    { controlId: '3.8.1', weight: 3, family: 'MP' },
    { controlId: '3.8.2', weight: 1, family: 'MP' },
    { controlId: '3.8.3', weight: 3, family: 'MP' },
    { controlId: '3.8.4', weight: 1, family: 'MP' },
    { controlId: '3.8.5', weight: 1, family: 'MP' },
    { controlId: '3.8.6', weight: 3, family: 'MP' },
    { controlId: '3.8.7', weight: 1, family: 'MP' },
    { controlId: '3.8.8', weight: 1, family: 'MP' },
    { controlId: '3.8.9', weight: 3, family: 'MP' },

    // ── Personnel Security (PS) ─────────────────────────
    { controlId: '3.9.1', weight: 1, family: 'PS' },
    { controlId: '3.9.2', weight: 1, family: 'PS' },

    // ── Physical Protection (PE) ────────────────────────
    { controlId: '3.10.1', weight: 3, family: 'PE' },
    { controlId: '3.10.2', weight: 3, family: 'PE' },
    { controlId: '3.10.3', weight: 1, family: 'PE' },
    { controlId: '3.10.4', weight: 1, family: 'PE' },
    { controlId: '3.10.5', weight: 1, family: 'PE' },
    { controlId: '3.10.6', weight: 1, family: 'PE' },

    // ── Risk Assessment (RA) ────────────────────────────
    { controlId: '3.11.1', weight: 3, family: 'RA' },
    { controlId: '3.11.2', weight: 5, family: 'RA' },
    { controlId: '3.11.3', weight: 3, family: 'RA' },

    // ── Security Assessment (CA) ────────────────────────
    { controlId: '3.12.1', weight: 3, family: 'CA' },
    { controlId: '3.12.2', weight: 3, family: 'CA' },
    { controlId: '3.12.3', weight: 3, family: 'CA' },
    { controlId: '3.12.4', weight: 5, family: 'CA' },

    // ── System and Communications Protection (SC) ───────
    { controlId: '3.13.1', weight: 5, family: 'SC' },
    { controlId: '3.13.2', weight: 3, family: 'SC' },
    { controlId: '3.13.3', weight: 1, family: 'SC' },
    { controlId: '3.13.4', weight: 1, family: 'SC' },
    { controlId: '3.13.5', weight: 5, family: 'SC' },
    { controlId: '3.13.6', weight: 3, family: 'SC' },
    { controlId: '3.13.7', weight: 1, family: 'SC' },
    { controlId: '3.13.8', weight: 5, family: 'SC' },
    { controlId: '3.13.9', weight: 1, family: 'SC' },
    { controlId: '3.13.10', weight: 1, family: 'SC' },
    { controlId: '3.13.11', weight: 5, family: 'SC' },
    { controlId: '3.13.13', weight: 1, family: 'SC' },
    { controlId: '3.13.14', weight: 1, family: 'SC' },
    { controlId: '3.13.15', weight: 3, family: 'SC' },
    { controlId: '3.13.16', weight: 5, family: 'SC' },

    // ── System and Information Integrity (SI) ───────────
    { controlId: '3.14.1', weight: 5, family: 'SI' },
    { controlId: '3.14.2', weight: 5, family: 'SI' },
    { controlId: '3.14.3', weight: 3, family: 'SI' },
    { controlId: '3.14.4', weight: 3, family: 'SI' },
    { controlId: '3.14.5', weight: 3, family: 'SI' },
    { controlId: '3.14.6', weight: 5, family: 'SI' },
    { controlId: '3.14.7', weight: 3, family: 'SI' },
];

/** Pre-built lookup map: controlId → weight */
export const SPRS_WEIGHT_MAP = new Map<string, number>(
    SPRS_WEIGHTS.map(w => [w.controlId, w.weight])
);

/** Total possible point deductions (sum of all weights) = 313 */
export const SPRS_MAX_DEDUCTION = SPRS_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);

/** Maximum SPRS score */
export const SPRS_MAX_SCORE = 110;

/** Minimum SPRS score */
export const SPRS_MIN_SCORE = SPRS_MAX_SCORE - SPRS_MAX_DEDUCTION; // -203

/** Get family-level score summary */
export function getFamilyScoreSummary(assessmentMap: Map<string, any>) {
    const families: Record<string, { total: number; deducted: number; compliant: number; count: number }> = {};

    for (const w of SPRS_WEIGHTS) {
        if (!families[w.family]) {
            families[w.family] = { total: 0, deducted: 0, compliant: 0, count: 0 };
        }
        families[w.family].total += w.weight;
        families[w.family].count += 1;

        const assessment = assessmentMap.get(w.controlId);
        if (assessment?.complianceStatus === 'Compliant') {
            families[w.family].compliant += 1;
        } else {
            families[w.family].deducted += w.weight;
        }
    }

    return families;
}

/** Calculate the real SPRS score */
export function calculateSprsScore(assessmentMap: Map<string, any>): {
    score: number;
    totalControls: number;
    compliantCount: number;
    partialCount: number;
    nonCompliantCount: number;
    notStartedCount: number;
    totalDeduction: number;
    weightBreakdown: { weight5: { total: number; met: number }; weight3: { total: number; met: number }; weight1: { total: number; met: number } };
} {
    let totalDeduction = 0;
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;
    let notStartedCount = 0;

    const weightBreakdown = {
        weight5: { total: 0, met: 0 },
        weight3: { total: 0, met: 0 },
        weight1: { total: 0, met: 0 },
    };

    for (const w of SPRS_WEIGHTS) {
        const key = w.weight === 5 ? 'weight5' : w.weight === 3 ? 'weight3' : 'weight1';
        weightBreakdown[key].total += 1;

        const assessment = assessmentMap.get(w.controlId);
        const status = assessment?.complianceStatus;

        if (status === 'Compliant') {
            compliantCount++;
            weightBreakdown[key].met += 1;
        } else if (status === 'Partial') {
            partialCount++;
            // Per DoD methodology, partial = full deduction unless documented in POA&M
            totalDeduction += w.weight;
        } else if (status === 'Non-Compliant') {
            nonCompliantCount++;
            totalDeduction += w.weight;
        } else {
            notStartedCount++;
            totalDeduction += w.weight;
        }
    }

    return {
        score: SPRS_MAX_SCORE - totalDeduction,
        totalControls: SPRS_WEIGHTS.length,
        compliantCount,
        partialCount,
        nonCompliantCount,
        notStartedCount,
        totalDeduction,
        weightBreakdown,
    };
}
