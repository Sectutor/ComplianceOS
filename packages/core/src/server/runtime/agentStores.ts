/**
 * Shared in-memory stores for the autonomous agent fleet.
 *
 * Both the War Room router (teammatesRouter.ts) and the fleet runtime
 * (agentFleet.ts) post to and read from these stores, so they live in their
 * own module to avoid circular imports. Messages are also persisted to the DB
 * layer over time, but the in-memory store is what the polling client reads.
 */
import type { ChatMessage } from "../routers/teammatesRouter";

export const agentMessages: ChatMessage[] = [
  // Seed the War Room with a welcome message so a fresh store isn't empty.
  {
    id: "msg_fleet_welcome",
    channelId: "war_room",
    senderId: "hermes_orchestrator",
    senderName: "Hermes",
    senderAvatar: "🧠",
    senderRole: "Chief Compliance Orchestrator",
    content:
      "🧠 **Fleet online.** I'm Hermes, your orchestrator. Tell me what you need and I'll dispatch the right specialist — @Tara for policies, @Marcus for risk, @Morgan for cloud fixes, @Alex for vendors, @Riley for evidence, @Sasha for vulnerabilities, @Nova for incidents, @Sam for audits, or @Elena for privacy.",
    timestamp: "Just now",
  },
];

/** Append a message to a channel (used by the fleet runtime to post agent replies). */
export function postAgentMessage(msg: ChatMessage): void {
  agentMessages.push(msg);
}

/** Read the most recent messages for a channel (newest last). */
export function readChannelMessages(channelId: string, limit = 100): ChatMessage[] {
  return agentMessages.filter((m) => m.channelId === channelId).slice(-limit);
}

export interface AgentTaskRecord {
  id: string;
  /** DB primary key, if this task was persisted. */
  dbId?: number;
  clientId: number;
  channelId: string;
  agentId: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  title: string;
  description?: string;
  /** Dispatch payload (prompt + context) stored for in-memory tasks. */
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

/** In-memory mirror of queued tasks for fast status queries. */
export const agentTaskQueue: AgentTaskRecord[] = [];
