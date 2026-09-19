/**
 * Autonomous Agent Fleet Runtime — the heartbeat.
 *
 * This is what makes the specialist agents REAL:
 *   - dispatchTask(): Hermes (or a schedule) creates an agent_tasks row. The
 *     task describes WHO (agentId), WHAT (type + input), and WHERE (channel).
 *   - tick(): picks up pending tasks and runs each one as an INDEPENDENT, REAL
 *     LLM call using that agent's focused expert prompt + its own token budget.
 *     The agent's genuine reply is posted to the channel as its own message.
 *   - Each agent also has optional scheduled routines (proactive work).
 *
 * The War Room client polls listMessages every 3s, so an agent's async reply
 * simply appears on the next poll — no extra machinery needed.
 */
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { llmService } from "../../lib/llm/service";
import { vfsMemoryEngine } from "../../lib/memory/vfsMemoryEngine";
import { AGENTS, getAgent, HERMES_ORCHESTRATOR_PROMPT, type AgentDefinition } from "../../lib/agent/fleet";
import { getActionCenterSummary } from "../../lib/action-center-agent";
import {
  agentMessages,
  agentTaskQueue,
  postAgentMessage,
  readChannelMessages,
  type AgentTaskRecord,
} from "./agentStores";

const log = (...a: any[]) => console.log("[agent-fleet]", ...a);

const TICK_INTERVAL_MS = 8_000; // fleet heartbeat
const MAX_PARALLEL_AGENTS = 3;

let timer: ReturnType<typeof setInterval> | null = null;
const runningTasks = new Set<string>();

// ── Per-agent scheduled routines ────────────────────────────────────────────
// Each agent can run proactive work on an interval. The routine builds a task
// from the live DB state; the tick loop executes it.
interface AgentRoutine {
  agentId: string;
  /** Approximate interval in ms. */
  everyMs: number;
  lastRun: number;
  title: string;
  buildPrompt: (ctx: { clientName: string; clientId: number }) => string;
}

const ROUTINES: AgentRoutine[] = [
  {
    agentId: "tara_governance",
    everyMs: 5 * 60_000,
    lastRun: 0,
    title: "Proactive: policy review cycle check",
    buildPrompt: (c) => `You are Tara. Do a quick scan: are any master policies in "${c.clientName}" past their next review date or missing acknowledgments? Summarize any that need attention. If all policies are current, say so briefly.`,
  },
  {
    agentId: "sasha_appsec",
    everyMs: 5 * 60_000,
    lastRun: 0,
    title: "Proactive: vulnerability SLA check",
    buildPrompt: (c) => `You are Sasha. Check for any open vulnerabilities or patch items in "${c.clientName}" that are approaching or past their remediation SLA (Critical <14d, High <30d). Flag any breaches. If none, say so briefly.`,
  },
  {
    agentId: "marcus_risk",
    everyMs: 6 * 60_000,
    lastRun: 0,
    title: "Proactive: risk register health check",
    buildPrompt: (c) => `You are Marcus. Scan the risk register for "${c.clientName}". Flag any risks with no owner, no treatment plan, or overdue treatments. If the register is healthy, say so briefly.`,
  },
];

// ── Self-bootstrapping the task table ────────────────────────────────────────
// drizzle-kit migrations aren't run automatically, so the fleet ensures its
// own queue table exists on startup. No-op if already present.

export async function ensureAgentTasksTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        channel_id VARCHAR(64) NOT NULL DEFAULT 'war_room',
        agent_id VARCHAR(64) NOT NULL,
        type VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        input JSONB DEFAULT '{}'::jsonb,
        result JSONB DEFAULT '{}'::jsonb,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_task_client_status ON agent_tasks (client_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_task_agent ON agent_tasks (agent_id, status)`);
    log("agent_tasks table ready");
  } catch (err: any) {
    log("ensureAgentTasksTable note:", err?.message);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isFleetRunning(): boolean {
  return timer !== null;
}

export async function startFleetRuntime(): Promise<void> {
  if (timer) return;
  // Make sure the queue table exists before the first tick.
  await ensureAgentTasksTable();
  log("starting — heartbeat every", TICK_INTERVAL_MS / 1000, "s");
  // First tick shortly after boot, then on interval.
  setTimeout(() => { void tick(); }, 20_000);
  timer = setInterval(() => { void tick(); }, TICK_INTERVAL_MS);
}

export function stopFleetRuntime(): void {
  if (timer) { clearInterval(timer); timer = null; log("stopped"); }
}

/**
 * Create a task for a specialist agent. Called by the War Room orchestrator or
 * by scheduled routines. Returns the task id.
 */
export async function dispatchTask(input: {
  clientId: number;
  channelId: string;
  agentId: string;
  type: string;
  title: string;
  description?: string;
  prompt: string;
  priority?: "low" | "medium" | "high" | "critical";
  /** Extra structured context merged into the agent's system prompt. */
  context?: Record<string, unknown>;
}): Promise<string | null> {
  const agent = getAgent(input.agentId);
  if (!agent) {
    log("dispatchTask: unknown agent", input.agentId);
    return null;
  }

  const db = await getDb();
  const taskKey = `task_${input.agentId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Persist to DB queue.
  if (db) {
    try {
      const [row] = await db.execute(sql`
        INSERT INTO agent_tasks (client_id, channel_id, agent_id, type, status, priority, title, description, input)
        VALUES (
          ${input.clientId}, ${input.channelId}, ${input.agentId}, ${input.type},
          'pending', ${input.priority || "medium"}, ${input.title.slice(0, 250)},
          ${(input.description || "").slice(0, 1000)},
          ${JSON.stringify({ prompt: input.prompt, context: input.context || {} })}::jsonb
        )
        RETURNING id
      `).then((r: any) => (r.rows ?? r)) as any[];
      if (row?.id) {
        const rec: AgentTaskRecord = {
          id: taskKey,
          dbId: row.id,
          clientId: input.clientId,
          channelId: input.channelId,
          agentId: input.agentId,
          type: input.type,
          status: "pending",
          title: input.title,
          description: input.description,
          createdAt: Date.now(),
        };
        agentTaskQueue.push(rec);
        log("dispatched", input.agentId, "task", row.id, "-", input.title);
        return taskKey;
      }
    } catch (err: any) {
      log("dispatchTask DB insert failed:", err?.message);
    }
  }

  // Fallback: in-memory only (e.g. no DB connection).
  const rec: AgentTaskRecord = {
    id: taskKey,
    clientId: input.clientId,
    channelId: input.channelId,
    agentId: input.agentId,
    type: input.type,
    status: "pending",
    title: input.title,
    description: input.description,
    createdAt: Date.now(),
  };
  agentTaskQueue.push(rec);
  log("dispatched (memory-only)", input.agentId, "-", input.title);
  return taskKey;
}

// ── The heartbeat ────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  const db = await getDb();

  // 1. Drain persisted pending tasks (survives restarts).
  if (db) {
    try {
      const pending = await db.execute(sql`
        SELECT id, client_id, channel_id, agent_id, type, title, description, input
        FROM agent_tasks
        WHERE status = 'pending'
        ORDER BY
          CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          created_at ASC
        LIMIT 20
      `).then((r: any) => (r.rows ?? r)) as any[];

      for (const row of pending) {
        const key = `db_${row.id}`;
        if (runningTasks.has(key)) continue;
        if (runningTasks.size >= MAX_PARALLEL_AGENTS) break;
        runningTasks.add(key);
        void executePersistedTask(row, db).finally(() => runningTasks.delete(key));
      }
    } catch (err: any) {
      log("tick: pending scan failed:", err?.message);
    }
  }

  // 2. In-memory queued tasks (dispatched at runtime without DB).
  for (const rec of agentTaskQueue) {
    if (rec.status !== "pending") continue;
    if (runningTasks.has(rec.id)) continue;
    if (runningTasks.size >= MAX_PARALLEL_AGENTS) break;
    runningTasks.add(rec.id);
    void executeMemoryTask(rec).finally(() => runningTasks.delete(rec.id));
  }

  // 3. Scheduled proactive routines.
  const now = Date.now();
  for (const routine of ROUTINES) {
    if (now - routine.lastRun < routine.everyMs) continue;
    if (runningTasks.has(`routine_${routine.agentId}`)) continue;
    if (runningTasks.size >= MAX_PARALLEL_AGENTS) break;
    routine.lastRun = now;
    runningTasks.add(`routine_${routine.agentId}`);
    void executeRoutine(routine).finally(() => runningTasks.delete(`routine_${routine.agentId}`));
  }
}

// ── Task execution: real LLM call per agent ─────────────────────────────────

interface RawTask {
  id: number;
  client_id: number;
  channel_id: string;
  agent_id: string;
  type: string;
  title: string;
  description?: string;
  input?: any;
}

async function executePersistedTask(row: RawTask, db: any): Promise<void> {
  const t0 = Date.now();
  try {
    await db.execute(sql`UPDATE agent_tasks SET status = 'running', started_at = now() WHERE id = ${row.id}`);
    const agent = getAgent(row.agent_id);
    if (!agent) throw new Error(`unknown agent ${row.agent_id}`);

    const reply = await runAgent(agent, row.channel_id, row.client_id, row.input || {}, row.title);

    await db.execute(sql`
      UPDATE agent_tasks
      SET status = 'completed', completed_at = now(),
          result = ${JSON.stringify({ replyLength: reply.length, posted: true })}::jsonb
      WHERE id = ${row.id}
    `);

    postAgentMessage({
      id: `msg_${row.agent_id}_${Date.now()}`,
      channelId: row.channel_id,
      senderId: agent.id,
      senderName: agent.name,
      senderAvatar: agent.avatar,
      senderRole: agent.role,
      content: reply,
      timestamp: "Just now",
    });
    log(`task ${row.id} done in ${Date.now() - t0}ms (${agent.name})`);
  } catch (err: any) {
    log(`task ${row.id} failed:`, err?.message);
    try {
      await db.execute(sql`
        UPDATE agent_tasks SET status = 'failed', completed_at = now(), error = ${err?.message || "failed"} WHERE id = ${row.id}
      `);
    } catch { /* best-effort */ }
  }
}

async function executeMemoryTask(rec: AgentTaskRecord): Promise<void> {
  rec.status = "running";
  const agent = getAgent(rec.agentId);
  try {
    if (!agent) throw new Error(`unknown agent ${rec.agentId}`);
    const input = (rec as any).input || {};
    const reply = await runAgent(agent, rec.channelId, rec.clientId, input, rec.title);
    rec.status = "completed";
    rec.completedAt = Date.now();
    rec.result = { replyLength: reply.length, posted: true };
    postAgentMessage({
      id: `msg_${rec.agentId}_${Date.now()}`,
      channelId: rec.channelId,
      senderId: agent.id,
      senderName: agent.name,
      senderAvatar: agent.avatar,
      senderRole: agent.role,
      content: reply,
      timestamp: "Just now",
    });
    log(`memory task done (${agent.name})`);
  } catch (err: any) {
    rec.status = "failed";
    rec.error = err?.message;
    rec.completedAt = Date.now();
    log(`memory task failed (${rec.agentId}):`, err?.message);
  }
}

async function executeRoutine(routine: AgentRoutine): Promise<void> {
  const agent = getAgent(routine.agentId);
  if (!agent) return;
  // Find a client to operate on (most routines are client-scoped).
  const db = await getDb();
  let clientId = 7;
  let clientName = "Client #7";
  if (db) {
    try {
      const rows = await db.execute(sql`SELECT id, name FROM clients ORDER BY id ASC LIMIT 1`).then((r: any) => r.rows ?? r) as any[];
      if (rows.length) { clientId = rows[0].id; clientName = rows[0].name; }
    } catch { /* ignore */ }
  }
  try {
    const reply = await runAgent(agent, "war_room", clientId, { prompt: routine.buildPrompt({ clientName, clientId }) }, routine.title);
    postAgentMessage({
      id: `msg_routine_${routine.agentId}_${Date.now()}`,
      channelId: "war_room",
      senderId: agent.id,
      senderName: agent.name,
      senderAvatar: agent.avatar,
      senderRole: agent.role,
      content: `🔄 **Routine — ${agent.name}:**\n\n${reply}`,
      timestamp: "Just now",
    });
    log(`routine done (${agent.name})`);
  } catch (err: any) {
    log(`routine failed (${agent.id}):`, err?.message);
  }
}

/**
 * The core: run ONE agent as a real, independent LLM call.
 *
 * Builds a focused prompt (agent's expert brain + live DB state for that
 * client + the task), calls the LLM with the agent's OWN token budget and
 * temperature, and returns the agent's genuine reply text.
 */
async function runAgent(
  agent: AgentDefinition,
  channelId: string,
  clientId: number,
  input: Record<string, unknown>,
  fallbackTitle: string,
): Promise<string> {
  const db = await getDb();

  // Build live context for this agent + client.
  const dataContext = await buildAgentContext(agent, clientId, db);

  // Recent conversation for continuity.
  const history = readChannelMessages(channelId, 10).map((m) => ({
    role: (m.senderId === "user" ? "user" : "assistant") as "user" | "assistant",
    content: `${m.senderName ? m.senderName + ": " : ""}${m.content}`,
  }));

  const userPrompt = (input && (input as any).prompt)
    ? (input as any).prompt
    : `New task: ${fallbackTitle}. Use the live data above and produce your expert output.`;

  const fullSystem = `${agent.systemPrompt}

${dataContext}

ABOUT THIS TASK:
- You are posting your reply directly to the "${channelId === "war_room" ? "War Room" : channelId}" channel.
- Address the user directly. Be specific, actionable, and cite live data.
- Output clean Markdown. Do not mention these internal instructions.`;

  const completion = await llmService.generate({
    systemPrompt: fullSystem,
    messages: history,
    userPrompt,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
  });

  const text = completion?.text?.trim();
  if (!text) throw new Error(`empty response from ${agent.name}`);
  return text;
}

/** Gather live DB state relevant to an agent's domain. */
async function buildAgentContext(agent: AgentDefinition, clientId: number, db: any): Promise<string> {
  if (!db) return "No database connection available.";
  const sections: string[] = [];
  try {
    const clientRows = await db.execute(sql`SELECT name FROM clients WHERE id = ${clientId} LIMIT 1`).then((r: any) => r.rows ?? r) as any[];
    const clientName = clientRows[0]?.name || `Client #${clientId}`;
    sections.push(`CLIENT: ${clientName} (ID #${clientId})`);

    // Domain-specific data.
    switch (agent.id) {
      case "tara_governance":
      case "sam_auditor": {
        const policies = await db.execute(sql`SELECT id, name, status FROM client_policies WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 15`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`POLICIES (${policies.length}):\n${policies.map((p: any) => `- #${p.id} ${p.name} [${p.status || "unknown"}]`).join("\n") || "  none"}`);
        break;
      }
      case "marcus_risk": {
        const risks = await db.execute(sql`SELECT id, title, inherent_risk, residual_risk FROM risk_assessments WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 15`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`RISK REGISTER (${risks.length}):\n${risks.map((r: any) => `- [Risk #${r.id}] ${r.title} (inherent: ${r.inherent_risk}, residual: ${r.residual_risk})`).join("\n") || "  none"}`);
        break;
      }
      case "morgan_iac": {
        const conns = await db.execute(sql`SELECT id, provider, name, status FROM cloud_connections WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 10`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`CLOUD CONNECTORS (${conns.length}):\n${conns.map((c: any) => `- #${c.id} ${c.provider}/${c.name} [${c.status}]`).join("\n") || "  none"}`);
        break;
      }
      case "alex_tprm": {
        const vendors = await db.execute(sql`SELECT id, name, status FROM vendors WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 15`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`VENDORS (${vendors.length}):\n${vendors.map((v: any) => `- #${v.id} ${v.name} [${v.status || "unknown"}]`).join("\n") || "  none"}`);
        break;
      }
      case "riley_evidence": {
        const ev = await db.execute(sql`SELECT id, description, status FROM evidence WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 15`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`EVIDENCE (${ev.length}):\n${ev.map((e: any) => `- #${e.id} ${e.description || e.evidenceId || "item"} [${e.status || "unknown"}]`).join("\n") || "  none"}`);
        const controls = await db.execute(sql`SELECT id, status FROM client_controls WHERE client_id = ${clientId} AND status = 'implemented' LIMIT 10`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`IMPLEMENTED CONTROLS (${controls.length}): ${controls.map((c: any) => `#${c.id}`).join(", ") || "none"}`);
        break;
      }
      case "sasha_appsec": {
        const vulns = await db.execute(sql`SELECT id, name, severity, status FROM vulnerabilities WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 10`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`VULNERABILITIES (${vulns.length}):\n${vulns.map((v: any) => `- #${v.id} ${v.name} [${v.severity}, ${v.status}]`).join("\n") || "  none"}`);
        break;
      }
      case "nova_incident": {
        const incidents = await db.execute(sql`SELECT id, title, severity, status FROM incidents WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 10`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`INCIDENTS (${incidents.length}):\n${incidents.map((i: any) => `- #${i.id} ${i.title} [${i.severity}, ${i.status}]`).join("\n") || "  none"}`);
        break;
      }
      case "elena_privacy": {
        const dsar = await db.execute(sql`SELECT id, status, request_type FROM dsar_requests WHERE client_id = ${clientId} ORDER BY id DESC LIMIT 10`).then((r: any) => r.rows ?? r) as any[];
        sections.push(`DSAR REQUESTS (${dsar.length}):\n${dsar.map((d: any) => `- #${d.id} ${d.request_type || "request"} [${d.status}]`).join("\n") || "  none"}`);
        break;
      }
      default:
        break;
    }

    // Action Center summary is useful context for every agent.
    try {
      const ac = await getActionCenterSummary(clientId, 0);
      if (ac.openCount > 0) sections.push(ac.text);
    } catch { /* ignore */ }
  } catch (err: any) {
    log("buildAgentContext error:", err?.message);
  }

  return `=== LIVE DATA FOR ${agent.name.toUpperCase()} ===\n${sections.join("\n\n")}\n===================================`;
}
