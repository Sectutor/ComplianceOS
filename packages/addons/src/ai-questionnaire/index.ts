/**
 * AI Questionnaire Responder — Plugin Manifest
 *
 * Registers the AI-powered questionnaire auto-fill addon with the plugin system.
 * Automates responses to security questionnaires (SIG, CAIQ, VSA, custom)
 * using past responses, controls, policies, and LLM generation.
 */
export const aiQuestionnaireManifest = {
  id: 'cos-ai-questionnaire',
  name: 'AI Questionnaire Responder',
  slug: 'ai-questionnaire',
  version: '1.0.0',
  description:
    'AI-powered auto-fill for security questionnaires (SIG, CAIQ, VSA, custom). Learns from past responses and routes unknowns to correct owners.',
  author: 'ComplianceOS',
  authorUrl: 'https://complianceos.com',
  license: 'Proprietary',
  category: 'ai' as const,
  tags: ['ai', 'questionnaire', 'automation', 'tprm'],
  frontend: '@/addons/ai-questionnaire/dashboard',
  permissions: [
    'read:controls',
    'read:evidence',
    'read:policies',
    'write:questionnaire_responses',
    'read:clients',
  ],
  uiSlots: [
    { slot: 'addon:dashboard', position: 'main', priority: 10 },
    { slot: 'addon:settings', position: 'main', priority: 10 },
    { slot: 'questionnaire:response', position: 'main', priority: 10 },
  ],
  settings: [
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
      key: 'autoRespond',
      label: 'Auto-respond (no human review)',
      type: 'boolean' as const,
      default: false,
      required: false,
    },
    {
      key: 'confidenceThreshold',
      label: 'Minimum confidence to auto-respond (%)',
      type: 'number' as const,
      default: 80,
      required: false,
    },
    {
      key: 'pastResponsesLimit',
      label: 'Past responses to learn from',
      type: 'number' as const,
      default: 50,
      required: false,
    },
  ],
  requires: {},
  homepage: 'https://complianceos.com/addons/ai-questionnaire',
  downloadUrl: 'https://complianceos.com/api/addons/ai-questionnaire/download',
};
