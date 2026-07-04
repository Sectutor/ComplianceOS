const { ADDON_REGISTRY } = await import("../packages/addons/src/registry.ts");
console.log("✓ Registry:", Object.keys(ADDON_REGISTRY).join(", "));

const { runProwlerScan } = await import("../packages/addons/src/prowler/runner.ts");
const out = await runProwlerScan({
  provider: "aws", accountName: "test", regions: ["us-east-1"],
  frameworks: ["nist_csf_2.0", "soc2"],
  credentials: { accessKeyId: "test", secretAccessKey: "test" }
});
console.log("✓ Mock scan:", out.summary.total, "findings");

const { normalizeProwlerOutput } = await import("../packages/addons/src/prowler/normalizer.ts");
const norm = normalizeProwlerOutput(out, { clientId: 1, provider: "aws", accountName: "test", source: "prowler" });
console.log("✓ Normalized:", norm.findings.length, "findings, first severity:", norm.findings[0]?.severity);
console.log("\n✓ Phase 2 ready");
