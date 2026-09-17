// ============================================================================
// NARRATIVE GENERATOR — Human-readable compliance stories
// Phase 8: Turns scores into board-ready narratives
// ============================================================================

export interface NarrativeInput {
  agentName: string;
  overallScore: number;
  owaspCoverage: number;
  previousScore?: number;
  previousDate?: string;
  gaps: Array<{ controlId: string; framework: string; confidence: number }>;
  redteamPass: number;
  redteamFail: number;
  evidenceCount: number;
  engagementStage: string;
}

export interface Narrative {
  headline: string;
  summary: string;
  topGaps: string;
  actionItems: string[];
  trend: {
    direction: 'up' | 'down' | 'flat';
    delta: number;
    text: string;
  };
  readiness: {
    level: 'critical' | 'needs-work' | 'good' | 'audit-ready';
    text: string;
  };
}

export function generateNarrative(input: NarrativeInput): Narrative {
  const {
    agentName, overallScore, owaspCoverage, previousScore,
    gaps, redteamPass, redteamFail, evidenceCount, engagementStage
  } = input;

  // Readiness level
  let readiness: Narrative['readiness'];
  if (overallScore >= 85) readiness = { level: 'audit-ready', text: 'Audit-ready — maintain with quarterly reviews' };
  else if (overallScore >= 70) readiness = { level: 'good', text: 'Good posture — close remaining gaps for full compliance' };
  else if (overallScore >= 40) readiness = { level: 'needs-work', text: 'Needs work — focus on top gaps to get above 70%' };
  else readiness = { level: 'critical', text: 'Critical — immediate action required on multiple controls' };

  // Trend
  const delta = previousScore !== undefined ? overallScore - previousScore : 0;
  const trend: Narrative['trend'] = {
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    delta: Math.abs(delta),
    text: delta > 0 ? `Improved ${delta}% since last review` : delta < 0 ? `Declined ${Math.abs(delta)}% since last review` : 'No change since last review',
  };

  // Headline
  const headline = `${agentName}: ${overallScore}% Compliant — ${readiness.level === 'audit-ready' ? 'Ready for Audit' : readiness.level === 'good' ? 'Nearly There' : 'Action Needed'}`;

  // Summary
  const summary = `${agentName} achieved an overall compliance score of ${overallScore}%. ` +
    (gaps.length === 0
      ? `All mapped controls meet the confidence threshold. ${evidenceCount} evidence item(s) on file.`
      : `${gaps.length} control(s) require attention to reach full compliance.`) +
    (redteamPass + redteamFail > 0
      ? ` ${redteamPass} of ${redteamPass + redteamFail} red team tests passed.`
      : ' No red team tests recorded yet.');

  // Top gaps
  const criticalGaps = gaps.filter(g => g.confidence === 0).slice(0, 3);
  const topGaps = criticalGaps.length > 0
    ? `Critical gaps: ${criticalGaps.map(g => `${g.controlId} (${g.framework})`).join(', ')}`
    : gaps.length > 0
      ? `Lowest confidence: ${gaps.slice(0, 3).map(g => `${g.controlId} (${g.confidence}%)`).join(', ')}`
      : 'No gaps detected.';

  // Action items
  const actionItems: string[] = [];
  if (criticalGaps.length > 0) {
    actionItems.push(`Upload evidence for ${criticalGaps.length} control(s) at 0% confidence`);
  }
  if (redteamFail > 0) {
    actionItems.push(`Re-test ${redteamFail} failed red team test(s)`);
  }
  if (evidenceCount === 0) {
    actionItems.push('Upload at least one evidence item to establish baseline');
  }
  if (engagementStage === 'discovery') {
    actionItems.push('Complete policy card deployment');
  }
  if (overallScore >= 70 && overallScore < 85) {
    actionItems.push(`Close remaining ${gaps.length} gap(s) to reach audit-ready (85%+)`);
  }
  if (actionItems.length === 0) {
    actionItems.push('Schedule quarterly review to maintain compliance');
  }

  return { headline, summary, topGaps, actionItems, trend, readiness };
}
