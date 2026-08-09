interface QueueNode {
  queued: boolean;
  enqueued: boolean;
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
  node.enqueued = true;
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
    node.enqueued = false;

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
    enqueued: false,
    disposed: false,
    next: null,
    run,
  };

  return {
    schedule() {
      if (node.disposed || node.queued) return;
      node.queued = true;
      if (!node.enqueued) enqueue(node);
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
    },
  };
}
