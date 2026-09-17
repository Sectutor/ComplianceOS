/**
 * Prowler Addon — Plugin Manifest
 *
 * Registers the Cloud Scanner addon with the plugin system.
 * Follows the PluginManifest pattern from plugins.ts.
 */

export const prowlerPluginManifest = {
  id: 'cos-cloud-scanner',
  name: 'Cloud Scanner — Prowler',
  slug: 'cloud-scanner',
  version: '1.0.0',
  description: 'Automated cloud compliance scanning for AWS, Azure, and GCP. 2,000+ checks mapped to NIST CSF 2.0.',
  author: 'ComplianceOS',
  authorUrl: 'https://complianceos.com',
  license: 'Proprietary',
  category: 'integration' as const,
  tags: ['cloud', 'prowler', 'compliance', 'scanning'],
  frontend: '@/addons/prowler/dashboard',
  permissions: ['read:risks', 'write:evidence', 'read:clients'],
  uiSlots: [
    { slot: 'addon:dashboard', position: 'main', priority: 10 },
    { slot: 'addon:settings', position: 'main', priority: 10 },
    { slot: 'sidebar:addons', position: 'bottom', priority: 10 },
  ],
  settings: [
    {
      key: 'awsAccounts',
      label: 'AWS Accounts',
      type: 'json' as const,
      default: [],
      required: false,
      description: 'List of AWS accounts to scan',
    },
    {
      key: 'frameworks',
      label: 'Compliance Frameworks',
      type: 'select' as const,
      default: ['nist_csf_2.0', 'soc2'],
      options: [
        { label: 'NIST CSF 2.0', value: 'nist_csf_2.0' },
        { label: 'SOC 2', value: 'soc2' },
        { label: 'ISO 27001', value: 'iso_27001' },
        { label: 'HIPAA', value: 'hipaa' },
        { label: 'PCI DSS', value: 'pci_dss' },
      ],
      required: true,
    },
    {
      key: 'schedule',
      label: 'Scan Schedule',
      type: 'select' as const,
      default: 'weekly',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
      ],
      required: true,
    },
  ],
  requires: {},
  homepage: 'https://complianceos.com/addons/cloud-scanner',
  downloadUrl: 'https://complianceos.com/api/addons/cloud-scanner/download',
};
