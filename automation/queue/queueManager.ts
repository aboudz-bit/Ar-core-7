/**
 * Queue Manager — SAFE MODE / DRY RUN
 *
 * Extended job-oriented queue API built on top of taskQueue.
 * Supports getJobById, updateJobStatus, cancelJob.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import automationConfig from '../config/automationConfig';
import type { AutomationTask, QueueItem, TaskStatus, WorkflowJob, ExecutionMode } from '../types/automationTypes';

const jobs: Map<string, QueueItem> = new Map();
let jobCounter = 0;

/** Enqueue a new job */
export function enqueueJob(task: AutomationTask, priority: number = 0): QueueItem {
  const item: QueueItem = {
    id: `job-${++jobCounter}`,
    task: { ...task, dryRun: true, status: 'queued' },
    priority,
    addedAt: new Date().toISOString(),
  };
  jobs.set(item.id, item);
  bridgeLog('info', 'queueManager', `[DRY RUN] Enqueued job: ${task.name} → ${item.id}`);
  return item;
}

/** Dequeue the highest-priority job */
export function dequeueJob(): QueueItem | undefined {
  const sorted = Array.from(jobs.values())
    .filter((j) => j.task.status === 'queued')
    .sort((a, b) => b.priority - a.priority);
  const next = sorted[0];
  if (next) {
    next.task.status = 'running';
    bridgeLog('info', 'queueManager', `[DRY RUN] Dequeued job: ${next.id}`);
  }
  return next;
}

/** Get the full queue (all statuses) */
export function getQueue(): QueueItem[] {
  return Array.from(jobs.values());
}

/** Get a specific job by ID */
export function getJobById(id: string): QueueItem | undefined {
  return jobs.get(id);
}

/** Update a job's task status */
export function updateJobStatus(id: string, status: TaskStatus, error?: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;

  job.task.status = status;
  if (error) job.task.error = error;
  if (status === 'completed' || status === 'failed') {
    job.task.completedAt = new Date().toISOString();
  }
  bridgeLog('info', 'queueManager', `[DRY RUN] Job ${id} → ${status}`);
  return true;
}

/** Cancel a queued or running job */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  if (job.task.status === 'completed' || job.task.status === 'failed') return false;

  job.task.status = 'skipped';
  job.task.completedAt = new Date().toISOString();
  job.task.error = 'Cancelled';
  bridgeLog('info', 'queueManager', `[DRY RUN] Job ${id} cancelled`);
  return true;
}

/** Get queue stats */
export function getQueueStats(): { total: number; queued: number; running: number; completed: number; failed: number; skipped: number } {
  const all = Array.from(jobs.values());
  return {
    total: all.length,
    queued: all.filter((j) => j.task.status === 'queued').length,
    running: all.filter((j) => j.task.status === 'running').length,
    completed: all.filter((j) => j.task.status === 'completed').length,
    failed: all.filter((j) => j.task.status === 'failed').length,
    skipped: all.filter((j) => j.task.status === 'skipped').length,
  };
}

/** Clear all jobs */
export function clearJobs(): void {
  jobs.clear();
  jobCounter = 0;
  bridgeLog('info', 'queueManager', 'All jobs cleared');
}
