/**
 * AI Features — barrel export for all 12 feature modules.
 *
 * Each module is privacy-aware and routes through the privacy gatekeeper.
 * No module should ever call an external provider directly.
 */

export * from "./evidence-classifier";
export * from "./gap-prioritizer";
export * from "./vendor-risk-scorer";
export * from "./incident-triage";
export * from "./dsar-classifier";
export * from "./policy-extractor";
export * from "./control-mapper";
export * from "./audit-readiness";
export * from "./remediation-orchestrator";
export * from "./regulation-monitor";
export * from "./confidence-escalation";
export * from "./compliance-query";
