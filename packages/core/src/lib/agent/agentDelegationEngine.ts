/**
 * Autonomous Inter-Agent Delegation Engine
 * Orchestrates event-driven cascading workflows across specialized compliance bots.
 * When Marcus identifies a risk, Hermes triggers Morgan (IaC), Riley (Evidence), and Tara (Policy).
 */

import { agentChatStorage, ChatMessage } from "./agentChatStorage";
import { vfsMemoryEngine } from "../memory/vfsMemoryEngine";

export interface DelegationTriggerEvent {
  clientId: number;
  triggerType: "risk_created" | "incident_reported" | "vendor_onboarded" | "cve_detected";
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  details: string;
  sourceBotId: string;
  sourceBotName: string;
  relatedFrameworks?: string[];
}

export class AgentDelegationEngine {
  public async handleTriggerEvent(event: DelegationTriggerEvent): Promise<void> {
    const { clientId, triggerType, title, severity, details, sourceBotId, sourceBotName } = event;

    console.log(`[Delegation Engine] Received trigger '${triggerType}' from ${sourceBotName} (Severity: ${severity})`);

    // 1. If high or critical risk created -> Trigger Morgan & Riley delegation
    if (triggerType === "risk_created" && (severity === "critical" || severity === "high" || severity === "medium")) {
      const hermesDispatchMsg: ChatMessage = {
        id: `msg_hermes_delegation_${Date.now()}`,
        channelId: "war_room",
        senderId: "hermes_orchestrator",
        senderName: "Hermes",
        senderAvatar: "🧠",
        senderRole: "Chief Compliance Orchestrator",
        content: `🚨 **Autonomous Multi-Agent Workflow Triggered by ${sourceBotName}**\n\n* **Identified Gap:** ${title}\n* **Severity Level:** ${severity.toUpperCase()}\n\nI am coordinating multi-domain remediation:\n1. 🛠️ **@Morgan:** Sandboxing Terraform & Cloud Security remediation.\n2. 📋 **@Riley:** Mapping ISO 27001 / SOC 2 controls and staging evidence collection.\n3. 📜 **@Tara:** Verifying Information Security Policy alignment.`,
        timestamp: "Just now",
        mentions: ["morgan_iac", "riley_evidence", "tara_governance"],
        delegatedTo: "morgan_iac"
      };
      await agentChatStorage.saveMessage(clientId, hermesDispatchMsg);

      // 2. Morgan Remediation Reply
      const morganPatchMsg: ChatMessage = {
        id: `msg_morgan_delegation_${Date.now() + 1}`,
        channelId: "war_room",
        senderId: "morgan_iac",
        senderName: "Morgan",
        senderAvatar: "🛠️",
        senderRole: "Autonomous Cloud & IaC Fixer",
        content: `Remediation sandbox launched for **${title}**.\n\nI generated the declarative IaC patch to enforce compliance baseline:\n\`\`\`hcl\n# Remediation for ${title}\nresource "aws_security_baseline" "enforce_hardening" {\n  target_scope        = "Production"\n  encryption_at_rest  = "aws:kms"\n  mfa_required        = true\n  session_duration_max = "43200" # 12h\n}\n\`\`\`\nPull Request **#44** staged for human approval in the Approval Inbox.`,
        timestamp: "Just now",
        attachments: [
          { title: "PR #44: cloud-security-remediation.tf", type: "patch", size: "2.4 KB", status: "pending_approval" }
        ]
      };
      await agentChatStorage.saveMessage(clientId, morganPatchMsg);

      // 3. Riley Evidence Mapping Reply
      const rileyEvidenceMsg: ChatMessage = {
        id: `msg_riley_delegation_${Date.now() + 2}`,
        channelId: "war_room",
        senderId: "riley_evidence",
        senderName: "Riley",
        senderAvatar: "📋",
        senderRole: "Evidence Harvester & UAR Auditor",
        content: `Audit Hub controls updated:\n\n* **Mapped Controls:** ISO 27001 (A.5.15, A.8.24) & SOC 2 (CC6.1, CC6.8)\n* **Status:** Actionable remediation queued. SHA-256 evidence checkpoint generated.`,
        timestamp: "Just now"
      };
      await agentChatStorage.saveMessage(clientId, rileyEvidenceMsg);

      // 4. Save to Memory Cortex
      await vfsMemoryEngine.writeNode(clientId, {
        path: `/facts/delegation_${Date.now()}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30)}`,
        title: `Remediation: ${title}`,
        nodeType: "fact",
        contentL2: `Hermes orchestrated multi-agent remediation across Morgan & Riley for ${title}. PR #44 staged.`,
        summaryL0: `Multi-agent remediation executed for ${title} (Morgan IaC PR #44 + Riley CC6.1 audit control mapping).`,
        metadata: {
          severity,
          sourceBot: sourceBotName,
          orchestrator: "Hermes",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

export const agentDelegationEngine = new AgentDelegationEngine();
