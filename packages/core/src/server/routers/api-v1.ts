import { Router, Request, Response } from 'express';
import { getDb } from '../../db';
import { sql, eq } from 'drizzle-orm';
import {
  controls,
  evidence,
  riskScenarios,
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

export { apiV1Router };
