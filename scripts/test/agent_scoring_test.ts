import { computeScore, parseDockerCompose, parseHermesConfig, inferProfileFromConfig, hashConfig, detectConfigDrift } from '../../packages/core/src/lib/agent/scoring';

// Test: Scoring Engine - evidence-based confidence
console.log('Test: Scoring Engine');

// No evidence = low confidence (config only)
const noEvidence = computeScore({
  agentId: 1,
  mappings: [{ framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: true, confidence: 95, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null }],
  evidenceTotal: 0, redteamPass: 0, redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});
console.log('  No evidence confidence:', noEvidence.perControl[0].confidence, '(expect 30)');

// With evidence
const withEvidence = computeScore({
  agentId: 1,
  mappings: [{ framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: true, confidence: 95, evidenceCount: 2, lastEvidenceAt: new Date(), lastRedteamAt: null, redteamPassed: null }],
  evidenceTotal: 2, redteamPass: 0, redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});
console.log('  With evidence confidence:', withEvidence.perControl[0].confidence, '(expect ~80)');

// With red team pass
const withRedteam = computeScore({
  agentId: 1,
  mappings: [{ framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: false, confidence: 50, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: new Date(), redteamPassed: true }],
  evidenceTotal: 0, redteamPass: 1, redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});
console.log('  Red team pass confidence:', withRedteam.perControl[0].confidence, '(expect ~85)');

// Test: Config Parsers
console.log('\nTest: Config Parsers');

const compose = `
version: '3.8'
services:
  hermes:
    image: nousresearch/hermes-agent
    network_mode: none
    read_only: true
    mem_limit: 2g
    pids_limit: 100
    user: "1000:1000"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
`;
const parsed = parseDockerCompose(compose);
console.log('  Docker sandbox:', parsed.sandbox, '(expect docker)');
console.log('  Docker network:', parsed.networkMode, '(expect none)');
console.log('  Docker read-only:', parsed.readOnly, '(expect true)');

const hermesConfig = `
security:
  enable_defense_in_depth: true
  allow_private_urls: false
  memory_encryption: true
terminal:
  backend: docker
approvals:
  mode: manual
logging:
  redact_sensitive: true
context:
  protect_first_system: true
`;
const parsedHermes = parseHermesConfig(hermesConfig);
console.log('  Hermes backend:', parsedHermes.terminalBackend, '(expect docker)');
console.log('  Hermes approval:', parsedHermes.approvalMode, '(expect manual)');
console.log('  Hermes encryption:', parsedHermes.memoryEncryption, '(expect true)');

// Test: Profile Inference
const inferred = inferProfileFromConfig(parsed, parsedHermes);
console.log('  Inferred sandbox:', inferred.sandbox, '(expect docker)');
console.log('  Inferred network:', inferred.networkIsolation, '(expect true)');
console.log('  Inferred encrypt:', inferred.memoryEncryption, '(expect true)');

// Test: Hash + Drift
const hash1 = hashConfig(compose);
const hash2 = hashConfig(hermesConfig);
console.log('  Hash different:', hash1 !== hash2, '(expect true)');

console.log('\nAll tests complete');
