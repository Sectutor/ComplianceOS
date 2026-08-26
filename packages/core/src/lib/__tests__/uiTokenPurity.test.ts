import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * UI token purity scan (UI-STANDARD §2) — static acceptance gate for the
 * Trust Center / Audit Management pages (QA cycle 13, scorecard #8/#9).
 *
 * Forbidden hard-coded surface/text classes (slate/gray/white/indigo) must be
 * ZERO. Data-viz scale colors (§18) and glass borders are explicitly allowed.
 */

const PAGES = [
  'packages/core/src/pages/TrustCenter.tsx',
  'packages/core/src/pages/AuditHub.tsx',
  'packages/core/src/pages/AuditManager.tsx',
  'packages/core/src/pages/cyber/SecurityTestingPanels.tsx',
  // NIS2 Phase 5 Task 5.2 Continuous Compliance Monitoring (QA cycle 22)
  'packages/core/src/pages/complianceMonitorApi.ts',
  'packages/core/src/pages/cyber/ComplianceMonitorPanels.tsx',
  // NIS2 Phase 6 Task 6.1 Policy Center (QA cycle 23) — landed in parallel
  // by the UI agent; skipped while pending so the gate stays green mid-build
  // and is enforced in full once the files land.
  'packages/core/src/pages/policyTemplatesNis2Api.ts',
  'packages/core/src/pages/cyber/PolicyCenterPanels.tsx',
  // NIS2 Phase 1 Task 1.2 Risk Quantification Engine (QA cycle 27) — landed
  // in parallel by the cycle-26 conductor; enforced strictly from landing.
  'packages/core/src/pages/riskQuantificationApi.ts',
  'packages/core/src/pages/cyber/RiskQuantificationPanels.tsx',
  // Multi-agent cockpit surfaces (QA cycle 28) — enforced strictly from
  // landing; the UI agent tokenizes these in parallel within the same cycle.
  // Deliberately NOT listed in PARALLEL_BUILD_FILES: absence is a failure.
  'packages/core/src/components/agent/MultiAgentChatCockpit.tsx',
  'packages/core/src/components/agent/TeammatesFleetView.tsx',
  'packages/core/src/components/agent/ApprovalInboxView.tsx',
  'packages/core/src/components/agent/ScheduledRoutinesView.tsx',
  // Credential Vault Security panels (QA cycle 32) — Settings → Security
  // live panels over the credentialVault.* tRPC procedures; enforced
  // strictly from landing.
  'packages/core/src/pages/security/CredentialVaultPanels.tsx',
  // Token-purity hardening wave, cycle 46 — enforced strictly from landing.
  // Each surface below was tokenized in cycle 46 by parallel UI agents;
  // deliberately NOT listed in PARALLEL_BUILD_FILES: absence is a failure.
  // Adversary intelligence panel (risk) — tokenized in cycle 46.
  'packages/core/src/components/risk/AdversaryIntelPanel.tsx',
  // NIST 800-37 Prepare step — tokenized in cycle 46.
  'packages/core/src/pages/nist/NIST80037Prepare.tsx',
  // NIST 800-37 Assess step — tokenized in cycle 46.
  'packages/core/src/pages/nist/NIST80037Assess.tsx',
  // NIST 800-37 Select step — tokenized in cycle 46.
  'packages/core/src/pages/nist/NIST80037Select.tsx',
  // Privacy program guide — tokenized in cycle 46.
  'packages/core/src/pages/privacy/PrivacyProgramGuide.tsx',
  // Cyber program guide — tokenized in cycle 46.
  'packages/core/src/pages/cyber/CyberProgramGuide.tsx',
  // ISO 27001 program guide — tokenized in cycle 46.
  'packages/core/src/pages/iso27001/ISOProgramGuide.tsx',
  // Board summary page — tokenized in cycle 46.
  'packages/core/src/pages/BoardSummaryPage.tsx',
  // Home / landing page — tokenized in cycle 46.
  'packages/core/src/pages/Home.tsx',
  // Cycle 47 tokenization wave — enforced strictly from landing; the UI agent
  // tokenizes these in parallel within cycle 47. Deliberately NOT listed in
  // PARALLEL_BUILD_FILES: absence is a failure.
  // MSP onboarding flow — tokenized in cycle 47.
  'packages/core/src/pages/MSPOnboarding.tsx',
  // NIST 800-30 risk assessment — tokenized in cycle 47.
  'packages/core/src/pages/nist/NIST80030RiskAssessment.tsx',
  // NIST 800-53 extras — tokenized in cycle 47.
  'packages/core/src/pages/nist/NIST80053Extras.tsx',
  // Governance program guide — tokenized in cycle 47.
  'packages/core/src/pages/governance/GovernanceProgramGuide.tsx',
  // SAR viewer (federal) — tokenized in cycle 47.
  'packages/core/src/pages/federal/SARViewer.tsx',
  // Policy editor — tokenized in cycle 47.
  'packages/core/src/pages/PolicyEditor.tsx',
  // NIST 800-30 impact analysis — tokenized in cycle 47.
  'packages/core/src/pages/nist/NIST80030ImpactAnalysis.tsx',
  // NIST 800-171 assessment page (federal) — tokenized in cycle 47.
  'packages/core/src/pages/federal/Nist800171AssessmentPage.tsx',
  // Cycle 48 tokenization wave — enforced strictly from landing; the UI agent
  // tokenizes these in parallel within cycle 48. Deliberately NOT listed in
  // PARALLEL_BUILD_FILES: absence is a failure.
  // NIST 800-37 Categorize step — tokenized in cycle 48.
  'packages/core/src/pages/nist/NIST80037Categorize.tsx',
  // NIST 800-37 Implement step — tokenized in cycle 48.
  'packages/core/src/pages/nist/NIST80037Implement.tsx',
  // NIST 800-37 Authorize step — tokenized in cycle 48.
  'packages/core/src/pages/nist/NIST80037Authorize.tsx',
  // ISO 27001 dashboard — tokenized in cycle 48.
  'packages/core/src/pages/iso27001/ISODashboard.tsx',
  // Compliance journey dashboard — tokenized in cycle 48.
  'packages/core/src/pages/ComplianceJourneyDashboard.tsx',
];

// Files owned by other agents in the current parallel build cycle. Existing
// entries above stay strict (missing file = gate failure); these pending
// entries are allowed to be absent until the conductor's end-of-cycle run.
const PARALLEL_BUILD_FILES = new Set([
  'packages/core/src/pages/policyTemplatesNis2Api.ts',
  'packages/core/src/pages/cyber/PolicyCenterPanels.tsx',
]);

// Hard-coded surface/text classes that violate UI-STANDARD §2.
const FORBIDDEN =
  /(?:text-slate-\d|bg-slate-\d|border-slate-\d|bg-white(?!\/)|text-gray-\d|bg-gray-\d|bg-indigo-\d|text-indigo-\d|text-black)/g;

describe('UI token purity (UI-STANDARD §2)', () => {
  it.each(PAGES)('%s contains no hard-coded slate/gray/white/indigo surface tokens', (file) => {
    const abs = path.join(process.cwd(), file);
    if (PARALLEL_BUILD_FILES.has(file) && !fs.existsSync(abs)) {
      return; // parallel-build guard: UI agent lands the file later this cycle
    }
    const source = fs.readFileSync(abs, 'utf8');
    const matches = source.match(FORBIDDEN) || [];
    expect(matches, `forbidden classes found in ${file}: ${[...new Set(matches)].join(', ')}`).toEqual([]);
  });
});
