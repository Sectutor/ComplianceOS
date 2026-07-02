/**
 * AI Evidence Gap Detector — Plugin Manifest
 *
 * Registers the evidence gap detection addon with the plugin system.
 * Follows the same PluginManifest pattern as prowler/index.ts.
 */
export const evidenceGapDetectorManifest = {
  id: 'cos-evidence-gap-detector',
  name: 'AI Evidence Gap Detector',
  slug: 'evidence-gap-detector',
  version: '1.0.0',
  description:
    'AI-powered detection of missing, expired, or insufficient compliance evidence across all controls.',
  author: 'ComplianceOS',
  authorUrl: 'https://complianceos.com',
  license: 'Proprietary',
  category: 'ai' as const,
  tags: ['ai', 'evidence', 'gap-analysis', 'automation'],
  frontend: '@/addons/evidence-gap-detector/dashboard',
  permissions: ['read:controls', 'read:evidence', 'write:evidence_requests', 'read:clients'],
  uiSlots: [
    { slot: 'addon:dashboard', position: 'main', priority: 10 },
    { slot: 'addon:settings', position: 'main', priority: 10 },
    { slot: 'sidebar:addons', position: 'bottom', priority: 10 },
  ],
  settings: [
    {
      key: 'schedule',
      label: 'Scan Schedule',
      type: 'select' as const,
      default: 'daily',
      required: false,
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Manual Only', value: 'manual' },
      ],
    },
    {
      key: 'llmProvider',
      label: 'AI Provider',
      type: 'select' as const,
      default: 'deepseek',
      required: false,
      options: [
        { label: 'DeepSeek', value: 'deepseek' },
        { label: 'Qwen', value: 'qwen' },
        { label: 'OpenAI', value: 'openai' },
      ],
    },
    {
      key: 'autoCreateRequests',
      label: 'Auto-create evidence requests',
      type: 'boolean' as const,
      default: true,
      required: false,
    },
    {
      key: 'minEvidenceAge',
      label: 'Min evidence age (days) before flagging',
      type: 'number' as const,
      default: 90,
      required: false,
    },
  ],
  requires: {},
  homepage: 'https://complianceos.com/addons/evidence-gap-detector',
  downloadUrl: 'https://complianceos.com/api/addons/evidence-gap-detector/download',
};
