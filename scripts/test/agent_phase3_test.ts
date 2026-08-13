// Phase 3: Remediation Engine + Engagement + Autopilot Tests
import { computeScore } from '../../packages/core/src/lib/agent/scoring';

console.log('=== Phase 3 Logic Tests ===\n');

// Test 1: Gap detection — agent with low confidence controls
console.log('Test 1: Gap Detection');
const lowConfidenceScore = computeScore({
  agentId: 1,
  mappings: [
    { framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: true, confidence: 95, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null },
    { framework: 'OWASP_LLM', controlId: 'LLM02', autoMapped: true, confidence: 95, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null },
    { framework: 'OWASP_LLM', controlId: 'LLM03', autoMapped: true, confidence: 95, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null },
    { framework: 'NIST_AI_RMF', controlId: 'GOVERN-1', autoMapped: false, confidence: 50, evidenceCount: 1, lastEvidenceAt: new Date(), lastRedteamAt: null, redteamPassed: null },
  ],
  evidenceTotal: 1,
  redteamPass: 0,
  redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});

console.log('  Overall score:', lowConfidenceScore.overallScore);
console.log('  Gaps found:', lowConfidenceScore.gaps.length, '(expected: 3 — LLM01, LLM02, LLM03 at 30%)');
console.log('  Gap details:');
lowConfidenceScore.gaps.forEach(g => console.log(`    ${g.framework}:${g.controlId} = ${g.confidence}%`));

// Test 2: No gaps — agent with evidence
console.log('\nTest 2: No Gaps (all controls evidenced)');
const highConfidenceScore = computeScore({
  agentId: 2,
  mappings: [
    { framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: false, confidence: 50, evidenceCount: 2, lastEvidenceAt: new Date(), lastRedteamAt: new Date(), redteamPassed: true },
    { framework: 'OWASP_LLM', controlId: 'LLM02', autoMapped: false, confidence: 50, evidenceCount: 1, lastEvidenceAt: new Date(), lastRedteamAt: null, redteamPassed: null },
  ],
  evidenceTotal: 3,
  redteamPass: 1,
  redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});

console.log('  Overall score:', highConfidenceScore.overallScore);
console.log('  Gaps found:', highConfidenceScore.gaps.length, '(expected: 0)');

// Test 3: Mixed — some controls good, some bad
console.log('\nTest 3: Mixed Controls');
const mixedScore = computeScore({
  agentId: 3,
  mappings: [
    { framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: false, confidence: 50, evidenceCount: 3, lastEvidenceAt: new Date(), lastRedteamAt: new Date(), redteamPassed: true },
    { framework: 'OWASP_LLM', controlId: 'LLM05', autoMapped: true, confidence: 95, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null },
    { framework: 'OWASP_LLM', controlId: 'LLM06', autoMapped: false, confidence: 50, evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: new Date(), redteamPassed: false },
  ],
  evidenceTotal: 3,
  redteamPass: 1,
  redteamFail: 1,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});

console.log('  Overall score:', mixedScore.overallScore);
console.log('  Gaps found:', mixedScore.gaps.length, '(expected: 2 — LLM05 at 30%, LLM06 at 20%)');
mixedScore.gaps.forEach(g => console.log(`    ${g.framework}:${g.controlId} = ${g.confidence}%`));

// Test 4: Stale evidence decay
console.log('\nTest 4: Stale Evidence Decay');
const staleDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000); // 120 days ago
const staleScore = computeScore({
  agentId: 4,
  mappings: [
    { framework: 'OWASP_LLM', controlId: 'LLM01', autoMapped: false, confidence: 50, evidenceCount: 2, lastEvidenceAt: staleDate, lastRedteamAt: null, redteamPassed: null },
  ],
  evidenceTotal: 2,
  redteamPass: 0,
  redteamFail: 0,
  profile: { sandbox: 'docker', approvalMode: 'manual', memoryEncryption: true, networkIsolation: true },
});

console.log('  Confidence with stale evidence:', staleScore.perControl[0].confidence, '(expected: ~56 — 80 * 0.7 decay)');

console.log('\n✅ Phase 3 logic tests complete');
