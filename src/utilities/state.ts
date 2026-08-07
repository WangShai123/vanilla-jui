import { createWatch, untrack, unwrap } from 'vanilla-signal';

import { createScheduledTask } from './scheduler.ts';

export interface StateSyncOptions {
  deferInitial?: boolean;
  flushInitial?: boolean;
  flush?: 'microtask' | 'sync';
}

export function getStoreVersion(value: unknown): number {
  if (value && typeof value === 'object') {
    const version = (value as { __version__?: unknown }).__version__;
    return typeof version === 'number' ? version : 0;
  }
  return 0;
}

export function trackStoreVersion<T>(value: T): T {
  getStoreVersion(value);
  return value;
}

export function stateSnapshot<T>(value: T): T {
  return unwrap(value) as T;
}

/**
 * Bridges reactive state to an expensive imperative effect. Declarative view
 * bindings should depend on state directly instead of using this helper.
 */
export function createStateSync<TSnapshot>(
  read: () => TSnapshot,
  sync: (snapshot: TSnapshot) => void | Promise<void>,
  {
    deferInitial = true,
    flushInitial = false,
    flush = 'microtask',
  }: StateSyncOptions = {}
): () => void {
  let initialized = false;
  let hasSnapshot = false;
  let latestSnapshot: TSnapshot;

  const task = createScheduledTask(() => {
    if (!hasSnapshot) return;
    hasSnapshot = false;
    void untrack(() => sync(latestSnapshot));
  });

  const watcher = createWatch(
    read,
    (snapshot) => {
      const isInitial = !initialized;
      initialized = true;
      latestSnapshot = snapshot as TSnapshot;
      hasSnapshot = true;

      if ((isInitial && flushInitial) || flush === 'sync') {
        task.flush();
        return;
      }

      task.schedule();
    },
    { defer: deferInitial }
  );

  return () => {
    task.dispose();
    watcher.dispose();
  };
}
