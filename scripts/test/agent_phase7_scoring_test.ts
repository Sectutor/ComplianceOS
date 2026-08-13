/**
 * PHASE 7: Scoring Tests — Verify Evidence-Only Confidence
 */

import { computeScore } from '../../packages/core/src/lib/agent/scoring';

console.log('=== Phase 7 Scoring Tests ===\n');

// ── Test 1: No evidence = 0% (kill config-based confidence) ──
console.log('Test 1: No evidence = 0% confidence');
const noEvidence = computeScore({
  agentId: 1,
  mappings: [{
    framework: 'OWASP_LLM',
    controlId: 'LLM01',
    evidenceCount: 0,
    lastEvidenceAt: null,
    lastRedteamAt: null,
    redteamPassed: null,
  }],
  evidenceTotal: 0,
  redteamPass: 0,
  redteamFail: 0,
});
console.log('  Confidence:', noEvidence.perControl[0].confidence, '(expect 0 — no config inference)');
console.log('  Source:', noEvidence.perControl[0].source, '(expect "none")');
console.log('  Explanation:', noEvidence.perControl[0].explanation);

// ── Test 2: Evidence uploaded = 70%+ ──
console.log('\nTest 2: Evidence uploaded = 70-95%');
const withEvidence = computeScore({
  agentId: 2,
  mappings: [{
    framework: 'OWASP_LLM',
    controlId: 'LLM01',
    evidenceCount: 2,
    lastEvidenceAt: new Date(),
    lastRedteamAt: null,
    redteamPassed: null,
  }],
  evidenceTotal: 2,
  redteamPass: 0,
  redteamFail: 0,
});
console.log('  Confidence:', withEvidence.perControl[0].confidence, '(expect ~80)');
console.log('  Source:', withEvidence.perControl[0].source, '(expect "evidence")');

// ── Test 3: Red team test passed = 85% ──
console.log('\nTest 3: Red team test passed = 85%');
const withRedteam = computeScore({
  agentId: 3,
  mappings: [{
    framework: 'OWASP_LLM',
    controlId: 'LLM01',
    evidenceCount: 0,
    lastEvidenceAt: null,
    lastRedteamAt: new Date(),
    redteamPassed: true,
  }],
  evidenceTotal: 0,
  redteamPass: 1,
  redteamFail: 0,
});
console.log('  Confidence:', withRedteam.perControl[0].confidence, '(expect 85)');
console.log('  Source:', withRedteam.perControl[0].source, '(expect "redteam")');

// ── Test 4: Red team test failed = 10% ──
console.log('\nTest 4: Red team test failed = 10%');
const failedRedteam = computeScore({
  agentId: 4,
  mappings: [{
    framework: 'OWASP_LLM',
    controlId: 'LLM01',
    evidenceCount: 0,
    lastEvidenceAt: null,
    lastRedteamAt: new Date(),
    redteamPassed: false,
  }],
  evidenceTotal: 0,
  redteamPass: 0,
  redteamFail: 1,
});
console.log('  Confidence:', failedRedteam.perControl[0].confidence, '(expect 10)');
console.log('  Source:', failedRedteam.perControl[0].source, '(expect "redteam")');

// ── Test 5: Stale evidence (>90 days) = 15% ──
console.log('\nTest 5: Stale evidence = 15%');
const staleDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000); // 120 days
const staleEvidence = computeScore({
  agentId: 5,
  mappings: [{
    framework: 'OWASP_LLM',
    controlId: 'LLM01',
    evidenceCount: 3,
    lastEvidenceAt: staleDate,
    lastRedteamAt: null,
    redteamPassed: null,
  }],
  evidenceTotal: 3,
  redteamPass: 0,
  redteamFail: 0,
});
console.log('  Confidence:', staleEvidence.perControl[0].confidence, '(expect 15)');
console.log('  Source:', staleEvidence.perControl[0].source, '(expect "evidence")');
console.log('  Explanation:', staleEvidence.perControl[0].explanation);

// ── Test 6: Mix of controls — gaps identified ──
console.log('\nTest 6: Mix of controls — gap analysis');
const mixedScore = computeScore({
  agentId: 6,
  mappings: [
    { framework: 'OWASP_LLM', controlId: 'LLM01', evidenceCount: 2, lastEvidenceAt: new Date(), lastRedteamAt: new Date(), redteamPassed: true },
    { framework: 'OWASP_LLM', controlId: 'LLM02', evidenceCount: 1, lastEvidenceAt: new Date(), lastRedteamAt: null, redteamPassed: null },
    { framework: 'OWASP_LLM', controlId: 'LLM03', evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: null, redteamPassed: null },
    { framework: 'NIST_AI_RMF', controlId: 'GOVERN-1', evidenceCount: 0, lastEvidenceAt: null, lastRedteamAt: new Date(), redteamPassed: true },
  ],
  evidenceTotal: 3,
  redteamPass: 2,
  redteamFail: 0,
});
console.log('  Overall score:', mixedScore.overallScore);
console.log('  Gaps:', mixedScore.gaps.length, '(expect 1 — LLM03 with 0%)');
console.log('  OWASP coverage:', mixedScore.owaspCoverage);
console.log('  NIST coverage:', mixedScore.frameworkScores['NIST_AI_RMF']?.score);

console.log('\n✅ Phase 7 scoring tests complete');
