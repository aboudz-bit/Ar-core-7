/**
 * Task Queue — SAFE MODE / DRY RUN
 *
 * In-memory task queue for automation jobs.
 * No real processing. Mock only.
 */

import { QueueItem, AutomationTask, TaskStatus } from '../types/automationTypes';
import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

const queue: QueueItem[] = [];
let counter = 0;

export function enqueue(task: AutomationTask, priority: number = 0): QueueItem {
  const item: QueueItem = {
    id: `q-${++counter}`,
    task: { ...task, dryRun: true, status: 'queued' },
    priority,
    addedAt: new Date().toISOString(),
  };

  queue.push(item);
  queue.sort((a, b) => b.priority - a.priority);
  bridgeLog('info', 'taskQueue', `[DRY RUN] Enqueued task: ${task.name} (priority ${priority})`);
  return item;
}

export function dequeue(): QueueItem | undefined {
  return queue.shift();
}

export function peek(): QueueItem | undefined {
  return queue[0];
}

export function listQueue(): QueueItem[] {
  return [...queue];
}

export function clearQueue(): void {
  queue.length = 0;
  bridgeLog('info', 'taskQueue', 'Queue cleared');
}

export function queueSize(): number {
  return queue.length;
}

/** Simulate processing the entire queue — all tasks skipped in safe mode */
export function processQueue(): { processed: number; results: { id: string; status: TaskStatus }[] } {
  const results: { id: string; status: TaskStatus }[] = [];

  while (queue.length > 0) {
    const item = queue.shift()!;
    const status: TaskStatus = automationConfig.safeMode ? 'skipped' : 'completed';
    results.push({ id: item.id, status });
    bridgeLog('info', 'taskQueue', `[DRY RUN] Process task: ${item.task.name} → ${status}`);
  }

  return { processed: results.length, results };
}
