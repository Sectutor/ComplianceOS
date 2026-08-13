/**
 * PHASE 5: Industry Compliance Packs
 * Extends the base frameworks with industry-specific controls.
 */

export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  targetIndustries: string[];
  frameworks: FrameworkPackItem[];
}

export interface FrameworkPackItem {
  id: string;
  name: string;
  description: string;
  controls: PackControl[];
}

export interface PackControl {
  code: string;
  title: string;
  category: string;
  mappedToBase: string[]; // base framework/controlId mappings
  guidance: string;
}

// Pre-built industry packs
export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: 'dora-financial',
    name: 'DORA — Financial Services',
    description: 'Digital Operational Resilience Act compliance for financial entities operating in the EU.',
    targetIndustries: ['banking', 'insurance', 'investment', 'fintech'],
    frameworks: [
      {
        id: 'dora',
        name: 'DORA ICT Risk Management',
        description: 'ICT risk management framework for financial entities',
        controls: [
          { code: 'DORA-1.1', title: 'ICT Risk Management Framework', category: 'governance', mappedToBase: ['NIST_AI_RMF:GOVERN-1'], guidance: 'Establish a comprehensive ICT risk management framework covering AI agents.' },
          { code: 'DORA-2.1', title: 'ICT Incident Classification', category: 'security', mappedToBase: ['OWASP_LLM:LLM04'], guidance: 'Classify AI agent incidents by criticality and reporting timelines.' },
          { code: 'DORA-3.1', title: 'Digital Operational Resilience Testing', category: 'testing', mappedToBase: ['OWASP_LLM:LLM01'], guidance: 'Conduct regular threat-led penetration testing of AI agents.' },
          { code: 'DORA-4.1', title: 'ICT Third-Party Risk', category: 'supply-chain', mappedToBase: ['OWASP_LLM:LLM05'], guidance: 'Assess AI model and tool vendor risk continuously.' },
          { code: 'DORA-5.1', title: 'ICT Incident Reporting', category: 'monitoring', mappedToBase: ['NIST_AI_RMF:MEASURE-2'], guidance: 'Report major AI incidents to regulators within required timeframes.' },
        ],
      },
    ],
  },
  {
    id: 'hipaa-healthcare',
    name: 'HIPAA — Healthcare',
    description: 'HIPAA Security Rule and FDA AI/ML framework for healthcare organizations.',
    targetIndustries: ['healthcare', 'pharma', 'medtech', 'biotech'],
    frameworks: [
      {
        id: 'hipaa',
        name: 'HIPAA Security Rule',
        description: 'Protect electronic health information in AI systems',
        controls: [
          { code: 'HIPAA-164.312(a)(1)', title: 'Access Control', category: 'security', mappedToBase: ['OWASP_LLM:LLM07'], guidance: 'Implement unique user identification and automatic logoff for AI agent access.' },
          { code: 'HIPAA-164.312(c)(1)', title: 'Integrity', category: 'security', mappedToBase: ['OWASP_LLM:LLM02'], guidance: 'Ensure AI agent outputs are not improperly altered.' },
          { code: 'HIPAA-164.312(e)(1)', title: 'Transmission Security', category: 'security', mappedToBase: ['OWASP_LLM:LLM06'], guidance: 'Implement encryption for all ePHI transmitted by AI agents.' },
          { code: 'HIPAA-164.308(a)(5)(ii)(C)', title: 'Log-in Monitoring', category: 'monitoring', mappedToBase: ['NIST_AI_RMF:MEASURE-2'], guidance: 'Monitor all access to AI systems processing ePHI.' },
          { code: 'HIPAA-164.312(b)', title: 'Audit Controls', category: 'audit', mappedToBase: ['NIST_AI_RMF:MEASURE-1'], guidance: 'Implement audit logging for all AI agent interactions with ePHI.' },
        ],
      },
      {
        id: 'fda-aiml',
        name: 'FDA AI/ML Medical Device',
        description: 'FDA guidance for AI/ML-based medical devices',
        controls: [
          { code: 'FDA-AI-1', title: 'Data Integrity & Bias', category: 'quality', mappedToBase: ['OWASP_LLM:LLM03'], guidance: 'Validate training data for bias appropriate to patient population.' },
          { code: 'FDA-AI-2', title: 'Model Performance & Drift', category: 'monitoring', mappedToBase: ['NIST_AI_RMF:MEASURE-3'], guidance: 'Monitor AI model performance and detect drift in clinical use.' },
          { code: 'FDA-AI-3', title: 'Transparency & Explainability', category: 'transparency', mappedToBase: ['OWASP_LLM:LLM09'], guidance: 'Provide clear explanations of AI-driven clinical recommendations.' },
          { code: 'FDA-AI-4', title: 'Human Factors', category: 'safety', mappedToBase: ['OWASP_LLM:LLM08'], guidance: 'Ensure meaningful human oversight of AI clinical decisions.' },
        ],
      },
    ],
  },
  {
    id: 'cmmc-defense',
    name: 'CMMC — Defense Industrial Base',
    description: 'Cybersecurity Maturity Model Certification for defense contractors.',
    targetIndustries: ['defense', 'aerospace', 'government-contractor'],
    frameworks: [
      {
        id: 'cmmc-2',
        name: 'CMMC Level 2',
        description: 'Protect Controlled Unclassified Information (CUI)',
        controls: [
          { code: 'CMMC-AC.1.001', title: 'Authorized Access', category: 'security', mappedToBase: ['OWASP_LLM:LLM07'], guidance: 'Limit information system access to authorized users processing CUI.' },
          { code: 'CMMC-AU.2.041', title: 'Audit Record Review', category: 'audit', mappedToBase: ['NIST_AI_RMF:MEASURE-1'], guidance: 'Review and update audited events for AI agent interactions.' },
          { code: 'CMMC-IA.1.076', title: 'Identification & Authentication', category: 'security', mappedToBase: ['OWASP_LLM:LLM07'], guidance: 'Identify and authenticate all users accessing AI systems processing CUI.' },
          { code: 'CMMC-SC.1.175', title: 'Boundary Protection', category: 'security', mappedToBase: ['OWASP_LLM:LLM06'], guidance: 'Monitor and control communications at AI agent system boundaries.' },
          { code: 'CMMC-SI.1.210', title: 'Information System Monitoring', category: 'monitoring', mappedToBase: ['NIST_AI_RMF:MEASURE-2'], guidance: 'Monitor AI agents for attacks and indicators of potential attacks.' },
        ],
      },
    ],
  },
  {
    id: 'soc2-saas',
    name: 'SOC 2 — SaaS / Technology',
    description: 'SOC 2 Type II Trust Service Criteria for technology companies.',
    targetIndustries: ['saas', 'technology', 'cloud', 'marketplace'],
    frameworks: [
      {
        id: 'soc2',
        name: 'SOC 2 Type II',
        description: 'Trust Service Criteria for service organizations',
        controls: [
          { code: 'SOC2-CC6.1', title: 'Logical Access Controls', category: 'security', mappedToBase: ['OWASP_LLM:LLM07'], guidance: 'Restrict access to AI systems based on role and need.' },
          { code: 'SOC2-CC7.1', title: 'System Monitoring', category: 'monitoring', mappedToBase: ['NIST_AI_RMF:MEASURE-2'], guidance: 'Monitor AI system performance and security.' },
          { code: 'SOC2-CC7.2', title: 'Anomaly Detection', category: 'security', mappedToBase: ['OWASP_LLM:LLM01'], guidance: 'Detect and respond to AI agent security anomalies.' },
          { code: 'SOC2-CC8.1', title: 'Incident Response', category: 'security', mappedToBase: ['OWASP_LLM:LLM04'], guidance: 'Respond to AI agent incidents per defined procedures.' },
          { code: 'SOC2-CC6.6', title: 'Encryption', category: 'security', mappedToBase: ['OWASP_LLM:LLM06'], guidance: 'Encrypt data processed by AI agents at rest and in transit.' },
        ],
      },
    ],
  },
];

// Get pack by ID
export function getIndustryPack(id: string): IndustryPack | undefined {
  return INDUSTRY_PACKS.find(p => p.id === id);
}

// Get packs for industry
export function getPacksForIndustry(industry: string): IndustryPack[] {
  return INDUSTRY_PACKS.filter(p => p.targetIndustries.includes(industry.toLowerCase()));
}

// Get controls for a pack
export function getPackControls(packId: string): PackControl[] {
  const pack = getIndustryPack(packId);
  if (!pack) return [];
  return pack.frameworks.flatMap(f => f.controls);
}

// Get base framework mapping for a pack control
export function getBaseMapping(packId: string, controlCode: string): string[] {
  const controls = getPackControls(packId);
  const control = controls.find(c => c.code === controlCode);
  return control?.mappedToBase || [];
}
