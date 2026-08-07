import { createWatch, untrack, unwrap } from 'vanilla-signal';

interface QueueNode {
  queued: boolean;
  disposed: boolean;
  next: QueueNode | null;
  run: () => void;
}

interface ScheduledTask {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
  dispose: () => void;
}

interface StateSyncOptions {
  deferInitial?: boolean;
  flushInitial?: boolean;
  flush?: 'microtask' | 'sync';
}

let head: QueueNode | null = null;
let tail: QueueNode | null = null;
let pending = false;

function queueTask(callback: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
}

function requestFlush(): void {
  if (pending) return;
  pending = true;
  queueTask(flushQueue);
}

function enqueue(node: QueueNode): void {
  if (tail) tail.next = node;
  else head = node;
  tail = node;
  requestFlush();
}

function flushQueue(): void {
  pending = false;
  const start = head;
  head = null;
  tail = null;

  let node = start;
  while (node) {
    const next = node.next;
    node.next = null;

    if (!node.disposed && node.queued) {
      node.queued = false;
      node.run();
    }

    node = next;
  }
}

export function createScheduledTask(run: () => void): ScheduledTask {
  const node: QueueNode = {
    queued: false,
    disposed: false,
    next: null,
    run,
  };

  return {
    schedule() {
      if (node.disposed || node.queued) return;
      node.queued = true;
      enqueue(node);
    },
    flush() {
      if (node.disposed) return;
      node.queued = false;
      node.run();
    },
    cancel() {
      node.queued = false;
    },
    dispose() {
      node.disposed = true;
      node.queued = false;
      node.next = null;
    },
  };
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
