/**
 * Autonomous Inter-Agent Delegation Engine — REAL implementations.
 *
 * On a trigger event, Hermes gathers the client's actual context from the
 * database (vendors, risks, policies, evidence), asks each specialist bot to
 * produce its response via the configured LLM provider, and posts those
 * responses to the war room. Every message states what data it is based on.
 * If no LLM provider is configured, delegation posts an honest orchestration
 * notice with the real context instead of fabricated bot replies.
 *
 * HARD RULE (user directive): never fabricate PR numbers, scan results,
 * or compliance claims.
 */

import { getDb } from "../../db";
import { vendors, riskScenarios, clientPolicies, evidence } from "../../schema";
import { eq } from "drizzle-orm";
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

interface ClientContext {
  clientName: string;
  vendorCount: number;
  highCriticalityVendors: string[];
  openHighRisks: Array<{ title: string; score: number | null }>;
  policyCount: number;
  evidenceCount: number;
}

async function gatherContext(clientId: number): Promise<ClientContext> {
  const db = await getDb();
  const [vendorRows, riskRows, policyRows, evidenceRows] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.clientId, clientId)),
    db.select().from(riskScenarios).where(eq(riskScenarios.clientId, clientId)),
    db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId)),
    db.select().from(evidence).where(eq(evidence.clientId, clientId)),
  ]);
  return {
    clientName: `Client #${clientId}`,
    vendorCount: vendorRows.length,
    highCriticalityVendors: vendorRows.filter((v) => v.criticality === "High").map((v) => v.name),
    openHighRisks: riskRows
      .filter((r) => (r.inherentScore ?? 0) >= 12)
      .slice(0, 5)
      .map((r) => ({ title: r.title, score: r.inherentScore })),
    policyCount: policyRows.length,
    evidenceCount: evidenceRows.length,
  };
}

function contextDigest(ctx: ClientContext, event: DelegationTriggerEvent): string {
  return [
    `Trigger: ${event.triggerType} — "${event.title}" (severity: ${event.severity}) reported by ${event.sourceBotName}.`,
    `Details: ${event.details || "(none supplied)"}`,
    `Client state from live registers: ${ctx.vendorCount} vendors (${ctx.highCriticalityVendors.length} High criticality), ` +
      `${ctx.openHighRisks.length} risks scored ≥12/25, ${ctx.policyCount} policies, ${ctx.evidenceCount} evidence records.`,
    ctx.openHighRisks.length ? `Top existing risks: ${ctx.openHighRisks.map((r) => `"${r.title}" [${r.score ?? "?"}]`).join("; ")}.` : "",
    event.relatedFrameworks?.length ? `Related frameworks: ${event.relatedFrameworks.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SPECIALISTS = [
  {
    id: "morgan_iac",
    name: "Morgan",
    avatar: "🛠️",
    role: "Autonomous Cloud & IaC Remediation",
    instruction:
      "You are Morgan, cloud/IaC remediation specialist. Based ONLY on the provided context, outline the concrete remediation you WOULD prepare (controls, infrastructure changes, verification steps). Do NOT invent PR numbers, resource names, or claim anything was executed — say 'proposed for approval'. Keep under 180 words.",
  },
  {
    id: "riley_evidence",
    name: "Riley",
    avatar: "📋",
    role: "Evidence Harvester & UAR Auditor",
    instruction:
      "You are Riley, evidence specialist. Based ONLY on the provided context, list which compliance controls this event plausibly touches and what NEW evidence should be collected. Reference the actual evidence record count in the context. Do NOT claim evidence was generated. Keep under 150 words.",
  },
  {
    id: "tara_governance",
    name: "Tara",
    avatar: "📜",
    role: "Policy Lifecycle Lead",
    instruction:
      "You are Tara, governance lead. Based ONLY on the provided context, state whether existing policy coverage appears sufficient (cite the actual policy count given) and what policy updates might be required. Do NOT claim policies were created or updated. Keep under 120 words.",
  },
] as const;

export class AgentDelegationEngine {
  public async handleTriggerEvent(event: DelegationTriggerEvent): Promise<void> {
    const { clientId, title, severity, sourceBotName } = event;
    console.log(
      `[Delegation Engine] Trigger '${event.triggerType}' from ${sourceBotName} (severity: ${severity}) for client #${clientId}`
    );

    // Only cascade for meaningful severities
    if (!["critical", "high", "medium"].includes(severity)) return;

    const ctx = await gatherContext(clientId);
    const digest = contextDigest(ctx, event);

    // 1. Orchestrator dispatch (real context, no fabrication)
    const dispatchMsg: ChatMessage = {
      id: `msg_hermes_delegation_${Date.now()}`,
      channelId: "war_room",
      senderId: "hermes_orchestrator",
      senderName: "Hermes",
      senderAvatar: "🧠",
      senderRole: "Chief Compliance Orchestrator",
      content:
        `🚨 **Multi-agent delegation triggered by ${sourceBotName}**\n\n` +
        `* **Event:** ${event.triggerType} — "${title}" (${severity.toUpperCase()})\n\n` +
        `Coordinating specialists against live client context ` +
        `(${ctx.vendorCount} vendors, ${ctx.openHighRisks.length} high-scored risks, ${ctx.policyCount} policies, ${ctx.evidenceCount} evidence records):\n` +
        `1. 🛠️ **@Morgan:** remediation proposal → staged for human approval\n` +
        `2. 📋 **@Riley:** control impact & evidence plan\n` +
        `3. 📜 **@Tara:** policy coverage assessment`,
      timestamp: "Just now",
      mentions: SPECIALISTS.map((s) => s.id),
      delegatedTo: SPECIALISTS[0].id,
    };
    await agentChatStorage.saveMessage(clientId, dispatchMsg);

    // 2. Ask each specialist via LLM (falls back honestly when unavailable)
    let llmAvailable = true;
    const replies: ChatMessage[] = [];

    for (const spec of SPECIALISTS) {
      let content: string | null = null;
      try {
        const { llmService } = await import("../llm/service");
        const resp = await llmService.generate(
          {
            feature: "risk_analysis",
            systemPrompt: spec.instruction + `\n\nClient context:\n${digest}`,
            userPrompt: `Produce your specialist response to this ${event.triggerType} event.`,
            temperature: 0.4,
            maxTokens: 500,
          },
          { endpoint: "agent_delegation", clientId }
        );
        content = resp.text;
      } catch (err: any) {
        console.warn(`[Delegation Engine] LLM unavailable for ${spec.name}:`, err?.message);
        llmAvailable = false;
        break;
      }
      if (!content) break;

      replies.push({
        id: `msg_${spec.id}_delegation_${Date.now() + replies.length + 1}`,
        channelId: "war_room",
        senderId: spec.id,
        senderName: spec.name,
        senderAvatar: spec.avatar,
        senderRole: spec.role,
        content,
        timestamp: "Just now",
      });
    }

    if (replies.length > 0) {
      for (const m of replies) await agentChatStorage.saveMessage(clientId, m);
    } else if (!llmAvailable) {
      // Honest fallback: post the real context so the team still gets value.
      await agentChatStorage.saveMessage(clientId, {
        id: `msg_system_delegation_${Date.now()}`,
        channelId: "war_room",
        senderId: "system",
        senderName: "Delegation System",
        senderAvatar: "⚙️",
        senderRole: "Automation",
        content:
          `⚠️ Specialist replies unavailable: no LLM provider is configured (Settings → AI Providers).\n\n` +
          `Real client context gathered for this event:\n\`\`\`\n${digest}\n\`\`\`\n` +
          `No specialist actions have been taken. Configure a provider to enable full delegation.`,
        timestamp: "Just now",
      });
    }

    // 3. Memory cortex record of what actually happened
    try {
      await vfsMemoryEngine.writeNode(clientId, {
        path: `/facts/delegation_${Date.now()}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30)}`,
        title: `Delegation: ${title}`,
        nodeType: "fact",
        contentL2:
          `${replies.length > 0 ? `LLM-generated specialist responses posted (${replies.map((r) => r.senderName).join(", ")})` : `Honest fallback posted (no LLM provider)`} for ${event.triggerType} "${title}". Context was gathered live from vendors/risks/policies/evidence registers.`,
        summaryL0: `Delegation for "${title}": ${replies.length}/3 specialist responses generated.`,
        metadata: {
          severity,
          sourceBot: sourceBotName,
          orchestrator: "Hermes",
          specialistReplies: replies.length,
          llmAvailable,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      console.warn("[Delegation Engine] VFS write failed:", e?.message);
    }
  }
}

export const agentDelegationEngine = new AgentDelegationEngine();
