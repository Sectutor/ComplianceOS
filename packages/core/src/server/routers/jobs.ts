/**
 * Job Status Router
 *
 * Endpoints:
 *   POST /api/jobs/enqueue — Enqueue a new AI job
 *   GET  /api/jobs/:id     — Poll for job status/result
 *
 * The AI handlers are registered here and delegate to the actual
 * AI logic (imported from the existing ai router).
 */

import express from 'express';
import { jobQueue, JobType } from '../lib/jobs/queue';

export const jobRouter = express.Router();

/* ------------------------------------------------------------------ */
/*  Enqueue a job                                                      */
/* ------------------------------------------------------------------ */

jobRouter.post('/enqueue', express.json(), async (req: any, res) => {
  try {
    const { type, payload } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ error: 'Missing required fields: type, payload' });
    }

    const validTypes: JobType[] = ['ai:draft', 'ai:risk_triage', 'ai:evidence_analysis'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid job type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const job = await jobQueue.enqueue(type, payload);
    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (err: any) {
    console.error('[Jobs] Enqueue error:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

/* ------------------------------------------------------------------ */
/*  Poll job status                                                    */
/* ------------------------------------------------------------------ */

jobRouter.get('/:id', async (req: any, res) => {
  try {
    const job = jobQueue['getJob'](req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.status === 'completed' ? job.result : undefined,
      error: job.status === 'failed' ? job.error : undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err: any) {
    console.error('[Jobs] Poll error:', err);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});
