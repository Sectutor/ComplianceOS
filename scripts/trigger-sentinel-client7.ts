import dotenv from 'dotenv';
dotenv.config();

import { runConfigForClient } from '../packages/core/src/server/runtime/agentRuntime';
import { getDb } from '../packages/core/src/db';
import { sql } from 'drizzle-orm';

async function main() {
  const targetClientId = parseInt(process.argv[2] || '7', 10);
  console.log(`[sentinel-runner] Triggering full sentinel scan for Client ${targetClientId}...`);
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // Ensure autopilot config row
  await db.execute(sql`
    INSERT INTO autopilot_configs (client_id, enabled, schedule, modules, approval_mode)
    VALUES (${targetClientId}, true, 'daily',
      '{"complianceSentinel":true,"slaHound":true,"riskWatchdog":true,"vulnerabilitySentinel":true,"policySteward":true,"bcGuardian":true,"anomalySpotter":false}'::jsonb,
      'manual')
    ON CONFLICT (client_id) DO UPDATE
    SET enabled = true, approval_mode = 'manual'
  `);

  const res = await runConfigForClient({
    id: targetClientId,
    clientId: targetClientId,
    enabled: true,
    schedule: 'daily',
    modules: {
      complianceSentinel: true,
      slaHound: true,
      riskWatchdog: true,
      vulnerabilitySentinel: true,
      policySteward: true,
      bcGuardian: true,
      anomalySpotter: false,
    },
    approvalMode: 'manual',
    lastRunAt: null,
  });

  console.log('[sentinel-runner] Scan completed successfully:', res);

  // Fetch created autopilot actions
  const actions = await db.execute(sql`
    SELECT id, type, title, priority, status, metadata->>'botId' as bot_id
    FROM autopilot_actions
    WHERE client_id = ${targetClientId}
    ORDER BY id ASC
  `).then((r: any) => r.rows ?? r);

  console.log(`\n[sentinel-runner] Found ${actions.length} generated actions in Action Center:`);
  for (const act of actions) {
    console.log(`- [#${act.id}] [${act.priority.toUpperCase()}] [${act.bot_id || act.type}]: ${act.title}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[sentinel-runner] Error:', err);
  process.exit(1);
});
