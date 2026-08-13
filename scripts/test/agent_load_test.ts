/**
 * LOAD TEST — Performance at scale
 * Phase 8: measure how the system handles many agents
 * 
 * Run with: npx tsx scripts/test/agent_load_test.ts
 */

import { performance } from 'perf_hooks';

console.log('\n=== Load Test ===\n');

// Simulate scoring computation for many agents
const NUM_AGENTS = 250;
const CONTROLS_PER_AGENT = 43;
const EVIDENCE_PER_AGENT = 10;

// Mock mapping data
interface MockMapping {
  framework: string;
  controlId: string;
  evidenceCount: number;
  lastEvidenceAt: Date | null;
  lastRedteamAt: Date | null;
  redteamPassed: boolean | null;
}

function generateMappings(agentIndex: number): MockMapping[] {
  const frameworks = ['OWASP_LLM', 'NIST_AI_RMF', 'EU_AI_ACT', 'ISO_42001'];
  const controls: Record<string, string[]> = {
    OWASP_LLM: ['LLM01','LLM02','LLM03','LLM04','LLM05','LLM06','LLM07','LLM08','LLM09','LLM10'],
    NIST_AI_RMF: ['GOVERN-1','GOVERN-2','GOVERN-3','MAP-1','MAP-2','MAP-3','MEASURE-1','MEASURE-2','MEASURE-3','MANAGE-1','MANAGE-2'],
    EU_AI_ACT: ['Art.8','Art.9','Art.10','Art.11','Art.13','Art.14','Art.15','Art.16','Art.53','Art.72'],
    ISO_42001: ['ISO42001-4','ISO42001-5','ISO42001-6','ISO42001-7','ISO42001-8','ISO42001-9','ISO42001-10'],
  };

  const mappings: MockMapping[] = [];
  for (const fw of frameworks) {
    for (const ctrl of controls[fw]) {
      mappings.push({
        framework: fw,
        controlId: ctrl,
        evidenceCount: Math.floor(Math.random() * 3),
        lastEvidenceAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
        lastRedteamAt: Math.random() > 0.5 ? new Date() : null,
        redteamPassed: Math.random() > 0.2,
      });
    }
  }
  return mappings;
}

function computeScoreLocal(mappings: MockMapping[]): number {
  const frameworkScores: Record<string, { total: number; covered: number }> = {};
  
  for (const m of mappings) {
    if (!frameworkScores[m.framework]) frameworkScores[m.framework] = { total: 0, covered: 0 };
    frameworkScores[m.framework].total++;
    
    let confidence = 0;
    if (m.evidenceCount > 0 && m.lastEvidenceAt) {
      const daysSince = (Date.now() - m.lastEvidenceAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince <= 90) confidence = Math.min(95, 70 + m.evidenceCount * 5);
      else confidence = 15;
    } else if (m.redteamPassed && m.lastRedteamAt) {
      confidence = 85;
    }
    if (confidence >= 70) frameworkScores[m.framework].covered++;
  }

  const scores = Object.values(frameworkScores).map(f => f.total > 0 ? Math.round((f.covered / f.total) * 100) : 0);
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

async function runLoadTest() {
  console.log(`Agents: ${NUM_AGENTS}`);
  console.log(`Controls/agent: ${CONTROLS_PER_AGENT}`);
  console.log(`Total mappings: ${NUM_AGENTS * CONTROLS_PER_AGENT}`);

  const start = performance.now();
  const scores: number[] = [];

  for (let i = 0; i < NUM_AGENTS; i++) {
    const mappings = generateMappings(i);
    const score = computeScoreLocal(mappings);
    scores.push(score);
  }

  const end = performance.now();
  const totalMs = end - start;
  const perAgent = totalMs / NUM_AGENTS;

  // Stats
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  console.log(`\n=== Results ===`);
  console.log(`Total time: ${totalMs.toFixed(0)}ms`);
  console.log(`Per agent: ${perAgent.toFixed(2)}ms`);
  console.log(`Avg score: ${avgScore}%`);
  console.log(`Min score: ${minScore}%`);
  console.log(`Max score: ${maxScore}%`);
  console.log(`Agents/sec: ${(NUM_AGENTS / (totalMs / 1000)).toFixed(0)}`);

  // Verdict
  if (perAgent < 5) {
    console.log(`\n✓ PASS: ${perAgent.toFixed(2)}ms/agent < 5ms target`);
  } else {
    console.log(`\n✗ FAIL: ${perAgent.toFixed(2)}ms/agent exceeds 5ms target`);
  }

  if (totalMs < 5000) {
    console.log(`✓ PASS: Full cycle ${totalMs.toFixed(0)}ms < 5s target`);
  } else {
    console.log(`✗ FAIL: Full cycle ${totalMs.toFixed(0)}ms exceeds 5s target`);
  }
}

runLoadTest();
