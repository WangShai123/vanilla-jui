import { describe, expect, it, vi } from 'vite-plus/test';

import { createScheduledTask } from '../src/core/scheduler.ts';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createScheduledTask', () => {
  it('coalesces repeated scheduling in one microtask', async () => {
    const run = vi.fn();
    const task = createScheduledTask(run);

    task.schedule();
    task.schedule();
    await flushMicrotasks();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('reuses an enqueued node after cancel without creating a cycle', async () => {
    const run = vi.fn();
    const task = createScheduledTask(run);

    task.schedule();
    task.cancel();
    task.schedule();
    await flushMicrotasks();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not truncate later tasks when an enqueued task is disposed', async () => {
    const firstRun = vi.fn();
    const secondRun = vi.fn();
    const first = createScheduledTask(firstRun);
    const second = createScheduledTask(secondRun);

    first.schedule();
    second.schedule();
    first.dispose();
    await flushMicrotasks();

    expect(firstRun).not.toHaveBeenCalled();
    expect(secondRun).toHaveBeenCalledTimes(1);
  });
});
