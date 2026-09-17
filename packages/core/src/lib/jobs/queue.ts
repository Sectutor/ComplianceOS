/**
 * Background Job Queue (P0 Speed)
 *
 * Offloads AI drafting / risk triage calls to a background worker,
 * freeing the request thread. Jobs run sequentially to prevent
 * LLM rate-limit bursts.
 *
 * Status flow: queued → processing → completed | failed
 *
 * Usage:
 *   import { jobQueue } from './lib/jobs/queue';
 *   const job = await jobQueue.enqueue('ai:draft', { prompt, model });
 *   // GET /api/jobs/:id to poll for result
 */

import { randomBytes } from 'crypto';
import { logger } from '../logger';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type JobType = 'ai:draft' | 'ai:risk_triage' | 'ai:evidence_analysis';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  In-memory store (Redis-backed in production)                       */
/* ------------------------------------------------------------------ */

class MemoryJobStore {
  private jobs: Map<string, Job> = new Map();
  private processing: boolean = false;
  private handlers: Map<JobType, (payload: any) => Promise<any>> = new Map();
  private pollIntervalMs: number = 100;

  registerHandler(type: JobType, handler: (payload: any) => Promise<any>): void {
    this.handlers.set(type, handler);
  }

  enqueue(type: JobType, payload: any): Promise<Job> {
    const job: Job = {
      id: `${type.replace(':', '-')}-${Date.now()}-${randomBytes(4).toString('hex')}`,
      type,
      status: 'queued',
      payload,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);
    logger.debug({ message: '[JobQueue] Enqueued', jobId: job.id, type });

    // Start processing if idle
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }

    return Promise.resolve(job);
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Find next queued job
      const next = Array.from(this.jobs.values()).find(j => j.status === 'queued');
      if (!next) {
        this.processing = false;
        return;
      }

      const handler = this.handlers.get(next.type);
      if (!handler) {
        next.status = 'failed';
        next.error = `No handler registered for job type: ${next.type}`;
        next.completedAt = new Date().toISOString();
        logger.warn({ message: '[JobQueue] No handler', jobId: next.id, type: next.type });
        this.processing = false;
        // Try next job
        setImmediate(() => this.processNext());
        return;
      }

      next.status = 'processing';
      next.startedAt = new Date().toISOString();
      logger.info({ message: '[JobQueue] Processing', jobId: next.id, type: next.type });

      const result = await handler(next.payload);
      next.status = 'completed';
      next.result = result;
      next.completedAt = new Date().toISOString();
      logger.info({ message: '[JobQueue] Completed', jobId: next.id, type: next.type });
    } catch (err: any) {
      // Find the failed job
      const failed = Array.from(this.jobs.values()).find(j => j.status === 'processing');
      if (failed) {
        failed.status = 'failed';
        failed.error = err.message || 'Unknown error';
        failed.completedAt = new Date().toISOString();
        logger.warn({ message: '[JobQueue] Failed', jobId: failed.id, error: err.message });
      }
    }

    this.processing = false;

    // Process next job in queue
    const hasMore = Array.from(this.jobs.values()).some(j => j.status === 'queued');
    if (hasMore) {
      setImmediate(() => this.processNext());
    }
  }
}

export const jobQueue = new MemoryJobStore();

/* ------------------------------------------------------------------ */
/*  Cleanup old jobs (keep last 100)                                   */
/* ------------------------------------------------------------------ */

setInterval(() => {
  const all = Array.from(jobQueue['jobs'].values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (all.length > 100) {
    const toDelete = all.slice(100);
    for (const job of toDelete) {
      jobQueue['jobs'].delete(job.id);
    }
    logger.debug({ message: '[JobQueue] Cleaned up old jobs', count: toDelete.length });
  }
}, 5 * 60 * 1000); // every 5 minutes
