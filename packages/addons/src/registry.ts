/**
 * Addon Registry
 *
 * Central registry of all available addons in the ComplianceOS marketplace.
 * Each addon has a manifest that describes its features, pricing, and requirements.
 *
 * Follows the same manifest pattern as plugins.ts but adds:
 * - Price (for Stripe billing)
 * - Trial days
 * - Required infrastructure (for deployment guidance)
 * - Replaces (what paid tool this replaces — for marketing)
 */

export interface AddonManifest {
  /** Unique identifier (e.g. "cos-cloud-scanner") */
  id: string;

  /** URL-friendly slug (e.g. "cloud-scanner") */
  slug: string;

  /** Human-readable name */
  name: string;

  /** Short description for the marketplace card */
  description: string;

  /** Long description for the detail page */
  fullDescription: string;

  /** Category for filtering */
  category: 'scanner' | 'siem' | 'dependency' | 'phishing' | 'ztna' | 'password' | 'ai';

  /** Monthly price in cents ($100 = 10000) */
  price: number;

  /** Free trial duration in days */
  trialDays: number;

  /** Icon shown in marketplace (emoji or URL) */
  icon: string;

  /** What paid tool this replaces — for the "kills paid SaaS" angle */
  replaces: string;

  /** How much the paid tool costs (for comparison) */
  replacesCost: string;

  /** External tools this addon orchestrates */
  tools: { name: string; url: string; description: string }[];

  /** Infrastructure needed by the client */
  requiredInfrastructure: string;

  /** tRPC permissions this addon needs */
  permissions: string[];

  /** UI slots this addon fills */
  uiSlots: {
    slot: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'main';
    priority: number;
  }[];

  /** Version */
  version: string;

  /** Whether this is available in community edition */
  isCommunity: boolean;

  /** Features enabled by this addon (for displaying to client) */
  features: string[];
}

export const ADDON_REGISTRY: Record<string, AddonManifest> = {
  'cloud-scanner': {
    id: 'cos-cloud-scanner',
    slug: 'cloud-scanner',
    name: 'Cloud Scanner — Powered by Prowler',
    description:
      'Automated cloud compliance scanning for AWS, Azure, and GCP. 2,000+ checks mapped to NIST CSF 2.0, SOC 2, ISO 27001, HIPAA, and PCI DSS.',
    fullDescription:
      'Prowler is the industry-standard open-source cloud security scanner. This addon runs scheduled Prowler scans against your cloud accounts, auto-ingests findings into your risk register, and generates compliance evidence for audits.\n\n' +
      '• 2,000+ security checks across AWS, Azure, and GCP\n' +
      '• Mapped to NIST CSF 2.0, SOC 2, ISO 27001, HIPAA, PCI DSS, CIS Benchmarks\n' +
      '• Weekly automated scans with real-time delta alerts\n' +
      '• Each finding auto-creates a risk in your register with remediation steps\n' +
      '• Scan results serve as audit evidence for cloud compliance controls\n' +
      '• Cloud Posture Score dashboard widget shows your progress over time',
    category: 'scanner',
    price: 10000, // $100/mo
    trialDays: 14,
    icon: '☁️',
    replaces: 'Wiz / Orca Cloud Security',
    replacesCost: '$15,000+/yr',
    tools: [
      {
        name: 'Prowler',
        url: 'https://github.com/prowler-cloud/prowler',
        description: 'Cloud security scanner with 2,000+ compliance checks',
      },
    ],
    requiredInfrastructure: 'Docker (runs on any VPS or Coolify instance)',
    permissions: ['read:risks', 'write:evidence', 'read:clients'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 10 },
      { slot: 'addon:settings', position: 'main', priority: 10 },
      { slot: 'sidebar:addons', position: 'bottom', priority: 10 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: [
      'Multi-cloud support (AWS, Azure, GCP)',
      '2,000+ automated compliance checks',
      'NIST CSF 2.0, SOC 2, ISO 27001 mapping',
      'Weekly scheduled scans',
      'Auto-populated risk register',
      'Compliance evidence generation',
      'Cloud Posture Score dashboard',
      'Real-time delta alerts',
    ],
  },

  'endpoint-siem': {
    id: 'cos-endpoint-siem',
    slug: 'endpoint-siem',
    name: 'Endpoint SIEM — Powered by Wazuh',
    description:
      'Real-time endpoint detection, log collection, file integrity monitoring, vulnerability detection, and compliance monitoring for Windows, Linux, and macOS.',
    fullDescription:
      'Wazuh is the most widely deployed open-source SIEM platform. This addon integrates a fully managed Wazuh stack into your GRCompliance dashboard, turning security alerts into structured incidents and compliance evidence.\n\n' +
      '• Real-time log collection and analysis from all endpoints\n' +
      '• File Integrity Monitoring (FIM) for critical system files\n' +
      '• Vulnerability detection across installed software\n' +
      '• MITRE ATT&CK mapping on every alert\n' +
      '• Automated incident creation in your GRCompliance register\n' +
      '• Pre-built compliance dashboards: PCI DSS, NIST 800-53, CIS Benchmarks\n' +
      '• Agent deployment: one-liner for Windows (.msi), Linux (apt/yum), macOS (.pkg)',
    category: 'siem',
    price: 20000, // $200/mo
    trialDays: 14,
    icon: '🛡️',
    replaces: 'Splunk / SentinelOne SIEM',
    replacesCost: '$75–$150/endpoint/yr',
    tools: [
      {
        name: 'Wazuh',
        url: 'https://github.com/wazuh/wazuh',
        description: 'Open-source SIEM and XDR platform',
      },
    ],
    requiredInfrastructure: '4 vCPU, 8 GB RAM (Hetzner CX32 or equivalent)',
    permissions: ['read:risks', 'write:evidence', 'read:incidents', 'write:incidents'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 20 },
      { slot: 'addon:settings', position: 'main', priority: 20 },
      { slot: 'sidebar:addons', position: 'bottom', priority: 20 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: [
      'Real-time endpoint event collection',
      'File Integrity Monitoring (FIM)',
      'Vulnerability detection',
      'MITRE ATT&CK mapping',
      'Automated incident creation',
      'PCI DSS & NIST 800-53 dashboards',
      'Agent deployment scripts',
      'Alert correlation rules',
    ],
  },

  'dep-scanner': {
    id: 'cos-dep-scanner',
    slug: 'dep-scanner',
    name: 'Dependency Scanner — Powered by Trivy',
    description:
      'Comprehensive vulnerability scanning for repositories, directories, and SBOMs. Detects CVEs in npm, pip, go, maven, and 15+ ecosystems with CVSS scoring.',
    fullDescription:
      'Trivy by Aqua Security is the most widely adopted open-source vulnerability scanner, scanning 15+ package ecosystems, Docker images, and infrastructure-as-code files. This addon integrates scanning into your compliance workflow.\\n\\n' +
      '• Scans all major dependency files: go.mod, package-lock.json, requirements.txt, pom.xml, Gemfile.lock, Cargo.lock\\n' +
      '• Reads SPDX and CycloneDX SBOM formats\\n' +
      '• Each CVE creates a risk in your register with CVSS score and fix version\\n' +
      '• Builds a dependency asset inventory\\n' +
      '• Archives SBOMs as compliance evidence\\n' +
      '• Supply Chain Health dashboard widget',
    category: 'dependency',
    price: 5000, // $50/mo
    trialDays: 14,
    icon: '🔗',
    replaces: 'Snyk / GitHub Advanced Security',
    replacesCost: '$200/dev/yr',
    tools: [
      {
        name: 'Trivy',
        url: 'https://github.com/aquasecurity/trivy',
        description: 'Google-backed open-source dependency vulnerability scanner',
      },
      {
        name: 'CycloneDX BOM Generator',
        url: 'https://github.com/CycloneDX/cyclonedx-bom',
        description: 'SBOM generation for software composition analysis',
      },
    ],
    requiredInfrastructure: 'Docker (runs on any VPS)',
    permissions: ['read:risks', 'write:evidence', 'read:assets'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 30 },
      { slot: 'addon:settings', position: 'main', priority: 30 },
      { slot: 'sidebar:addons', position: 'bottom', priority: 30 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: [
      'Multi-language dependency scanning',
      'SBOM generation (SPDX / CycloneDX)',
      'CVE risk creation with CVSS scores',
      'Dependency asset inventory',
      'Supply Chain Health score',
      'New CVE alerting (email/Slack)',
      'Weekly automated scans',
      'Historical SBOM archive',
    ],
  },

  'evidence-gap-detector': {
    id: 'cos-evidence-gap-detector',
    slug: 'evidence-gap-detector',
    name: 'AI Evidence Gap Detector',
    description:
      'AI-powered detection of missing, expired, or insufficient compliance evidence. Automatically identifies gaps across all controls and creates evidence requests.',
    fullDescription:
      'The AI Evidence Gap Detector continuously monitors your compliance evidence posture. It scans every client control, checks associated evidence validity and expiry dates, and uses AI (DeepSeek / Qwen / OpenAI) to generate actionable gap analyses.\n\n' +
      '• Scans all client controls on a configurable schedule (daily/weekly)\n' +
      '• Identifies controls with no evidence, expired evidence, or expiring evidence\n' +
      '• Optionally uses LLM to generate intelligent gap summaries and priorities\n' +
      '• Auto-creates evidence requests for each identified gap\n' +
      '• Produces a summary report artifact for audit trails\n' +
      '• Configurable minimum evidence age threshold before flagging',
    category: 'ai',
    price: 5000, // $50/mo
    trialDays: 14,
    icon: '🔍',
    replaces: 'Manual evidence tracking ($200+/hr auditor time)',
    replacesCost: '$200+/hr',
    tools: [
      {
        name: 'DeepSeek / Qwen / OpenAI',
        url: 'https://complianceos.com/addons/evidence-gap-detector',
        description: 'LLM providers used for intelligent gap analysis and recommendations',
      },
    ],
    requiredInfrastructure: 'None (runs in-process)',
    permissions: ['read:controls', 'read:evidence', 'write:evidence_requests', 'read:clients'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 40 },
      { slot: 'addon:settings', position: 'main', priority: 40 },
      { slot: 'sidebar:addons', position: 'bottom', priority: 40 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: [
      'Scheduled gap analysis (daily/weekly/manual)',
      'Missing, expired, and expiring evidence detection',
      'AI-powered summary and recommendations',
      'Auto-creation of evidence requests',
      'Configurable minimum evidence age threshold',
      'Gap analysis report artifacts',
      'Priority-aware evidence request creation',
      'Plug-and-play: no infrastructure required',
    ],
  },

  'ai-questionnaire': {
    id: 'cos-ai-questionnaire',
    slug: 'ai-questionnaire',
    name: 'AI Questionnaire Responder',
    description:
      'AI-powered auto-fill for security questionnaires (SIG, CAIQ, VSA, custom). Learns from past responses and routes unknowns to correct owners.',
    fullDescription:
      'Manual security questionnaire responses are the single biggest time sink for compliance teams. This addon automates the entire process.\\n\\n' +
      '• Parses incoming questionnaires (SIG, CAIQ, VSA, custom formats)\\n' +
      '• Searches past responses, policies, and controls for relevant answers\\n' +
      '• Uses LLM to draft answers based on your actual controls and policies\\n' +
      '• Scores confidence — auto-responds when confidence exceeds threshold\\n' +
      '• Flags low-confidence items for human review with source references\\n' +
      '• Routes unanswered questions to the appropriate control owner\\n' +
      '• Learns from corrected responses over time for continuous improvement\\n' +
      '• Works with DeepSeek, Qwen, or OpenAI as the LLM provider',
    category: 'ai',
    price: 5000, // $50/mo
    trialDays: 14,
    icon: '📋',
    replaces: 'Manual questionnaire response ($200–$500/hr consultant time)',
    replacesCost: '$200–$500/hr',
    tools: [
      {
        name: 'DeepSeek / Qwen / OpenAI',
        url: 'https://complianceos.com/addons/ai-questionnaire',
        description: 'LLM providers used for intelligent questionnaire drafting',
      },
    ],
    requiredInfrastructure: 'None (runs in-process)',
    permissions: ['read:controls', 'read:evidence', 'read:policies', 'write:questionnaire_responses', 'read:clients'],
    uiSlots: [
      { slot: 'addon:dashboard', position: 'main', priority: 10 },
      { slot: 'addon:settings', position: 'main', priority: 10 },
      { slot: 'questionnaire:response', position: 'main', priority: 10 },
    ],
    version: '1.0.0',
    isCommunity: false,
    features: [
      'Multi-format questionnaire parsing (SIG, CAIQ, VSA, custom)',
      'Past response matching with similarity scoring',
      'LLM-powered answer drafting from policy and control text',
      'Confidence scoring with configurable auto-respond threshold',
      'Human review flagging for low-confidence items',
      'Control owner routing for unanswered questions',
      'Continuous learning from corrected responses',
      'Plug-and-play: no infrastructure required',
    ],
  },
};

export function getAddonBySlug(slug: string): AddonManifest | undefined {
  return ADDON_REGISTRY[slug];
}

export function listAddons(category?: string): AddonManifest[] {
  const all = Object.values(ADDON_REGISTRY);
  if (category) {
    return all.filter((a) => a.category === category);
  }
  return all;
}

export const ADDON_CATEGORIES = [
  { value: 'scanner', label: 'Cloud & Infrastructure Security' },
  { value: 'siem', label: 'Endpoint Security & SIEM' },
  { value: 'dependency', label: 'Supply Chain Security' },
  { value: 'ai', label: 'AI-Powered Compliance' },
] as const;
