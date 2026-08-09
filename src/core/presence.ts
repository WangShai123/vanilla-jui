import { flushSync } from 'vanilla-signal';

import { type MotionController } from './motion.ts';

export type PresencePhase = 'hidden' | 'entering' | 'visible' | 'leaving';

export interface PresenceOptions {
  elements: () => readonly (Element | null | undefined)[];
  mount: () => void;
  activate: () => void;
  deactivate: () => void;
  unmount: () => void;
  motion?: MotionController;
}

export interface PresenceController {
  readonly phase: PresencePhase;
  enter: () => Promise<boolean>;
  leave: () => Promise<boolean>;
  cancel: () => void;
}

function connectedElements(
  values: readonly (Element | null | undefined)[]
): Element[] {
  return values.filter(
    (value): value is Element => value != null && value.isConnected
  );
}

function commitInitialStyles(elements: readonly Element[]): void {
  elements[0]?.getBoundingClientRect();
}

function timeList(value: string): number[] {
  return value.split(',').map((part) => {
    const time = part.trim();
    if (time.endsWith('ms')) return Number.parseFloat(time) || 0;
    if (time.endsWith('s')) return (Number.parseFloat(time) || 0) * 1000;
    return 0;
  });
}

function numberList(value: string): number[] {
  return value.split(',').map((part) => {
    const count = Number.parseFloat(part);
    return Number.isFinite(count) ? count : 0;
  });
}

function timelineDuration(
  durations: number[],
  delays: number[],
  iterations: number[] = [1],
  enabled: boolean[] = [true]
): number {
  const count = Math.max(
    durations.length,
    delays.length,
    iterations.length,
    enabled.length
  );
  let duration = 0;
  for (let index = 0; index < count; index += 1) {
    if (!enabled[index % enabled.length]) continue;
    const active =
      (durations[index % durations.length] || 0) *
        (iterations[index % iterations.length] || 0) +
      (delays[index % delays.length] || 0);
    duration = Math.max(duration, active);
  }
  return Math.max(0, duration);
}

function computedMotionDuration(element: Element): number {
  const view = element.ownerDocument.defaultView;
  if (!view) return 0;
  const style = view.getComputedStyle(element);
  const transition = timelineDuration(
    timeList(style.transitionDuration),
    timeList(style.transitionDelay),
    [1],
    style.transitionProperty
      .split(',')
      .map((property) => property.trim() !== 'none')
  );
  const animation = timelineDuration(
    timeList(style.animationDuration),
    timeList(style.animationDelay),
    numberList(style.animationIterationCount),
    style.animationName.split(',').map((name) => name.trim() !== 'none')
  );
  return Math.max(transition, animation);
}

function waitForDuration(
  duration: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const finish = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timeout = setTimeout(finish, duration);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

export async function waitForMotion(
  elements: readonly Element[],
  signal?: AbortSignal
): Promise<void> {
  const animations = new Set<Animation>();
  let fallbackDuration = 0;
  for (const element of elements) {
    if (typeof element.getAnimations !== 'function') {
      fallbackDuration = Math.max(
        fallbackDuration,
        computedMotionDuration(element)
      );
      continue;
    }
    for (const animation of element.getAnimations()) {
      const endTime = animation.effect?.getComputedTiming().endTime;
      if (typeof endTime !== 'number' || Number.isFinite(endTime)) {
        animations.add(animation);
      }
    }
  }
  const pending = Array.from(
    animations,
    (animation) => animation.finished as Promise<unknown>
  );
  if (fallbackDuration > 0) {
    pending.push(waitForDuration(fallbackDuration, signal));
  }
  if (pending.length === 0) return;
  const settled = Promise.allSettled(pending);
  if (!signal) {
    await settled;
    return;
  }
  await new Promise<void>((resolve) => {
    const finish = (): void => {
      signal.removeEventListener('abort', finish);
      resolve();
    };
    if (signal.aborted) {
      finish();
      return;
    }
    signal.addEventListener('abort', finish, { once: true });
    void settled.then(finish);
  });
}

export function createPresence(options: PresenceOptions): PresenceController {
  let phase: PresencePhase = 'hidden';
  let operation = 0;
  let entering: Promise<boolean> | null = null;
  let leaving: Promise<boolean> | null = null;
  let motionController: AbortController | null = null;

  const nextMotion = (): AbortSignal => {
    motionController?.abort();
    motionController = new AbortController();
    return motionController.signal;
  };

  const enter = (): Promise<boolean> => {
    if (phase === 'visible') return Promise.resolve(false);
    if (phase === 'entering' && entering) return entering;

    const currentOperation = ++operation;
    const signal = nextMotion();
    phase = 'entering';
    entering = (async () => {
      options.mount();
      const elements = connectedElements(options.elements());
      commitInitialStyles(elements);
      flushSync(options.activate);
      if (options.motion) await options.motion.enter(signal);
      else await waitForMotion(elements, signal);
      if (currentOperation !== operation) return false;
      phase = 'visible';
      return true;
    })();
    return entering;
  };

  const leave = (): Promise<boolean> => {
    if (phase === 'hidden') return Promise.resolve(false);
    if (phase === 'leaving' && leaving) return leaving;

    const currentOperation = ++operation;
    const signal = nextMotion();
    phase = 'leaving';
    leaving = (async () => {
      flushSync(options.deactivate);
      const elements = connectedElements(options.elements());
      if (options.motion) await options.motion.leave(signal);
      else await waitForMotion(elements, signal);
      if (currentOperation !== operation) return false;
      options.unmount();
      phase = 'hidden';
      return true;
    })();
    return leaving;
  };

  return {
    get phase() {
      return phase;
    },
    enter,
    leave,
    cancel() {
      operation += 1;
      motionController?.abort();
      motionController = null;
      options.motion?.cancel();
      phase = 'hidden';
      entering = null;
      leaving = null;
    },
  };
}
