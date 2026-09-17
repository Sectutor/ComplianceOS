/**
 * Job Queue
 *
 * Simple in-memory job queue for background AI tasks.
 * In production, this would use Redis/Bull or similar.
 * For now, a lightweight in-memory implementation that lets
 * the server start and jobs.ts work.
 */

export type JobType = 'ai:draft' | 'ai:risk_triage' | 'ai:evidence_analysis';

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryJobQueue {
  private jobs = new Map<string, Job>();
  private counter = 0;

  async enqueue(
    type: JobType,
    payload: Record<string, unknown>,
  ): Promise<Job> {
    const id = `job_${++this.counter}_${Date.now()}`;
    const job: Job = {
      id,
      type,
      payload,
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }
}

export const jobQueue = new InMemoryJobQueue();
