import { customType, pgEnum } from "drizzle-orm/pg-core";

// Custom type for pgvector - used for vector embeddings
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Shared Enums for ComplianceOS
export const roleEnum = pgEnum("role", ["owner", "admin", "editor", "viewer", "auditor"]);

export const controlStatusEnum = pgEnum("control_status", ["active", "inactive", "draft"]);

export const clientControlStatusEnum = pgEnum("client_control_status", ["not_implemented", "in_progress", "implemented", "not_applicable"]);

export const crmEngagementStageEnum = pgEnum("crm_engagement_stage", ["planned", "gap_analysis", "remediation", "audit_prep", "audit_active", "certified", "maintenance"]);

export const policyStatusEnum = pgEnum("policy_status", ["draft", "review", "approved", "archived"]);

export const policyReviewStatusEnum = pgEnum("policy_review_status", ["analyzing", "completed", "applying_changes", "applied", "failed"]);

export const evidenceStatusEnum = pgEnum("evidence_status", ["pending", "collected", "verified", "rejected", "expired", "not_applicable"]);

export const taskTypeEnum = pgEnum("task_type", ["control", "policy", "evidence", "mapping"]);

export const raciRoleEnum = pgEnum("raci_role", ["responsible", "accountable", "consulted", "informed"]);

export const kanbanStatusEnum = pgEnum("kanban_status", ["backlog", "todo", "in_progress", "review", "done"]);

export const roadmapStatusEnum = pgEnum("roadmap_status", ["draft", "active", "on_track", "delayed", "completed"]);

export const implementationStatusEnum = pgEnum("implementation_status", ["not_started", "planning", "in_progress", "testing", "completed", "blocked"]);

export const dataBreachStatusEnum = pgEnum("data_breach_status", ["open", "investigating", "closed", "reported"]);

export const reportVersionEnum = pgEnum("report_version", ["draft", "v1.0", "v1.1", "v2.0", "final"]);

export const findingSeverityEnum = pgEnum("finding_severity", ["low", "medium", "high", "critical"]);

export const findingStatusEnum = pgEnum("finding_status", ["open", "remediated", "accepted", "closed"]);

export const policyModuleEnum = pgEnum("policy_module", ["general", "privacy"]);

export const consentStatusEnum = pgEnum("consent_status", ["active", "withdrawn", "expired", "revoked"]);

export const consentTypeEnum = pgEnum("consent_type", ["marketing", "analytics", "functional", "third_party", "cookie"]);

export const cloudProviderEnum = pgEnum("cloud_provider", ["aws", "azure", "gcp"]);

export const assetStatusEnum = pgEnum("asset_status", ["active", "archived", "disposed"]);

// 1. Assets (The things we protect) - ISO 27005

export const vulnerabilityStatusEnum = pgEnum("vulnerability_status", ["open", "mitigated", "accepted", "remediated"]);

export const threatStatusEnum = pgEnum("threat_status", ["active", "dormant", "monitored"]);

export const riskAssessmentStatusEnum = pgEnum("risk_assessment_status", ["draft", "approved", "reviewed"]);

export const workItemTypeEnum = pgEnum("work_item_type", ["review", "approval", "evidence_collection", "raci_assignment", "risk_treatment", "vendor_assessment", "bcp_approval", "policy_review", "control_implementation", "risk_review", "control_assessment"]);

export const workItemStatusEnum = pgEnum("work_item_status", ["pending", "in_progress", "completed", "cancelled", "escalated"]);

export const workItemPriorityEnum = pgEnum("work_item_priority", ["low", "medium", "high", "critical"]);

export const escalationTriggerEnum = pgEnum("escalation_trigger", ["overdue", "risk_threshold_breach", "approval_rejected", "status_regression", "missing_evidence", "missing_raci"]);

export const governanceEntityTypeEnum = pgEnum("governance_entity_type", ["policy", "control", "risk", "bcp_plan", "vendor", "evidence", "task", "roadmap", "implementation_plan"]);

export const reportTypeEnum = pgEnum("report_type", ["executive_summary", "controls", "policies", "evidence", "mappings", "soa", "compliance_readiness", "audit_bundle"]);

export const dpiaStatusEnum = pgEnum("dpia_status", ["draft", "in_progress", "under_review", "completed"]);

export const internationalTransferStatusEnum = pgEnum("international_transfer_status", ["pending", "active", "expired", "risk_flagged"]);

export const transferToolEnum = pgEnum("transfer_tool", ["scc_2021", "bcr", "adequacy", "derogation", "ad_hoc"]);

export const sccModuleEnum = pgEnum("scc_module", ["c2c", "c2p", "p2p", "p2c"]);

export const incidentSeverityEnum = pgEnum("incident_severity", ["low", "medium", "high", "critical"]);

export const incidentStatusEnum = pgEnum("incident_status", ["open", "investigating", "mitigated", "resolved", "reported"]);

export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);

export const aiSystemStatusEnum = pgEnum("ai_system_status", ["evaluation", "development", "production", "monitoring", "retired"]);

export const aiRiskLevelEnum = pgEnum("ai_risk_level", ["low", "medium", "high", "critical", "unacceptable"]);
// EU AI Act risk classification (Article 6-7)

export const euAiActClassEnum = pgEnum("eu_ai_act_class", ["unacceptable", "high", "limited", "minimal", "general_purpose_ai", "not_applicable"]);

export const policyAckStatusEnum = pgEnum("policy_ack_status", ["pending", "acknowledged", "declined"]);

export const accessReviewCycleStatusEnum = pgEnum("access_review_cycle_status", ["draft", "active", "completed"]);

export const accessReviewTaskStatusEnum = pgEnum("access_review_task_status", ["pending", "certified", "revoked", "overdue"]);

// Custom type for pgvector - used for vector embeddings
