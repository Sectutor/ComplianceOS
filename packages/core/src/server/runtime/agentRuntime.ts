/**
 * Agent Runtime — the heartbeat.
 * Wakes on a tick, finds due autopilot configs, runs enabled sentinel bots,
 * routes observations through the action pipeline, records runs, and
 * executes Phase 2 escalation + digest sweeps.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db";

const log = (...a: any[]) => console.log("[agent-runtime]", ...a);

const TICK_INTERVAL_MS = 60_000; // 1 minute
const MAX_PARALLEL_CLIENTS = 2;

interface AutopilotConfig {
  id: number;
  clientId: number;
  enabled: boolean;
  schedule: string;
  modules: Record<string, boolean> | null;
  approvalMode: string;
  lastRunAt: Date | null;
}

const SCHEDULE_MIN_HOURS: Record<string, number> = {
  hourly: 1,
  daily: 24,
  weekly: 24 * 7,
};

let timer: ReturnType<typeof setInterval> | null = null;
const runningClients = new Set<number>();
let bootCatchupDone = false;

/** Import bots lazily to avoid circulars at module load. */
async function getBots() {
  const [{ complianceSentinel }, { slaHound }, roster] = await Promise.all([
    import("./bots/complianceSentinel"),
    import("./bots/slaHound"),
    import("./bots/roster"),
  ]);
  return [complianceSentinel, slaHound, roster.riskWatchdog, roster.vulnerabilitySentinel, roster.policySteward, roster.bcGuardian, roster.anomalySpotter];
}

export function startAgentRuntime(): void {
  if (timer) return;
  log("[agent-runtime] starting — tick every 60s");
  // initial tick after short delay so server finishes booting
  setTimeout(() => { void tick(true); }, 15_000);
  timer = setInterval(() => { void tick(false); }, TICK_INTERVAL_MS);
}

export function stopAgentRuntime(): void {
  if (timer) { clearInterval(timer); timer = null; log("[agent-runtime] stopped"); }
}

export function isRuntimeRunning(): boolean {
  return timer !== null;
}

/** Is this config due for a run? */
function isDue(cfg: AutopilotConfig, now = Date.now()): boolean {
  if (!cfg.enabled) return false;
  if (cfg.schedule === "manual") return false;
  const minH = SCHEDULE_MIN_HOURS[cfg.schedule] ?? 24;
  if (!cfg.lastRunAt) return true;
  return now - cfg.lastRunAt.getTime() >= minH * 3600_000;
}

/** Main tick: find due configs and run them. */
async function tick(isBoot: boolean): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const configs = (await db.execute(sql`
      SELECT id, client_id, enabled, schedule, modules, approval_mode, last_run_at
      FROM autopilot_configs
      WHERE enabled = true AND schedule <> 'manual'`).then((r: any) => r.rows ?? r)) as any[];

    let dueCount = 0;
    for (const raw of configs) {
      const cfg: AutopilotConfig = {
        id: raw.id,
        clientId: raw.client_id,
        enabled: raw.enabled,
        schedule: raw.schedule,
        modules: typeof raw.modules === "string" ? JSON.parse(raw.modules || "{}") : (raw.modules || {}),
        approvalMode: raw.approval_mode || "manual",
        lastRunAt: raw.last_run_at ? new Date(raw.last_run_at) : null,
      };
      if (!isDue(cfg)) continue;
      dueCount++;
      if (runningClients.has(cfg.clientId)) continue; // previous run still active
      if (runningClients.size >= MAX_PARALLEL_CLIENTS) break;
      runningClients.add(cfg.clientId);
      void runConfigForClient(cfg)
        .catch(e => console.error(`[agent-runtime] run failed for client ${cfg.clientId}:`, e.message))
        .finally(() => runningClients.delete(cfg.clientId));
    }

    // Phase 2 sweeps run hourly regardless of per-client schedules
    if (!isBoot && new Date().getMinutes() === 0) {
      await runEscalationAndDigestSweep(configs.map(c => c.client_id));
    }

    // Boot catch-up marker
    if (isBoot && !bootCatchupDone) {
      bootCatchupDone = true;
      log(`[agent-runtime] boot catch-up: ${dueCount} config(s) were due`);
    }
  } catch (e: any) {
    console.error(`[agent-runtime] tick error: ${e.message}`);
  }
}

/** Execute all enabled bot modules for one client. */
export async function runConfigForClient(cfg: AutopilotConfig): Promise<{ findings: number; executed: number; proposed: number }> {
  const db = await getDb();
  if (!db) return { findings: 0, executed: 0, proposed: 0 };
  const startedAt = new Date();
  runningClients.add(cfg.clientId);

  try {
    // claim the run
    const [run] = await db.execute(sql`
      INSERT INTO autopilot_runs (client_id, started_at, status, modules_executed)
      VALUES (${cfg.clientId}, now(), 'running', ${JSON.stringify(cfg.modules)}::jsonb)
      RETURNING id`).then((r: any) => r.rows ?? r);
    const runId = run.id;

    const bots = await getBots();
    let findings = 0, executed = 0, proposed = 0;
    const moduleSummary: Record<string, { findings: number; error?: string }> = {};

    for (const bot of bots) {
      // respect per-module enable flags (default true when absent)
      if (cfg.modules && cfg.modules[bot.moduleKey] === false) continue;
      try {
        const observations = await bot.observe({ clientId: cfg.clientId, now: new Date() });
        moduleSummary[bot.moduleKey] = { findings: observations.length };
        for (const obs of observations) {
          findings++;
          const { processObservation } = await import("./actionPipeline");
          const res = await processObservation(cfg.clientId, runId, bot.id, bot.name, obs, cfg.approvalMode);
          if (res.outcome === "executed") executed++;
          else if (res.outcome === "pending_review") proposed++;
        }
      } catch (e: any) {
        console.warn(`[agent-runtime] bot ${bot.id} observe failed for client ${cfg.clientId}: ${e.message}`);
        moduleSummary[bot.moduleKey] = { findings: -1, error: e.message.slice(0, 300) }; // error marker
      }
    }

    // close the run
    await db.execute(sql`
      UPDATE autopilot_runs
      SET completed_at = now(), status = 'completed',
          results = ${JSON.stringify(moduleSummary)}::jsonb,
          duration = ${Date.now() - startedAt.getTime()}
      WHERE id = ${runId}`);

    // update last_run_at
    await db.execute(sql`
      UPDATE autopilot_configs SET last_run_at = now(), updated_at = now() WHERE id = ${cfg.id}`);

    log(`[agent-runtime] client ${cfg.clientId}: ${findings} findings (${executed} executed, ${proposed} pending review)`);
    return { findings, executed, proposed };
  } catch (e: any) {
    await db.execute(sql`
      UPDATE autopilot_runs SET completed_at = now(), status = 'failed', error_message = ${e.message}
      WHERE client_id = ${cfg.clientId} AND status = 'running'`).catch(() => {});
    throw e;
  } finally {
    runningClients.delete(cfg.clientId);
  }
}

// ------------------------------------------------------------------
// Phase 2: escalation sweep + daily digest
// ------------------------------------------------------------------

async function runEscalationAndDigestSweep(clientIds: number[]): Promise<void> {
  const { runEscalationSweep } = await import("./actionPipeline");
  for (const clientId of clientIds) {
    const esc = await runEscalationSweep(clientId, 48);
    if (esc > 0) log(`[agent-runtime] escalated ${esc} stale action(s) for client ${clientId}`);
  }
  await maybeSendDailyDigest(clientIds);
}

/**
 * Daily digest: one email per client summarizing the last 24h of bot activity.
 * Respects notification_settings.daily_digest_enabled.
 */
export async function maybeSendDailyDigest(clientIds: number[], force = false): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const clientId of clientIds) {
    try {
      const settingsRows = await db.execute(sql`
        SELECT daily_digest_enabled, email_enabled FROM notification_settings
        WHERE client_id = ${clientId} LIMIT 1`).then((r: any) => r.rows ?? r);
      const s = settingsRows[0];
      if (s && s.daily_digest_enabled === false) continue;
      if (!force && new Date().getHours() !== 8) continue; // digest window 08:00

      const rows = await db.execute(sql`
        SELECT type, title, priority, created_at FROM autopilot_actions
        WHERE client_id = ${clientId} AND created_at > now() - interval '24 hours'
        ORDER BY priority DESC, created_at DESC LIMIT 50`).then((r: any) => r.rows ?? r);

      if (rows.length === 0) continue;

      const critical = rows.filter((r: any) => r.priority === "critical").length;
      const high = rows.filter((r: any) => r.priority === "high").length;
      const lines = rows.slice(0, 10).map((r: any) => `• [${r.priority}] ${r.title}`).join("\n");

      const { notifyOwner } = await import("./actionPipeline");
      await notifyOwner(
        clientId,
        `Daily GRC digest: ${rows.length} findings (${critical} critical, ${high} high)`,
        `Last 24 hours of sentinel activity:\n\n${lines}${rows.length > 10 ? `\n…and ${rows.length - 10} more` : ""}`,
        critical > 0 ? "critical" : "info",
        "/clients/all/governance/workbench"
      );
      log(`[agent-runtime] digest sent for client ${clientId} (${rows.length} findings)`);
    } catch (e: any) {
      console.warn(`[agent-runtime] digest failed for client ${clientId}: ${e.message}`);
    }
  }
}
