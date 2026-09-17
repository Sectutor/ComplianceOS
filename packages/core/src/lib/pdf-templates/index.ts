import { generateReport, exportReportPdf, type ReportConfig, type GeneratedReport } from '../evidence-report-pipeline';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'compliance' | 'framework' | 'custom';
  icon: string;
  /** Build a ReportConfig for this template */
  buildConfig: (clientId: number) => Omit<ReportConfig, 'clientId'>;
  estimatedPages: number;
}

/** Pre-built report templates for one-click generation */
const templateRegistry: ReportTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'Board-ready compliance posture report with key metrics, risks, and recommendations.',
    category: 'executive',
    icon: '\u{1F4CA}',
    estimatedPages: 4,
    buildConfig: (clientId: number) => ({
      title: 'Compliance Executive Summary',
      sections: [
        { id: 'overview', title: 'Compliance Posture Overview', description: 'High-level compliance status across all frameworks', evidenceIds: [], order: 1 },
        { id: 'risks', title: 'Critical Risks & Findings', description: 'Top risks requiring executive attention', evidenceIds: [], order: 2 },
        { id: 'roadmap', title: 'Remediation Roadmap', description: 'Planned compliance improvements and timelines', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'soc2-readiness',
    name: 'SOC 2 Readiness Report',
    description: 'Detailed assessment of SOC 2 control readiness with gap analysis.',
    category: 'compliance',
    icon: '\u{1F512}',
    estimatedPages: 12,
    buildConfig: (clientId: number) => ({
      title: 'SOC 2 Readiness Assessment',
      sections: [
        { id: 'scope', title: 'Scope & Boundaries', description: 'Systems and services in scope for SOC 2', evidenceIds: [], order: 1 },
        { id: 'controls', title: 'Trust Services Criteria', description: 'Control status across Security, Availability, Processing, Confidentiality, Privacy', evidenceIds: [], order: 2 },
        { id: 'gaps', title: 'Control Gaps', description: 'Identified gaps in SOC 2 control implementation', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'iso27001-assessment',
    name: 'ISO 27001 Readiness',
    description: 'ISO 27001:2022 Annex A control assessment with implementation status.',
    category: 'compliance',
    icon: '\u{1F4CB}',
    estimatedPages: 15,
    buildConfig: (clientId: number) => ({
      title: 'ISO 27001:2022 Readiness Assessment',
      sections: [
        { id: 'context', title: 'Organizational Context', description: 'Clauses 4-10 compliance status', evidenceIds: [], order: 1 },
        { id: 'annex-a', title: 'Annex A Control Status', description: 'Status of all 93 Annex A controls', evidenceIds: [], order: 2 },
        { id: 'soa', title: 'Statement of Applicability', description: 'Applicable controls and justifications', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'nist-csf-scorecard',
    name: 'NIST CSF Scorecard',
    description: 'NIST Cybersecurity Framework maturity assessment across all five functions.',
    category: 'framework',
    icon: '\u{1F6E1}\u{FE0F}',
    estimatedPages: 8,
    buildConfig: (clientId: number) => ({
      title: 'NIST Cybersecurity Framework Scorecard',
      sections: [
        { id: 'identify', title: 'Identify (ID)', description: 'Asset management, governance, risk assessment', evidenceIds: [], order: 1 },
        { id: 'protect', title: 'Protect (PR)', description: 'Access control, awareness training, data security', evidenceIds: [], order: 2 },
        { id: 'detect', title: 'Detect (DE)', description: 'Anomalies, monitoring, detection processes', evidenceIds: [], order: 3 },
        { id: 'respond', title: 'Respond (RS)', description: 'Response planning, communications, analysis', evidenceIds: [], order: 4 },
        { id: 'recover', title: 'Recover (RC)', description: 'Recovery planning, improvements, communications', evidenceIds: [], order: 5 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'risk-register-summary',
    name: 'Risk Register Summary',
    description: 'Consolidated view of all identified risks with treatment status.',
    category: 'executive',
    icon: '\u{26A0}\u{FE0F}',
    estimatedPages: 6,
    buildConfig: (clientId: number) => ({
      title: 'Enterprise Risk Register Summary',
      sections: [
        { id: 'overview', title: 'Risk Overview', description: 'Aggregated risk scores and distribution', evidenceIds: [], order: 1 },
        { id: 'critical', title: 'Critical Risks', description: 'Risks exceeding acceptable thresholds', evidenceIds: [], order: 2 },
        { id: 'treatment', title: 'Treatment Plans', description: 'Risk mitigation strategies and timelines', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'evidence-gap-analysis',
    name: 'Evidence Gap Analysis',
    description: 'Identify controls missing evidence with automated collection suggestions.',
    category: 'custom',
    icon: '\u{1F50D}',
    estimatedPages: 10,
    buildConfig: (clientId: number) => ({
      title: 'Evidence Coverage Gap Analysis',
      sections: [
        { id: 'coverage', title: 'Evidence Coverage Map', description: 'Controls with and without supporting evidence', evidenceIds: [], order: 1 },
        { id: 'gaps', title: 'Critical Evidence Gaps', description: 'High-priority controls lacking evidence', evidenceIds: [], order: 2 },
        { id: 'recommendations', title: 'Collection Recommendations', description: 'Suggested evidence collection methods', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
  {
    id: 'vendor-risk-report',
    name: 'Vendor Risk Report',
    description: 'Third-party risk assessment summary with scores and findings.',
    category: 'compliance',
    icon: '\u{1F3E2}',
    estimatedPages: 8,
    buildConfig: (clientId: number) => ({
      title: 'Third-Party Risk Report',
      sections: [
        { id: 'overview', title: 'Vendor Landscape', description: 'All vendors and their risk tiers', evidenceIds: [], order: 1 },
        { id: 'high-risk', title: 'High-Risk Vendors', description: 'Vendors requiring immediate attention', evidenceIds: [], order: 2 },
        { id: 'assessments', title: 'Assessment Results', description: 'Completed vendor assessment scores', evidenceIds: [], order: 3 },
      ],
      includeExecutiveSummary: true,
      includeTableOfContents: true,
      includeAppendices: false,
    }),
  },
];

export function getTemplateById(id: string): ReportTemplate | undefined {
  return templateRegistry.find(t => t.id === id);
}

export function getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return templateRegistry.filter(t => t.category === category);
}

export function getAllTemplates(): ReportTemplate[] {
  return [...templateRegistry];
}

export default templateRegistry;