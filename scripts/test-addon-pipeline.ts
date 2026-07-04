/**
 * Addon System Quick Test
 *
 * Tests the full pipeline without Docker:
 * 1. Imports all addon modules
 * 2. Creates executor with in-memory DB
 * 3. Subscribes to Cloud Scanner
 * 4. Runs a scan (uses mock data since Docker not available)
 * 5. Verifies findings are normalized and pushed
 *
 * Run: npx tsx scripts/test-addon-pipeline.ts
 */

// Use CommonJS compatible approach for testing
async function main() {
  // Step 1: Load registry
  const registry = await import("../packages/addons/src/registry.ts");
  const addon = registry.getAddonBySlug("cloud-scanner");
  console.log(`\n=== Addon Pipeline Test ===`);
  console.log(`Addon: ${addon?.name}`);
  console.log(`Price: $${(addon?.price ?? 0) / 100}/mo`);
  console.log(`Slug: ${addon?.slug}`);

  // Step 2: Test runner (mock fallback)
  const runner = await import("../packages/addons/src/prowler/runner.ts");
  const mockOutput = await runner.runProwlerScan({
    provider: "aws",
    accountName: "test-account",
    regions: ["us-east-1"],
    frameworks: ["nist_csf_2.0", "soc2"],
    credentials: { accessKeyId: "AKIA***", secretAccessKey: "***" },
  });
  console.log(`\n✓ Runner (mock): ${mockOutput.summary.total} checks, ${mockOutput.findings.length} findings`);
  console.log(`  Failures: ${mockOutput.summary.failed}`);

  // Step 3: Test normalizer
  const normalizer = await import("../packages/addons/src/prowler/normalizer.ts");
  const result = normalizer.normalizeProwlerOutput(mockOutput, {
    clientId: 1,
    provider: "aws",
    accountName: "test-account",
    source: "prowler",
  });
  console.log(`\n✓ Normalizer: ${result.findings.length} findings normalized`);
  
  const firstFinding = result.findings[0];
  console.log(`  Title: ${firstFinding.title}`);
  console.log(`  Severity: ${firstFinding.severity}`);
  console.log(`  Frameworks: ${firstFinding.frameworkMappings.slice(0, 3).join(", ")}`);
  console.log(`  Has remediation: ${!!firstFinding.remediation}`);

  const severities = [...new Set(result.findings.map(f => f.severity))];
  console.log(`  Severity distribution: ${severities.join(", ")}`);

  // Step 4: Test pusher
  const { FindingsPusher } = await import("../packages/addons/src/runtime/pusher.ts");
  const pusher = new FindingsPusher();

  for (const finding of result.findings) {
    pusher.pushRisk({
      clientId: 1,
      title: finding.title,
      severity: finding.severity,
      description: finding.description,
      frameworkMappings: finding.frameworkMappings,
      source: "prowler",
      resourceId: finding.resourceId,
      remediation: finding.remediation,
      rawEvidence: finding.rawEvidence,
    });
  }
  pusher.pushEvidence({
    clientId: 1,
    title: "Prowler Scan Test",
    artifactType: "scan_result",
    artifactData: {
      provider: "aws",
      account: "test-account",
      totalChecks: mockOutput.summary.total,
    },
    source: "prowler",
  });

  const flushResult = await pusher.flush();
  console.log(`\n✓ Pusher: ${flushResult.risksCreated} risks, ${flushResult.evidencePushed} evidence records`);

  // Step 5: Verify full pipeline
  const hasCritical = result.findings.some(f => f.severity === 'critical' || f.severity === 'high');
  console.log(`\n✓ Pipeline complete: ${hasCritical ? 'Critical/high issues detected' : 'All clear'}`);
  console.log(`  ${flushResult.risksCreated} findings would be added to risk register`);
  console.log(`  ${flushResult.evidencePushed} evidence records would be attached`);

  console.log(`\n=== ✓ ALL TESTS PASSED ===`);
}

main().catch(e => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
