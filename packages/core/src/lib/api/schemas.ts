/**
 * API v1 — Request/Response types for the Compliance Agent integration.
 * These are the clean JSON contracts the Hermes compliance-agent skill uses.
 */

export interface ApiControl {
  id: string;
  code: string;
  title: string;
  description: string;
  framework: string;
  status: 'pass' | 'fail' | 'partial' | 'not_assessed';
  evidenceCount: number;
  lastEvidenceDate: string | null;
}

export interface ApiEvidence {
  id: string;
  controlId: string;
  controlCode: string;
  title: string;
  description: string;
  status: 'pass' | 'fail';
  evidenceType: 'automated' | 'manual' | 'uploaded';
  evidenceData: any;
  framework: string;
  collectedAt: string;
  expiresAt: string | null;
  createdBy: string;
}

export interface ApiRisk {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'mitigated' | 'accepted' | 'closed';
  source: string;
  sourceId: string;
  domain: string;
  controlId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFramework {
  id: string;
  name: string;
  version: string;
  controlCount: number;
  assessedControlCount: number;
  passRate: number;
  status: 'active' | 'draft';
}

export interface ApiGap {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  framework: string;
  status: 'fail' | 'partial' | 'not_assessed';
  missingEvidence: boolean;
  evidenceExpiring: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ApiReport {
  framework: string;
  generatedAt: string;
  overallPassRate: number;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  partialControls: number;
  notAssessed: number;
  gaps: ApiGap[];
  criticalGaps: number;
  highGaps: number;
  expiringEvidenceCount: number;
}

export interface ApiHealth {
  status: 'ok' | 'degraded' | 'error';
  database: 'connected' | 'disconnected';
  uptime: number;
  version: string;
  authMode: 'local' | 'supabase';
  agentMode: boolean;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}
