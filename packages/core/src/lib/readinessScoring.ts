// Real-time readiness scoring engine for executive dashboard
import { trpc } from '@/lib/trpc';

export interface ReadinessScore {
  overall: number;
  evidenceCoverage: number;
  evidenceFreshness: number;
  controlImplementation: number;
  riskExposure: number;
  auditRisk: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

export interface RiskHeatmapData {
  controlId: string;
  controlName: string;
  framework: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  evidenceStatus: 'verified' | 'pending' | 'expired' | 'missing';
  daysUntilAudit?: number;
}

export const calculateReadinessScore = async (clientId: number): Promise<ReadinessScore> => {
  // Fetch all necessary data in parallel
  const [
    controlsData,
    evidenceData,
    risksData,
    auditsData
  ] = await Promise.all([
    trpc.clientControls.list.query({ clientId }),
    trpc.evidence.list.query({ clientId }),
    trpc.risks.list.query({ clientId }),
    trpc.audit.listUpcoming.query({ clientId })
  ]);

  // Calculate evidence coverage
  const implementedControls = controlsData.filter(c => c.status === 'implemented');
  const controlsWithEvidence = new Set(evidenceData.map(e => e.clientControlId));
  const evidenceCoverage = implementedControls.length > 0 
    ? (implementedControls.filter(c => controlsWithEvidence.has(c.id)).length / implementedControls.length) * 100
    : 0;

  // Calculate evidence freshness
  const verifiedEvidence = evidenceData.filter(e => e.status === 'verified');
  const freshEvidence = verifiedEvidence.filter(e => {
    const expirationDate = e.expirationDate ? new Date(e.expirationDate) : null;
    return !expirationDate || expirationDate > new Date();
  });
  const evidenceFreshness = verifiedEvidence.length > 0 
    ? (freshEvidence.length / verifiedEvidence.length) * 100
    : 0;

  // Calculate control implementation rate
  const controlImplementation = controlsData.length > 0 
    ? (implementedControls.length / controlsData.length) * 100
    : 0;

  // Calculate risk exposure
  const highRisks = risksData.filter(r => {
    const likelihood = r.likelihood || 0;
    const impact = r.impact || 0;
    return likelihood * impact >= 12; // High risk threshold
  });
  const riskExposure = risksData.length > 0 
    ? 100 - ((highRisks.length / risksData.length) * 100)
    : 100;

  // Calculate overall readiness score (weighted average)
  const overall = Math.round(
    (evidenceCoverage * 0.35) + 
    (evidenceFreshness * 0.25) + 
    (controlImplementation * 0.25) + 
    (riskExposure * 0.15)
  );

  // Determine audit risk level
  const nextAudit = auditsData[0];
  const daysUntilAudit = nextAudit ? Math.ceil((new Date(nextAudit.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  
  let auditRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (daysUntilAudit !== null && daysUntilAudit <= 30) {
    if (overall >= 80) auditRisk = 'low';
    else if (overall >= 60) auditRisk = 'medium';
    else if (overall >= 40) auditRisk = 'high';
    else auditRisk = 'critical';
  } else {
    auditRisk = overall >= 70 ? 'low' : overall >= 50 ? 'medium' : 'high';
  }

  return {
    overall,
    evidenceCoverage: Math.round(evidenceCoverage),
    evidenceFreshness: Math.round(evidenceFreshness),
    controlImplementation: Math.round(controlImplementation),
    riskExposure: Math.round(riskExposure),
    auditRisk,
    lastUpdated: new Date()
  };
};

export const generateRiskHeatmap = async (clientId: number): Promise<RiskHeatmapData[]> => {
  const [controls, evidence, risks] = await Promise.all([
    trpc.clientControls.list.query({ clientId }),
    trpc.evidence.list.query({ clientId }),
    trpc.risks.list.query({ clientId })
  ]);

  const riskByControl = new Map<number, number>();
  risks.forEach(risk => {
    if (risk.controlId) {
      const currentRisk = riskByControl.get(risk.controlId) || 0;
      const riskScore = (risk.likelihood || 0) * (risk.impact || 0);
      riskByControl.set(risk.controlId, Math.max(currentRisk, riskScore));
    }
  });

  const evidenceByControl = new Map<number, string>();
  evidence.forEach(ev => {
    evidenceByControl.set(ev.clientControlId, ev.status);
  });

  return controls.map(control => {
    const riskScore = riskByControl.get(control.id) || 0;
    const evidenceStatus = evidenceByControl.get(control.id) || 'missing';
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 20) riskLevel = 'critical';
    else if (riskScore >= 12) riskLevel = 'high';
    else if (riskScore >= 6) riskLevel = 'medium';

    return {
      controlId: control.clientControlId || control.control?.controlId || `CTL-${control.id}`,
      controlName: control.control?.name || 'Unnamed Control',
      framework: control.control?.framework || 'Unknown',
      riskLevel,
      evidenceStatus: evidenceStatus as 'verified' | 'pending' | 'expired' | 'missing'
    };
  });
};

export const getAuditRiskAlerts = (readinessScore: ReadinessScore, riskHeatmap: RiskHeatmapData[]) => {
  const alerts: string[] = [];
  
  // Never-throw guard: malformed score objects compare false instead of crashing.
  const s = (readinessScore && typeof readinessScore === 'object' ? readinessScore : {}) as Partial<ReadinessScore>;
  if ((s.overall ?? NaN) < 60) {
    alerts.push(`Overall readiness score is critical (${readinessScore.overall}%). Immediate attention required.`);
  }
  
  if ((s.evidenceCoverage ?? NaN) < 70) {
    alerts.push(`Evidence coverage is low (${readinessScore.evidenceCoverage}%). Many controls lack supporting evidence.`);
  }
  
  if ((s.evidenceFreshness ?? NaN) < 80) {
    alerts.push(`Evidence freshness is concerning (${readinessScore.evidenceFreshness}%). Expired or stale evidence detected.`);
  }
  
  const criticalRisks = riskHeatmap.filter(item =>
    !!item && typeof item === 'object' &&
    item.riskLevel === 'critical' && item.evidenceStatus !== 'verified'
  );
  if (criticalRisks.length > 0) {
    alerts.push(`${criticalRisks.length} critical risks lack verified evidence. High audit exposure.`);
  }
  
  return alerts;
};