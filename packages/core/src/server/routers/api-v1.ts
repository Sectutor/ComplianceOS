import { Router, Request, Response } from 'express';
import { getDb, onboardClient } from '../../db';
import { sql, eq } from 'drizzle-orm';
import {
  controls,
  evidence,
  riskScenarios,
  riskTreatments,
  clients,
  assets,
  vendors,
  clientPolicies,
  auditLogs,
  tasks,
  policyAssignments,
  evidenceRequests,
  evidenceFiles,
  riskAppetite,
  riskAssessments,
  dsarRequests,
  dataProtImpactAssessments,
  auditFindings,
  employees,
  employeeAcknowledgments,
} from '../../schema';

// ── API Key Auth Middleware ──────────────────────────────────────────────────

const API_KEY = process.env.COMPLIANCE_API_KEY || '';

const apiKeyMiddleware = (req: Request, res: Response, next: () => void) => {
  if (!API_KEY) return next(); // dev mode — no key configured, open access
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key', code: 'UNAUTHORIZED' });
  }
  next();
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a human-friendly duration string like "7d" to an ISO interval. */
function parseDurationToInterval(duration: string): string {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return '7 days';
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd': return `${value} days`;
    case 'h': return `${value} hours`;
    case 'm': return `${value} minutes`;
    case 's': return `${value} seconds`;
    default: return '7 days';
  }
}

// ── Router ──────────────────────────────────────────────────────────────────

const apiV1Router = Router();

// Apply API key auth to every route in this router
apiV1Router.use(apiKeyMiddleware);

// ── GET /api/v1/health ──────────────────────────────────────────────────────
apiV1Router.get('/health', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const start = Date.now();
    await db.execute(sql`SELECT 1 AS ok`);
    const dbLatency = Date.now() - start;

    res.json({
      status: 'ok',
      database: {
        connected: true,
        latencyMs: dbLatency,
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      authMode: API_KEY ? 'api-key' : 'open-dev',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      database: { connected: false, error: err.message },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      authMode: API_KEY ? 'api-key' : 'open-dev',
    });
  }
});

// ── GET /api/v1/controls ────────────────────────────────────────────────────
apiV1Router.get('/controls', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const framework = req.query.framework as string | undefined;

    let rows;
    if (framework) {
      rows = await db
        .select()
        .from(controls)
        .where(eq(controls.framework, framework))
        .orderBy(controls.controlId);
    } else {
      rows = await db
        .select()
        .from(controls)
        .orderBy(controls.framework, controls.controlId);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/controls/:id ────────────────────────────────────────────────
apiV1Router.get('/controls/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid control id', code: 'BAD_REQUEST' });
    }

    const [control] = await db
      .select()
      .from(controls)
      .where(eq(controls.id, id))
      .limit(1);

    if (!control) {
      return res.status(404).json({ error: 'Control not found', code: 'NOT_FOUND' });
    }

    // Count evidence linked through clientControls
    const evRows = await db.execute(
      sql`
        SELECT COUNT(*)::int AS count
        FROM evidence e
        JOIN client_controls cc ON cc.id = e.client_control_id
        WHERE cc.control_id = ${id}
      `
    );
    const evCount = ((Array.isArray(evRows) ? (evRows as any[])[0] : undefined) as { count: number } | undefined);

    res.json({
      ...control,
      evidenceCount: evCount?.count ?? 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/evidence ───────────────────────────────────────────────────
apiV1Router.post('/evidence', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      clientId,
      clientControlId,
      evidenceId,
      description,
      framework,
      type,
      status,
      dueDate,
      fileCount,
    } = req.body;

    if (!clientId || !clientControlId || !evidenceId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, clientControlId, evidenceId',
        code: 'BAD_REQUEST',
      });
    }

    const [created] = await db
      .insert(evidence)
      .values({
        clientId,
        clientControlId,
        evidenceId,
        description: description ?? null,
        framework: framework ?? null,
        type: type ?? null,
        status: status ?? 'pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        fileCount: fileCount ?? 0,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/evidence ────────────────────────────────────────────────────
apiV1Router.get('/evidence', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const controlId = req.query.control_id as string | undefined;
    const expiringWithin = req.query.expiring_within as string | undefined;

    // Build query with raw SQL for flexibility
    let query = sql`
      SELECT e.*,
             cc.control_id,
             c.control_id AS control_code,
             c.name AS control_name
      FROM evidence e
      LEFT JOIN client_controls cc ON cc.id = e.client_control_id
      LEFT JOIN controls c ON c.id = cc.control_id
      WHERE 1=1
    `;

    if (controlId) {
      const cid = parseInt(controlId, 10);
      if (!isNaN(cid)) {
        query = sql`${query} AND cc.control_id = ${cid}`;
      }
    }

    if (expiringWithin) {
      const interval = parseDurationToInterval(expiringWithin);
      query = sql`
        ${query}
        AND e.expiration_date IS NOT NULL
        AND e.expiration_date <= NOW() + ${sql.raw(`INTERVAL '${interval}'`)}
        AND e.expiration_date > NOW()
      `;
    }

    query = sql`${query} ORDER BY e.created_at DESC`;

    const rows = await db.execute(query);

    res.json({ data: rows, total: Array.isArray(rows) ? rows.length : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/risks ───────────────────────────────────────────────────────
apiV1Router.get('/risks', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(riskScenarios)
      .orderBy(riskScenarios.createdAt);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/risks/:id ────────────────────────────────────────────────────
apiV1Router.get('/risks/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid risk id', code: 'BAD_REQUEST' });
    }
    const [row] = await db
      .select()
      .from(riskScenarios)
      .where(eq(riskScenarios.id, id))
      .limit(1);
    if (!row) {
      return res.status(404).json({ error: 'Risk not found', code: 'NOT_FOUND' });
    }
    res.json({ data: row });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/treatments ─────────────────────────────────────────────────
apiV1Router.post('/treatments', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      clientId,
      riskScenarioId,
      treatmentType,
      strategy,
      justification,
      controlId,
    } = req.body;

    if (!clientId || !riskScenarioId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, riskScenarioId',
        code: 'BAD_REQUEST',
      });
    }

    const [created] = await db
      .insert(riskTreatments)
      .values({
        clientId,
        riskScenarioId,
        treatmentType: treatmentType ?? 'mitigate',
        strategy: strategy ?? null,
        justification: justification ?? null,
        controlId: controlId ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/risks ──────────────────────────────────────────────────────
apiV1Router.post('/risks', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      clientId,
      title,
      description,
      category,
      assessmentType,
      assetId,
    } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, title',
        code: 'BAD_REQUEST',
      });
    }

    const [created] = await db
      .insert(riskScenarios)
      .values({
        clientId,
        title,
        description: description ?? null,
        category: category ?? 'General',
        assessmentType: assessmentType ?? 'asset',
        assetId: assetId ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/frameworks ──────────────────────────────────────────────────
apiV1Router.get('/frameworks', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    // All distinct framework names from controls table,
    // enriched with pass rates from client_controls
    const rows = await db.execute(sql`
      SELECT
        c.framework,
        COUNT(DISTINCT c.id)::int AS total_controls,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'implemented')::int AS implemented,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'in_progress')::int AS in_progress,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'not_implemented')::int AS not_implemented,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'not_applicable')::int AS not_applicable,
        CASE
          WHEN COUNT(DISTINCT cc.id) FILTER (WHERE cc.status IN ('implemented', 'not_applicable')) > 0
            AND COUNT(DISTINCT cc.id) > 0
          THEN ROUND(
            COUNT(DISTINCT cc.id) FILTER (WHERE cc.status IN ('implemented', 'not_applicable'))::numeric
            / NULLIF(COUNT(DISTINCT cc.id), 0) * 100, 1)
          ELSE 0
        END AS pass_rate
      FROM controls c
      LEFT JOIN client_controls cc ON cc.control_id = c.id
      GROUP BY c.framework
      ORDER BY c.framework
    `);

    res.json({ data: rows, total: Array.isArray(rows) ? rows.length : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/gaps?framework=nis2 ─────────────────────────────────────────
apiV1Router.get('/gaps', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const framework = req.query.framework as string | undefined;

    let query = sql`
      SELECT c.id, c.control_id, c.name, c.description, c.framework, c.owner
      FROM controls c
      WHERE c.status = 'active'
    `;

    if (framework) {
      query = sql`${query} AND c.framework = ${framework}`;
    }

    // A gap is a control that has NO linked evidence
    query = sql`
      ${query}
      AND NOT EXISTS (
        SELECT 1
        FROM evidence e
        JOIN client_controls cc ON cc.id = e.client_control_id
        WHERE cc.control_id = c.id
      )
      ORDER BY c.control_id
    `;

    const rows = await db.execute(query);

    res.json({ data: rows, total: Array.isArray(rows) ? rows.length : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/report?framework=nis2 ───────────────────────────────────────
apiV1Router.get('/report', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const framework = req.query.framework as string | undefined;

    const frameworkFilter = framework
      ? sql`AND c.framework = ${framework}`
      : sql``;

    // Total controls
    const totalRows = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM controls c WHERE c.status = 'active' ${frameworkFilter}`
    );
    const totalResult = ((Array.isArray(totalRows) ? (totalRows as any[])[0] : undefined) as { count: number } | undefined);
    const totalControls = totalResult?.count ?? 0;

    // Controls by implementation status
    const implRows = await db.execute(sql`
      SELECT
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'implemented')::int AS implemented,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'in_progress')::int AS in_progress,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'not_implemented')::int AS not_implemented,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'not_applicable')::int AS not_applicable
      FROM controls c
      LEFT JOIN client_controls cc ON cc.control_id = c.id
      WHERE c.status = 'active' ${frameworkFilter}
    `);
    const implResult = ((Array.isArray(implRows) ? (implRows as any[])[0] : undefined) as {
      implemented: number;
      in_progress: number;
      not_implemented: number;
      not_applicable: number;
    } | undefined);

    // Evidence stats
    const evRows = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_evidence,
        COUNT(*) FILTER (WHERE e.status = 'collected')::int AS collected,
        COUNT(*) FILTER (WHERE e.status = 'verified')::int AS verified,
        COUNT(*) FILTER (WHERE e.status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE e.status = 'expired')::int AS expired,
        COUNT(*) FILTER (
          WHERE e.expiration_date IS NOT NULL
            AND e.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        )::int AS expiring_soon
      FROM evidence e
      JOIN client_controls cc ON cc.id = e.client_control_id
      JOIN controls c ON c.id = cc.control_id
      WHERE c.status = 'active' ${frameworkFilter}
    `);
    const evResult = ((Array.isArray(evRows) ? (evRows as any[])[0] : undefined) as {
      total_evidence: number;
      collected: number;
      verified: number;
      pending: number;
      expired: number;
      expiring_soon: number;
    } | undefined);

    // Gap count (controls with zero evidence)
    const gapRows = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM controls c
      WHERE c.status = 'active'
        ${frameworkFilter}
        AND NOT EXISTS (
          SELECT 1
          FROM evidence e
          JOIN client_controls cc ON cc.id = e.client_control_id
          WHERE cc.control_id = c.id
        )
    `);
    const gapResult = ((Array.isArray(gapRows) ? (gapRows as any[])[0] : undefined) as { count: number } | undefined);

    const implemented = implResult?.implemented ?? 0;
    const totalWithStatus = implemented
      + (implResult?.in_progress ?? 0)
      + (implResult?.not_implemented ?? 0)
      + (implResult?.not_applicable ?? 0);

    const passRate = totalWithStatus > 0
      ? Math.round(((implemented + (implResult?.not_applicable ?? 0)) / totalWithStatus) * 1000) / 10
      : 0;

    res.json({
      framework: framework ?? 'all',
      totalControls,
      implementation: {
        implemented: implResult?.implemented ?? 0,
        inProgress: implResult?.in_progress ?? 0,
        notImplemented: implResult?.not_implemented ?? 0,
        notApplicable: implResult?.not_applicable ?? 0,
        passRate,
      },
      evidence: {
        total: evResult?.total_evidence ?? 0,
        collected: evResult?.collected ?? 0,
        verified: evResult?.verified ?? 0,
        pending: evResult?.pending ?? 0,
        expired: evResult?.expired ?? 0,
        expiringSoon: evResult?.expiring_soon ?? 0,
      },
      gaps: gapResult?.count ?? 0,
      readinessScore: passRate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});



// ── Entity List Endpoints ──────────────────────────────────────────────────

apiV1Router.get('/clients', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const rows = await db.select().from(clients).where(eq(clients.status, 'active'));
        res.json({ data: rows });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/clients/:id', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const [row] = await db.select().from(clients).where(eq(clients.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ data: row });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/assets', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const rows = await db.select().from(assets).limit(200);
        res.json({ data: rows });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/assets/:id', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const [row] = await db.select().from(assets).where(eq(assets.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ data: row });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/vendors', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const rows = await db.select().from(vendors).limit(200);
        res.json({ data: rows });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/vendors/:id', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const [row] = await db.select().from(vendors).where(eq(vendors.id, parseInt(req.params.id)));
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ data: row });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiV1Router.get('/policies', async (req: any, res: any) => {
    try {
        const db = await getDb();
        const rows = await db.select().from(clientPolicies).limit(200);
        res.json({ data: rows });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/v1/summary ─────────────────────────────────────────────────────
apiV1Router.get('/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    
    const [
      clientsRes,
      assetsRes,
      vendorsRes,
      controlsRes,
      frameworksRes,
      evidenceRes,
      policiesRes,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS count FROM clients WHERE status = 'active'`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM assets`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM vendors`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM controls WHERE status = 'active'`),
      db.execute(sql`SELECT COUNT(DISTINCT framework)::int AS count FROM controls WHERE status = 'active'`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM evidence`),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM client_policies`),
    ]);

    const getCount = (res: any) => {
      const rows = Array.isArray(res) ? res : (res?.rows || []);
      return (rows[0] as any)?.count ?? 0;
    };

    res.json({
      clients: getCount(clientsRes),
      assets: getCount(assetsRes),
      vendors: getCount(vendorsRes),
      controls: getCount(controlsRes),
      frameworks: getCount(frameworksRes),
      evidence: getCount(evidenceRes),
      policies: getCount(policiesRes),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/treatments ──────────────────────────────────────────────────
apiV1Router.get('/treatments', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const riskScenarioIdStr = req.query.riskScenarioId as string | undefined;

    let rows;
    if (riskScenarioIdStr) {
      const riskScenarioId = parseInt(riskScenarioIdStr, 10);
      if (isNaN(riskScenarioId)) {
        return res.status(400).json({ error: 'Invalid riskScenarioId', code: 'BAD_REQUEST' });
      }
      rows = await db
        .select()
        .from(riskTreatments)
        .where(eq(riskTreatments.riskScenarioId, riskScenarioId))
        .orderBy(riskTreatments.createdAt);
    } else {
      rows = await db
        .select()
        .from(riskTreatments)
        .orderBy(riskTreatments.createdAt);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /api/v1/risks/:id ─────────────────────────────────────────────────
apiV1Router.patch('/risks/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid risk id', code: 'BAD_REQUEST' });
    }

    const { status, owner } = req.body;

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (owner !== undefined) updateFields.owner = owner;
    updateFields.updatedAt = new Date();

    const [updated] = await db
      .update(riskScenarios)
      .set(updateFields)
      .where(eq(riskScenarios.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Risk not found', code: 'NOT_FOUND' });
    }

    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/v1/risks/:id ────────────────────────────────────────────────
apiV1Router.delete('/risks/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid risk id', code: 'BAD_REQUEST' });
    }

    const [deleted] = await db
      .delete(riskScenarios)
      .where(eq(riskScenarios.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Risk not found', code: 'NOT_FOUND' });
    }

    res.json({ message: 'Risk deleted successfully', data: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /api/v1/evidence/:id ─────────────────────────────────────────────
apiV1Router.delete('/evidence/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid evidence id', code: 'BAD_REQUEST' });
    }

    const [deleted] = await db
      .delete(evidence)
      .where(eq(evidence.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Evidence not found', code: 'NOT_FOUND' });
    }

    res.json({ message: 'Evidence deleted successfully', data: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/tasks ───────────────────────────────────────────────────────
apiV1Router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const status = req.query.status as string | undefined;

    let rows;
    if (status) {
      rows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, status))
        .orderBy(tasks.createdAt);
    } else {
      rows = await db
        .select()
        .from(tasks)
        .orderBy(tasks.createdAt);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/tasks ──────────────────────────────────────────────────────
apiV1Router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      clientId,
      title,
      description,
      assigneeId,
      dueDate,
      status,
      priority,
      relatedEntityType,
      relatedEntityId,
    } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, title',
        code: 'BAD_REQUEST',
      });
    }

    const [created] = await db
      .insert(tasks)
      .values({
        clientId,
        title,
        description: description ?? null,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status ?? 'pending',
        priority: priority ?? 'medium',
        relatedEntityType: relatedEntityType ?? null,
        relatedEntityId: relatedEntityId ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/audits ──────────────────────────────────────────────────────
apiV1Router.get('/audits', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(sql`${auditLogs.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/policies/attestations ───────────────────────────────────────
apiV1Router.get('/policies/attestations', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const status = req.query.status as string | undefined;

    let rows;
    if (status) {
      rows = await db
        .select()
        .from(policyAssignments)
        .where(eq(policyAssignments.status, status))
        .orderBy(policyAssignments.assignedAt);
    } else {
      rows = await db
        .select()
        .from(policyAssignments)
        .orderBy(policyAssignments.assignedAt);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/clients ───────────────────────────────────────────────────
apiV1Router.post('/clients', async (req: Request, res: Response) => {
  try {
    const { name, description, industry, size, frameworks } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name', code: 'BAD_REQUEST' });
    }

    // Call onboardClient from db wrapper to fully initialize frameworks and controls
    const result = await onboardClient({
      name,
      industry: industry || 'Technology',
      userId: 1, // Default local admin user ID
      frameworks: frameworks || [],
      companyName: name
    });

    // Update optional description and size if provided
    if (description || size) {
      const db = await getDb();
      await db
        .update(clients)
        .set({
          description: description ?? null,
          size: size ?? null,
        })
        .where(eq(clients.id, result.id));
      result.description = description ?? null;
      result.size = size ?? null;
    }

    res.status(201).json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/evidence/requests ──────────────────────────────────────────
apiV1Router.get('/evidence/requests', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const status = req.query.status as string | undefined;

    let rows;
    if (status) {
      rows = await db
        .select()
        .from(evidenceRequests)
        .where(eq(evidenceRequests.status, status))
        .orderBy(evidenceRequests.id);
    } else {
      rows = await db
        .select()
        .from(evidenceRequests)
        .orderBy(evidenceRequests.id);
    }

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/evidence/requests ─────────────────────────────────────────
apiV1Router.post('/evidence/requests', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { clientId, clientControlId, requesterId, assigneeId, dueDate, description } = req.body;

    if (!clientId || !clientControlId || !requesterId || !assigneeId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, clientControlId, requesterId, assigneeId',
        code: 'BAD_REQUEST'
      });
    }

    const [created] = await db
      .insert(evidenceRequests)
      .values({
        clientId,
        clientControlId,
        requesterId,
        assigneeId,
        status: 'open',
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/evidence/:id/files ────────────────────────────────────────
apiV1Router.post('/evidence/:id/files', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const evidenceId = parseInt(req.params.id, 10);
    if (isNaN(evidenceId)) {
      return res.status(400).json({ error: 'Invalid evidence id', code: 'BAD_REQUEST' });
    }

    const { filename, fileUrl, fileKey, contentType, fileSize, uploadedBy } = req.body;
    if (!filename || !fileUrl || !fileKey) {
      return res.status(400).json({
        error: 'Missing required fields: filename, fileUrl, fileKey',
        code: 'BAD_REQUEST'
      });
    }

    const [created] = await db
      .insert(evidenceFiles)
      .values({
        evidenceId,
        filename,
        fileUrl,
        fileKey,
        contentType: contentType ?? null,
        fileSize: fileSize ?? null,
        uploadedBy: uploadedBy ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/risks/appetite ─────────────────────────────────────────────
apiV1Router.get('/risks/appetite', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(riskAppetite)
      .orderBy(riskAppetite.id);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/risks/assessments ─────────────────────────────────────────
apiV1Router.post('/risks/assessments', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { clientId, assessmentId, title, category, owaspCategory, privacyImpact, assessor, method, riskId } = req.body;

    if (!clientId || !assessmentId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, assessmentId',
        code: 'BAD_REQUEST'
      });
    }

    const [created] = await db
      .insert(riskAssessments)
      .values({
        clientId,
        assessmentId,
        title: title ?? null,
        category: category ?? 'General',
        owaspCategory: owaspCategory ?? null,
        privacyImpact: privacyImpact ?? false,
        assessor: assessor ?? null,
        method: method ?? 'Qualitative',
        riskId: riskId ?? null,
        status: 'draft',
        assessmentDate: new Date(),
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/privacy/dsar ───────────────────────────────────────────────
apiV1Router.get('/privacy/dsar', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dsarRequests)
      .orderBy(dsarRequests.requestDate);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/privacy/dsar ──────────────────────────────────────────────
apiV1Router.post('/privacy/dsar', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { clientId, requestId, requestType, status, priority, subjectEmail, subjectName, verificationStatus, verificationMethod, submissionMethod } = req.body;

    if (!clientId || !requestId || !requestType) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, requestId, requestType',
        code: 'BAD_REQUEST'
      });
    }

    const [created] = await db
      .insert(dsarRequests)
      .values({
        clientId,
        requestId,
        requestType,
        status: status ?? 'New',
        priority: priority ?? 'medium',
        subjectEmail: subjectEmail ?? null,
        subjectName: subjectName ?? null,
        verificationStatus: verificationStatus ?? 'Pending',
        verificationMethod: verificationMethod ?? null,
        submissionMethod: submissionMethod ?? 'manual',
        requestDate: new Date(),
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/privacy/dpia ───────────────────────────────────────────────
apiV1Router.get('/privacy/dpia', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(dataProtImpactAssessments)
      .orderBy(dataProtImpactAssessments.id);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/audits/findings ────────────────────────────────────────────
apiV1Router.get('/audits/findings', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(auditFindings)
      .orderBy(auditFindings.createdAt);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── POST /api/v1/audits/findings ───────────────────────────────────────────
apiV1Router.post('/audits/findings', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { clientId, title, description, severity, status, evidenceId, authorId } = req.body;

    if (!clientId || !title || !authorId) {
      return res.status(400).json({
        error: 'Missing required fields: clientId, title, authorId',
        code: 'BAD_REQUEST'
      });
    }

    const [created] = await db
      .insert(auditFindings)
      .values({
        clientId,
        title,
        description: description ?? null,
        severity: severity ?? 'medium',
        status: status ?? 'open',
        evidenceId: evidenceId ?? null,
        authorId,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/employees ──────────────────────────────────────────────────
apiV1Router.get('/employees', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(employees)
      .orderBy(employees.id);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/v1/employees/:id/acknowledgments ──────────────────────────────
apiV1Router.get('/employees/:id/acknowledgments', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = parseInt(req.params.id, 10);
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee id', code: 'BAD_REQUEST' });
    }

    const rows = await db
      .select()
      .from(employeeAcknowledgments)
      .where(eq(employeeAcknowledgments.employeeId, employeeId))
      .orderBy(employeeAcknowledgments.acknowledgedAt);

    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

export { apiV1Router };
