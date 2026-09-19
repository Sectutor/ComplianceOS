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

/**
 * Post an agent reply to its OWN direct channel AND (if dispatched from the War
 * Room) to the War Room broadcast. This makes each agent's individual sidebar
 * chat show their work history, not just the War Room.
 */
export function postAgentReply(msg: ChatMessage, broadcastToWarRoom: boolean): void {
  // Always post to the agent's own direct channel.
  agentMessages.push({ ...msg, channelId: msg.senderId });
  // Also broadcast to the War Room if the task originated there.
  if (broadcastToWarRoom) {
    agentMessages.push({ ...msg, channelId: "war_room" });
  }
  // Track last activity so the sidebar shows a live "last active" time.
  if (msg.senderId && msg.senderId !== "user") {
    recordAgentActivity(msg.senderId);
  }
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

// ── Live agent activity (for "Tara is working..." UI indicators) ─────────────

export interface AgentActivity {
  agentId: string;
  /** What the agent is currently doing, e.g. "Drafting Access Control Policy". */
  task: string;
  startedAt: number;
}

/**
 * Agents currently doing work. Keyed by agentId so the UI can subscribe and show
 * a per-agent "working" indicator (typing dots + task description).
 */
const activeAgents = new Map<string, AgentActivity>();

/** Mark an agent as working on a task. */
export function markAgentWorking(agentId: string, task: string): void {
  activeAgents.set(agentId, { agentId, task, startedAt: Date.now() });
}

/** Clear an agent's working status (task done or failed). */
export function markAgentIdle(agentId: string): void {
  activeAgents.delete(agentId);
}

/** Snapshot of all currently-working agents. */
export function getActiveAgents(): AgentActivity[] {
  // Auto-stale: drop anything older than 5 minutes (safety net).
  const cutoff = Date.now() - 5 * 60_000;
  for (const [id, act] of activeAgents) {
    if (act.startedAt < cutoff) activeAgents.delete(id);
  }
  return Array.from(activeAgents.values());
}

// ── Last-active timestamps (drives the sidebar "Active Now / 5m ago") ───────

const lastActive = new Map<string, number>();

/** Record that an agent just did something (post, routine, etc). */
export function recordAgentActivity(agentId: string): void {
  lastActive.set(agentId, Date.now());
}

/** Snapshot of every agent's last activity epoch (ms). */
export function getLastActive(): Record<string, number> {
  return Object.fromEntries(lastActive);
}
