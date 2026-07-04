// Test the full addon pipeline locally (no Docker needed)
import("../packages/addons/src/registry.ts").then(async (registry) => {
  const addon = registry.getAddonBySlug("cloud-scanner");
  console.log(`=== Addon Pipeline Test ===`);
  console.log(`Addon: ${addon?.name} ($${((addon?.price ?? 0) / 100).toFixed(0)}/mo)`);

  const runner = await import("../packages/addons/src/prowler/runner.ts");
  const mockOutput = await runner.runProwlerScan({
    provider: "aws", accountName: "test-account", regions: ["us-east-1"],
    frameworks: ["nist_csf_2.0", "soc2"],
    credentials: { accessKeyId: "AKIA***", secretAccessKey: "***" },
  });
  console.log(`\n✓ Runner: ${mockOutput.summary.total} checks, ${mockOutput.findings.length} findings`);

  const normalizer = await import("../packages/addons/src/prowler/normalizer.ts");
  const result = normalizer.normalizeProwlerOutput(mockOutput, {
    clientId: 1, provider: "aws", accountName: "test-account", source: "prowler",
  });
  console.log(`\n✓ Normalizer: ${result.findings.length} findings`);
  console.log(`  First: "${result.findings[0]?.title}" [${result.findings[0]?.severity}]`);

  const { FindingsPusher } = await import("../packages/addons/src/runtime/pusher.ts");
  const pusher = new FindingsPusher();
  for (const f of result.findings) {
    pusher.pushRisk({ clientId: 1, title: f.title, severity: f.severity, description: f.description, frameworkMappings: f.frameworkMappings, source: "prowler", resourceId: f.resourceId, rawEvidence: f.rawEvidence });
  }
  const flush = await pusher.flush();
  console.log(`\n✓ Pusher: ${flush.risksCreated} risks ready`);

  console.log(`\n=== ✓ ALL TESTS PASSED ===`);
}).catch(e => { console.error("FAILED:", e.message); process.exit(1); });
