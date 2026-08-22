/**
 * Zero-Trust Action Gatekeeper & Blast Radius Interceptor
 * Evaluates bot actions against deterministic security rules.
 * Automatically intercepts and routes all state-changing/destructive actions
 * to the Approval Inbox for 1-click human verification.
 */

export type ActionRiskLevel = "read_only" | "low_risk" | "high_risk_destructive";

export interface BotActionRequest {
  id: string;
  botId: string;
  botName: string;
  actionType: string;
  targetResource: string;
  description: string;
  payloadOrDiff: string;
}

export interface GatekeeperEvaluation {
  riskLevel: ActionRiskLevel;
  requiresApproval: boolean;
  reason: string;
  blastRadius: "zero" | "localized" | "production_infrastructure" | "external_regulatory";
}

export class ActionGatekeeper {
  // Deterministic rule table
  private static readonly DESTRUCTIVE_ACTIONS = new Set([
    "terraform_apply",
    "cloud_delete_bucket",
    "cloud_modify_sg",
    "iam_delete_access_key",
    "iam_revoke_privilege",
    "regulatory_send_csirt_notice",
    "regulatory_notify_dpa",
    "policy_delete_master",
    "db_schema_drop",
    "dns_modify_records",
  ]);

  private static readonly LOW_RISK_ACTIONS = new Set([
    "github_create_pr",
    "slack_send_nudge",
    "export_audit_zip",
    "draft_policy_revision",
    "evidence_sign_hash",
  ]);

  /**
   * Evaluates an action request and determines if it requires human sign-off
   */
  public evaluate(action: BotActionRequest): GatekeeperEvaluation {
    const actionLower = action.actionType.toLowerCase();

    // 1. High Risk / Destructive -> Must stage in Approval Inbox
    if (ActionGatekeeper.DESTRUCTIVE_ACTIONS.has(actionLower) || actionLower.includes("apply") || actionLower.includes("delete") || actionLower.includes("revoke") || actionLower.includes("notify_external")) {
      const isRegulatory = actionLower.includes("csirt") || actionLower.includes("dpa") || actionLower.includes("regulatory");
      return {
        riskLevel: "high_risk_destructive",
        requiresApproval: true,
        reason: isRegulatory
          ? "External regulatory authority notification requires human-in-the-loop legal sign-off."
          : "Production infrastructure change or credential modification requires verified administrator sign-off.",
        blastRadius: isRegulatory ? "external_regulatory" : "production_infrastructure",
      };
    }

    // 2. Low Risk (Non-destructive write, PR creation, draft)
    if (ActionGatekeeper.LOW_RISK_ACTIONS.has(actionLower) || actionLower.includes("pr") || actionLower.includes("draft") || actionLower.includes("nudge")) {
      return {
        riskLevel: "low_risk",
        requiresApproval: actionLower.includes("pr"), // Staged PRs require approval to merge
        reason: "Staged Pull Request or notification prepared for human review.",
        blastRadius: "localized",
      };
    }

    // 3. Read Only (Default)
    return {
      riskLevel: "read_only",
      requiresApproval: false,
      reason: "Read-only inspection query; zero infrastructure modification risk.",
      blastRadius: "zero",
    };
  }
}

export const actionGatekeeper = new ActionGatekeeper();
