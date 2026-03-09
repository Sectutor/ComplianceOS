
export interface IncidentSeveirtyCriteria {
    affectedUsers?: number;
    durationMinutes?: number;
    financialLossCents?: number;
    publicSafetyImpact?: boolean;
    criticalInfrastructureAffected?: boolean;
    dataIntegrityCompromised?: boolean;
}

export function calculateNIS2Significance(criteria: IncidentSeveirtyCriteria): { 
    isSignificant: boolean; 
    reasons: string[];
    nextDeadline: '24h' | '72h' | '1mo' | null;
} {
    const reasons: string[] = [];
    
    // NIS2 Article 23(3) criteria
    if (criteria.durationMinutes && criteria.durationMinutes > 120) {
        reasons.push("Operational disruption exceeds 2 hours");
    }
    
    if (criteria.affectedUsers && criteria.affectedUsers > 1000) {
        reasons.push("Large number of users affected (>1000)");
    }
    
    if (criteria.financialLossCents && criteria.financialLossCents > 1000000) { // >€10,000
        reasons.push("Significant financial loss detected");
    }
    
    if (criteria.publicSafetyImpact) {
        reasons.push("Direct impact on public safety or health");
    }
    
    if (criteria.criticalInfrastructureAffected) {
        reasons.push("Critical infrastructure service disruption");
    }

    const isSignificant = reasons.length > 0;
    
    return {
        isSignificant,
        reasons,
        nextDeadline: isSignificant ? '24h' : null
    };
}

export function getReportingDeadlines(detectedAt: Date) {
    const earlyWarning = new Date(detectedAt.getTime() + 24 * 60 * 60 * 1000);
    const incidentNotification = new Date(detectedAt.getTime() + 72 * 60 * 60 * 1000);
    const finalReport = new Date(detectedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
        earlyWarning,
        incidentNotification,
        finalReport
    };
}
