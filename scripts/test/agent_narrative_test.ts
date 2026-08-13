/**
 * NARRATIVE GENERATOR TEST — Verify human-readable stories
 * Phase 8: ensures the narrative engine produces coherent, useful text
 */

import { generateNarrative, NarrativeInput } from '../../packages/core/src/lib/agent/narrative';

console.log('\n=== Narrative Generator Tests ===\n');

// Test 1: Low score agent (critical)
const criticalAgent: NarrativeInput = {
  agentName: 'Data Processor',
  overallScore: 32,
  owaspCoverage: 20,
  gaps: [
    { controlId: 'LLM01', framework: 'OWASP_LLM', confidence: 0 },
    { controlId: 'LLM05', framework: 'OWASP_LLM', confidence: 0 },
    { controlId: 'Art.14', framework: 'EU_AI_ACT', confidence: 10 },
  ],
  redteamPass: 0,
  redteamFail: 2,
  evidenceCount: 1,
  engagementStage: 'discovery',
};

console.log('Test 1: Critical Agent (32%)');
const narrative1 = generateNarrative(criticalAgent);
console.log(`  Headline: ${narrative1.headline}`);
console.log(`  Summary: ${narrative1.summary}`);
console.log(`  Top Gaps: ${narrative1.topGaps}`);
console.log(`  Actions: ${narrative1.actionItems.length} items`);
console.log(`  Trend: ${narrative1.trend.text}`);
console.log(`  Readiness: ${narrative1.readiness.text}`);

// Test 2: Good score agent
const goodAgent: NarrativeInput = {
  agentName: 'Hermes Research',
  overallScore: 78,
  owaspCoverage: 70,
  previousScore: 65,
  gaps: [
    { controlId: 'LLM05', framework: 'OWASP_LLM', confidence: 50 },
    { controlId: 'Art.13', framework: 'EU_AI_ACT', confidence: 60 },
  ],
  redteamPass: 5,
  redteamFail: 1,
  evidenceCount: 8,
  engagementStage: 'verified',
};

console.log('\nTest 2: Good Agent (78%)');
const narrative2 = generateNarrative(goodAgent);
console.log(`  Headline: ${narrative2.headline}`);
console.log(`  Summary: ${narrative2.summary}`);
console.log(`  Top Gaps: ${narrative2.topGaps}`);
console.log(`  Actions: ${narrative2.actionItems.length} items`);
console.log(`  Trend: ${narrative2.trend.text}`);
console.log(`  Readiness: ${narrative2.readiness.text}`);

// Test 3: Audit-ready agent
const readyAgent: NarrativeInput = {
  agentName: 'Compliance Bot',
  overallScore: 92,
  owaspCoverage: 90,
  previousScore: 88,
  gaps: [],
  redteamPass: 10,
  redteamFail: 0,
  evidenceCount: 15,
  engagementStage: 'handoff',
};

console.log('\nTest 3: Audit-Ready Agent (92%)');
const narrative3 = generateNarrative(readyAgent);
console.log(`  Headline: ${narrative3.headline}`);
console.log(`  Summary: ${narrative3.summary}`);
console.log(`  Top Gaps: ${narrative3.topGaps}`);
console.log(`  Actions: ${narrative3.actionItems.length} items`);
console.log(`  Trend: ${narrative3.trend.text}`);
console.log(`  Readiness: ${narrative3.readiness.text}`);

console.log('\n✓ Narrative generator tests complete');
