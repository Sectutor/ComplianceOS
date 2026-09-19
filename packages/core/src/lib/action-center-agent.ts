/**
 * Action Center <-> Agent bridge.
 *
 * Two responsibilities:
 *   1. READ path  — gather Action Center findings into a compact, LLM-ready
 *      summary that gets injected into the War Room / direct-bot system prompts
 *      so agents can answer "what's in the Action Center?".
 *   2. ACT path   — detect a user's "fix / resolve / do it" command, fetch the
 *      underlying entity, ask the LLM for a concrete patch, and stage a new
 *      autopilot_actions row (status "pending") holding that patch. The human
 *      approves it in the Action Center UI; reviewSentinelAction then applies
 *      the patch to the real entity.
 */
import { getDb } from '../db';
import * as schema from '../schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { getActionItems, type ActionItem } from './action-center';

// ── READ PATH ────────────────────────────────────────────────────────────────

interface OpenSentinelAction {
  id: number;
  type: string;
  title: string;
  priority: string;
  status: string;
  entityType: string | null;
  entityId: number | null;
  source: string;
}

export interface ActionCenterSummary {
  text: string;
  openCount: number;
  criticalCount: number;
  items: Array<{ id: string; title: string; priority: string; module: string; entityType: string; entityId?: number }>;
}

/**
 * Build a compact, single-paragraph-ish summary of everything currently open in
 * the Action Center (computed findings + sentinel bot actions). Safe to embed
 * directly in a system prompt.
 */
export async function getActionCenterSummary(clientId: number, userId: number): Promise<ActionCenterSummary> {
  const db = await getDb();
  const items: ActionCenterSummary['items'] = [];
  const sections: string[] = [];

  // A. Computed findings (expiring evidence, overdue controls, policy reviews…)
  try {
    const computed = await getActionItems(clientId, userId);
    if (computed.length > 0) {
      for (const c of computed) {
        items.push({ id: c.id, title: c.title, priority: c.priority, module: c.module, entityType: c.entityType, entityId: c.entityId });
      }
      const byModule: Record<string, ActionItem[]> = {};
      for (const c of computed) (byModule[c.module] ||= []).push(c);
      const lines = Object.entries(byModule).map(([mod, list]) => {
        const bullets = list.map(c => `   - [${c.priority.toUpperCase()}] ${c.title}${c.entityId ? ` (#${c.entityId})` : ''}`).join('\n');
        return `📂 **${mod}**\n${bullets}`;
      });
      sections.push(`📊 Action Center Findings (${computed.length} open):\n${lines.join('\n')}`);
    }
  } catch (err) {
    console.warn('[action-center-agent] computed findings fetch failed:', err);
  }

  // B. Open sentinel bot actions (autopilot_actions still pending review)
  if (db) {
    try {
      const openActions = await db.execute(sql`
        SELECT id, type, title, priority, status,
               metadata->>'botId' AS source,
               COALESCE(metadata->'targetEntity'->>'entityType', split_part(type, ':', 1)) AS "entityType",
               (metadata->'targetEntity'->>'entityId')::int AS "entityId"
        FROM autopilot_actions
        WHERE client_id = ${clientId} AND status IN ('pending', 'pending_review')
        ORDER BY
          CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT 20`).then((r: any) => r.rows ?? r) as any[];

      if (openActions.length > 0) {
        for (const a of openActions) {
          items.push({ id: `sentinel-${a.id}`, title: a.title, priority: a.priority, module: 'Sentinel', entityType: a.entityType || 'unknown', entityId: a.entityId ?? undefined });
        }
        const bullets = openActions.map(a =>
          `   - [${(a.priority || 'medium').toUpperCase()}] #${a.id} ${a.title}${a.entityId ? ` (#${a.entityId})` : ''} — _${a.source || a.type}_`
        ).join('\n');
        sections.push(`🤖 Open Sentinel Actions (${openActions.length} awaiting review):\n${bullets}`);
      }
    } catch (err) {
      console.warn('[action-center-agent] sentinel actions fetch failed:', err);
    }
  }

  const criticalCount = items.filter(i => i.priority === 'critical').length;
  const header = sections.length > 0
    ? `=== 🚨 ACTION CENTER STATE (Client #${clientId}) ===\n${sections.join('\n\n')}\n=======================================================`
    : `=== 🚨 ACTION CENTER STATE (Client #${clientId}) ===\nNo open Action Center findings or sentinel actions.\n=======================================================`;

  return { text: header, openCount: items.length, criticalCount, items };
}

// ── ACT PATH: intent detection ──────────────────────────────────────────────

export interface FixCommand {
  isFix: boolean;
  /** Explicit action id referenced, e.g. "#123" or "action 123". */
  explicitId?: number;
  /** "all" / "everything" — resolve open items in bulk. */
  all?: boolean;
}

const FIX_VERBS = /\b(fix|resolve|remediate|handle|address|close|do it|go ahead|apply|patch|implement|take care of|yes,?\s*(please|do it))\b/i;

/**
 * Detect whether the user is commanding the agent to act on something in the
 * Action Center (rather than just asking about it).
 */
export function detectFixIntent(input: string): FixCommand {
  const text = input.trim();
  if (!text) return { isFix: false };

  const fix: FixCommand = { isFix: false };

  // Explicit "#123" / "action 123" / "the 123 one"
  const idMatch = text.match(/(?:^|\s)#(\d+)\b/) || text.match(/\baction\s+(\d+)\b/i);
  if (idMatch) {
    fix.explicitId = Number(idMatch[1]);
  }

  const lower = text.toLowerCase();

  // Standalone affirmative to a prior proposal: "yes", "do it", "go ahead",
  // "apply that", "approved", short confirmation.
  const isAffirmative = /^(yes|yeah|yep|yup|sure|ok|okay|confirm|approved|do it|go ahead|proceed|send it|shoot)\b[!.?\s]*$/.test(lower);

  if (FIX_VERBS.test(text) || isAffirmative || fix.explicitId !== undefined) {
    fix.isFix = true;
  }
  if (/\b(all|every|everything|each one|the rest)\b/i.test(text)) {
    fix.all = true;
  }
  return fix;
}

// ── ACT PATH: target resolution ─────────────────────────────────────────────

/**
 * Resolve which action item(s) the user is targeting.
 *
 * Strategy:
 *   1. explicit #id  → find that sentinel action id directly.
 *   2. otherwise      → scan the conversation history for the most recently
 *                        mentioned action, else fall back to the most recent
 *                        critical/high open item.
 */
export async function resolveFixTarget(
  clientId: number,
  userId: number,
  command: FixCommand,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<Array<{ actionType: 'sentinel' | 'computed'; id: number | string; title: string; entityType: string; entityId?: number }>> {
  const db = await getDb();
  const targets: Array<{ actionType: 'sentinel' | 'computed'; id: number | string; title: string; entityType: string; entityId?: number }> = [];

  // 1. Explicit sentinel id
  if (command.explicitId !== undefined && db) {
    const rows = await db.execute(sql`
      SELECT id, title, metadata->'targetEntity'->>'entityType' AS "entityType",
             (metadata->'targetEntity'->>'entityId')::int AS "entityId"
      FROM autopilot_actions WHERE id = ${command.explicitId} AND client_id = ${clientId} LIMIT 1
    `).then((r: any) => r.rows ?? r) as any[];
    if (rows.length) {
      return [{ actionType: 'sentinel', id: rows[0].id, title: rows[0].title, entityType: rows[0].entityType || 'unknown', entityId: rows[0].entityId ?? undefined }];
    }
  }

  if (command.all) {
    const summary = await getActionCenterSummary(clientId, userId);
    return summary.items.map(i => ({ actionType: i.id.startsWith('sentinel-') ? 'sentinel' : 'computed', id: i.id.startsWith('sentinel-') ? Number(i.id.replace('sentinel-', '')) : i.id, title: i.title, entityType: i.entityType, entityId: i.entityId }));
  }

  // 2. Scan history for a recently mentioned #id or "risk #id" / "policy #id"
  for (let i = history.length - 1; i >= 0; i--) {
    const mentioned = [...history[i].content.matchAll(/(?:^|\s)#(\d+)\b|\b(?:risk|action|control|policy|vendor|evidence)\s*#?(\d+)\b/gi)];
    if (mentioned.length) {
      const id = Number(mentioned[mentioned.length - 1][1] || mentioned[mentioned.length - 1][2]);
      if (db && !command.all) {
        const rows = await db.execute(sql`
          SELECT id, title, metadata->'targetEntity'->>'entityType' AS "entityType",
                 (metadata->'targetEntity'->>'entityId')::int AS "entityId"
          FROM autopilot_actions WHERE id = ${id} AND client_id = ${clientId} LIMIT 1
        `).then((r: any) => r.rows ?? r) as any[];
        if (rows.length) {
          return [{ actionType: 'sentinel', id: rows[0].id, title: rows[0].title, entityType: rows[0].entityType || 'unknown', entityId: rows[0].entityId ?? undefined }];
        }
      }
    }
  }

  // 3. Fallback: most recent critical/high open sentinel action
  if (db) {
    const rows = await db.execute(sql`
      SELECT id, title, metadata->'targetEntity'->>'entityType' AS "entityType",
             (metadata->'targetEntity'->>'entityId')::int AS "entityId"
      FROM autopilot_actions
      WHERE client_id = ${clientId} AND status IN ('pending', 'pending_review')
      ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
      LIMIT 1
    `).then((r: any) => r.rows ?? r) as any[];
    if (rows.length) {
      return [{ actionType: 'sentinel', id: rows[0].id, title: rows[0].title, entityType: rows[0].entityType || 'unknown', entityId: rows[0].entityId ?? undefined }];
    }
  }

  return [];
}

// ── ACT PATH: fetch the live entity that a target points at ──────────────────

export interface EntityDetails {
  entityType: string;
  entityId?: number;
  title?: string;
  content?: string;
  status?: string;
  frameworks?: string[];
  [k: string]: unknown;
}

/** Load the real DB record behind a sentinel action (policy, risk, control…). */
export async function loadEntity(target: { actionType: string; id: number | string }): Promise<EntityDetails | null> {
  const db = await getDb();
  if (!db || target.actionType !== 'sentinel') return null;

  const rows = await db.execute(sql`
    SELECT id, type, title, description, priority, status, ai_rationale,
           metadata->'targetEntity'->>'entityType' AS "entityType",
           (metadata->'targetEntity'->>'entityId')::int AS "entityId",
           metadata->>'proposedAction' AS "proposedAction"
    FROM autopilot_actions WHERE id = ${Number(target.id)} LIMIT 1
  `).then((r: any) => r.rows ?? r) as any[];
  if (!rows.length) return null;
  const action = rows[0];
  const entityType = action.entityType || 'unknown';
  const entityId = action.entityId;

  const details: EntityDetails = { entityType, entityId, title: action.title };

  if (entityId && entityType !== 'unknown') {
    try {
      switch (entityType) {
        case 'policy': {
          const p = await db.select().from(schema.clientPolicies).where(eq(schema.clientPolicies.id, entityId)).limit(1);
          if (p.length) { details.title = p[0].name; details.content = p[0].content; details.status = p[0].status ?? undefined; }
          break;
        }
        case 'clientControl':
        case 'control': {
          const c = await db.select().from(schema.clientControls).where(eq(schema.clientControls.id, entityId)).limit(1);
          if (c.length) { details.status = c[0].status ?? undefined; }
          break;
        }
        case 'risk_scenario':
        case 'risk_assessment':
        case 'risk': {
          const r = await db.select().from(schema.riskAssessments).where(eq(schema.riskAssessments.id, entityId)).limit(1);
          if (r.length) {
            details.title = r[0].title;
            details.content = r[0].threatDescription || r[0].vulnerabilityDescription || undefined;
            details.status = r[0].inherentRisk ?? undefined;
            (details as any).residualRisk = r[0].residualRisk ?? undefined;
          }
          break;
        }
        case 'evidence': {
          const e = await db.select().from(schema.evidence).where(eq(schema.evidence.id, entityId)).limit(1);
          if (e.length) { details.title = e[0].description ?? e[0].evidenceId; details.status = e[0].status ?? undefined; }
          break;
        }
        case 'vendor':
        case 'vendor_assessment_request': {
          const v = await db.select().from(schema.vendors).where(eq(schema.vendors.id, entityId)).limit(1);
          if (v.length) details.title = v[0].name;
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.warn(`[action-center-agent] entity load failed for ${entityType}#${entityId}:`, err);
    }
  }
  return details;
}

// ── ACT PATH: apply an approved patch to the real entity ────────────────────

export interface PatchResult { success: boolean; applied: string; error?: string; }

/**
 * Apply an approved fix to the underlying entity. Called by reviewSentinelAction
 * when a pending action has metadata.proposedFix.
 */
export async function applyApprovedFix(clientId: number, actionId: number, fix: Record<string, unknown>): Promise<PatchResult> {
  const db = await getDb();
  if (!db) return { success: false, applied: '', error: 'no db' };

  const entityType = String(fix.entityType || '');
  const entityId = Number(fix.entityId);
  const set: Record<string, unknown> = {};
  if (fix.content !== undefined) set.content = fix.content;
  if (fix.status !== undefined) set.status = fix.status;
  if (fix.description !== undefined) set.description = fix.description;
  if (fix.residualRisk !== undefined) set.residualRisk = fix.residualRisk;

  if (!entityId && entityType !== 'bulk') {
    return { success: false, applied: '', error: 'no entityId' };
  }

  try {
    switch (entityType) {
      case 'policy': {
        if (!Object.keys(set).length) break;
        await db.update(schema.clientPolicies).set(set as any).where(eq(schema.clientPolicies.id, entityId));
        break;
      }
      case 'clientControl':
      case 'control': {
        if (set.status) {
          await db.update(schema.clientControls).set({ status: set.status } as any).where(eq(schema.clientControls.id, entityId));
        }
        break;
      }
      case 'risk_scenario':
      case 'risk_assessment':
      case 'risk': {
        const riskSet: Record<string, unknown> = {};
        if (set.residualRisk !== undefined) riskSet.residualRisk = set.residualRisk;
        if (set.status !== undefined) riskSet.inherentRisk = set.status;
        if (!Object.keys(riskSet).length) break;
        await db.update(schema.riskAssessments).set(riskSet as any).where(eq(schema.riskAssessments.id, entityId));
        break;
      }
      case 'evidence': {
        if (!Object.keys(set).length) break;
        await db.update(schema.evidence).set(set as any).where(eq(schema.evidence.id, entityId));
        break;
      }
      default:
        return { success: false, applied: '', error: `unsupported entity type: ${entityType}` };
    }
    return { success: true, applied: `${entityType}#${entityId}` };
  } catch (err: any) {
    return { success: false, applied: '', error: err?.message || 'apply failed' };
  }
}

/** Convenience: fetch the stored proposedFix from a sentinel action's metadata. */
export async function getProposedFix(actionId: number): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.execute(sql`
    SELECT metadata->>'proposedFix' AS fix FROM autopilot_actions WHERE id = ${actionId} LIMIT 1
  `).then((r: any) => r.rows ?? r) as any[];
  if (!rows.length || !rows[0].fix) return null;
  try { return typeof rows[0].fix === 'string' ? JSON.parse(rows[0].fix) : rows[0].fix; } catch { return null; }
}
