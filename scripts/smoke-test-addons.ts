// Smoke test for addon system
import { ADDON_REGISTRY } from '../packages/addons/src/registry.js';
import { AddonExecutor } from '../packages/addons/src/runtime/executor.js';
import { normalizeProwlerOutput } from '../packages/addons/src/prowler/normalizer.js';
import { runProwlerScan } from '../packages/addons/src/prowler/runner.js';
import { defaultProwlerSettings } from '../packages/addons/src/prowler/connector.js';

console.log('=== Addon System Smoke Test ===');

// 1. Registry
const slugs = Object.keys(ADDON_REGISTRY);
console.log(`✓ Addons registered: ${slugs.join(', ')}`);

// 2. Executor class
const executor = new AddonExecutor({
  findSubscription: async () => null,
  updateSubscription: async () => {},
  insertRunLog: async () => ({ id: 0 }),
  updateRunLog: async () => {},
});
console.log(`✓ Executor created`);

// 3. Mock scan pipeline (Docker not available on this machine)
const output = await runProwlerScan({
  provider: 'aws',
  accountName: 'test-mock',
  regions: ['us-east-1'],
  frameworks: ['nist_csf_2.0', 'soc2'],
  credentials: { accessKeyId: 'AKIA***', secretAccessKey: '***' },
  timeout: 30,
});
console.log(`✓ Mock scan completed: ${output.summary.total} checks, ${output.summary.failed} failures`);

// 4. Normalization
const result = normalizeProwlerOutput(output, {
  clientId: 1,
  provider: 'aws',
  accountName: 'test-mock',
  source: 'prowler',
});
console.log(`✓ Normalized: ${result.findings.length} findings`);
const severities = [...new Set(result.findings.map(f => f.severity))];
console.log(`  Severities: ${severities.join(', ')}`);
console.log(`  Frameworks: ${result.findings[0].frameworkMappings.slice(0, 3).join(', ')}`);

// 5. Default settings
const defaults = defaultProwlerSettings();
console.log(`✓ Default settings: schedule=${defaults.schedule}, frameworks=${defaults.frameworks.join(',')}`);

console.log('\n=== ✓ All Phase 2 components pass ===');
