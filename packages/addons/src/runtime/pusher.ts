/**
 * Findings Pusher
 *
 * Writes normalized findings from addon scanners directly into
 * GRCompliance's database tables (risks, evidence).
 *
 * Uses the raw postgres.js client via DATABASE_URL to avoid
 * circular dependency issues with the core drizzle schema.
 */

import type { NormalizedFinding, RiskSeverity, RunResult } from '../shared/types';

interface RiskInsert {
  clientId: number;
  title: string;
  severity: string;
  description: string | null;
  category: string;
  owaspCategory: string | null;
  privacyImpact: boolean;
  assessmentType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EvidenceInsert {
  clientId: number;
  clientControlId: number;
  evidenceId: string;
  description: string | null;
  type: string;
  status: string;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let _pusherSql: import('postgres').Sql<{}> | null = null;

async function getSql() {
  if (!_pusherSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    const { default: postgres } = await import('postgres');
    _pusherSql = postgres(url, {
      max: 2,
      idle_timeout: 15,
      ssl: { rejectUnauthorized: false },
      prepare: false,
      connection: { statement_timeout: 10000 },
    });
  }
  return _pusherSql;
}

export class FindingsPusher {
  private riskInserts: RiskInsert[] = [];
  private evidenceInserts: EvidenceInsert[] = [];

  /** Queue a risk to be inserted */
  pushRisk(params: {
    clientId: number;
    title: string;
    severity: RiskSeverity;
    description: string;
    frameworkMappings: string[];
    source: string;
    resourceId?: string;
    remediation?: string;
    rawEvidence: Record<string, unknown>;
  }): void {
    this.riskInserts.push({
      clientId: params.clientId,
      title: params.title,
      severity: params.severity,
      description: params.description,
      category: 'Security',
      owaspCategory: null,
      privacyImpact: false,
      assessmentType: 'scenario',
      status: params.severity === 'info' ? 'observation' : 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /** Queue evidence to be attached */
  pushEvidence(params: {
    clientId: number;
    controlId?: number;
    title: string;
    artifactType: string;
    artifactData: Record<string, unknown>;
    source: string;
  }): void {
    this.evidenceInserts.push({
      clientId: params.clientId,
      clientControlId: params.controlId || 0,
      evidenceId: `${params.source}-${params.artifactType}-${Date.now()}`,
      description: params.title,
      type: params.artifactType,
      status: 'collected',
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Persist all queued items to the database.
   * Returns counts of what was written.
   */
  async flush(): Promise<{
    risksCreated: number;
    evidencePushed: number;
    assetsRegistered: number;
  }> {
    const sql = await getSql();
    let risksCreated = 0;
    let evidencePushed = 0;

    // Batch insert risks
    const riskErrors: string[] = [];
    if (this.riskInserts.length > 0) {
      for (const r of this.riskInserts) {
        try {
          await sql`
            INSERT INTO risk_scenarios (
              client_id, title, description, category, owasp_category, privacy_impact,
              assessment_type, status, inherent_risk, inherent_score, created_at, updated_at
            ) VALUES (
              ${r.clientId}, ${r.title}, ${r.description}, ${r.category},
              ${r.owaspCategory}, ${r.privacyImpact}, ${r.assessmentType},
              ${r.status}, ${r.severity},
              ${r.severity === 'critical' ? 25 : r.severity === 'high' ? 16 : r.severity === 'medium' ? 9 : r.severity === 'low' ? 4 : 1},
              ${r.createdAt}, ${r.updatedAt}
            )
          `;
          risksCreated++;
        } catch (err: any) {
          console.error('[Pusher] Failed to insert risk:', err.message);
          riskErrors.push(`risk#${risksCreated}: ${err.message}`);
        }
      }
    }

    // Batch insert evidence
    const evidenceErrors: string[] = [];
    if (this.evidenceInserts.length > 0) {
      for (const e of this.evidenceInserts) {
        try {
          await sql`
            INSERT INTO evidence (
              client_id, client_control_id, evidence_id, description,
              type, status, location, created_at, updated_at
            ) VALUES (
              ${e.clientId}, ${e.clientControlId}, ${e.evidenceId}, ${e.description},
              ${e.type}, ${e.status}, ${e.location}, ${e.createdAt}, ${e.updatedAt}
            )
          `;
          evidencePushed++;
        } catch (err: any) {
          console.error('[Pusher] Failed to insert evidence:', err.message);
          evidenceErrors.push(`evidence#${evidencePushed}: ${err.message}`);
        }
      }
    }

    if (riskErrors.length > 0 || evidenceErrors.length > 0) {
      const all = [...riskErrors, ...evidenceErrors];
      throw new Error(`Pusher flush errors: ${all.join('; ')}`);
    }

    this.riskInserts = [];
    this.evidenceInserts = [];

    return {
      risksCreated,
      evidencePushed,
      assetsRegistered: 0,
    };
  }

  /** Process an entire run result in one shot */
  async processRunResult(
    clientId: number,
    source: string,
    result: RunResult,
  ): Promise<{
    risksCreated: number;
    evidencePushed: number;
    assetsRegistered: number;
  }> {
    for (const finding of result.findings) {
      this.pushRisk({
        clientId,
        title: finding.title,
        severity: finding.severity,
        description: finding.description,
        frameworkMappings: finding.frameworkMappings,
        source,
        resourceId: finding.resourceId,
        remediation: finding.remediation,
        rawEvidence: finding.rawEvidence,
      });
    }

    if (result.evidenceArtifacts) {
      for (const artifact of result.evidenceArtifacts) {
        this.pushEvidence({
          clientId,
          title: `${source} — ${artifact.type}`,
          artifactType: artifact.type,
          artifactData: artifact.data,
          source,
        });
      }
    }

    return this.flush();
  }
}
