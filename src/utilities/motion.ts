export type TransitionTarget = () => Element | null | undefined;

export interface TransitionDefinition {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options?: KeyframeAnimationOptions;
  respectReducedMotion?: boolean;
}

export interface MotionController {
  enter: (signal?: AbortSignal) => Promise<void>;
  leave: (signal?: AbortSignal) => Promise<void>;
  cancel: () => void;
}

export interface CollapseTransitionDefinition {
  axis?: 'vertical' | 'horizontal';
  options?: KeyframeAnimationOptions;
  fade?: boolean;
  respectReducedMotion?: boolean;
}

export interface CollapseMotionController extends MotionController {
  setExpanded: (expanded: boolean) => void;
}

export function createMotionGroup(
  ...motions: readonly MotionController[]
): MotionController {
  return {
    async enter(signal) {
      await Promise.all(motions.map((motion) => motion.enter(signal)));
    },
    async leave(signal) {
      await Promise.all(motions.map((motion) => motion.leave(signal)));
    },
    cancel() {
      for (const motion of motions) motion.cancel();
    },
  };
}

function waitForAnimation(
  animation: Animation,
  signal?: AbortSignal
): Promise<void> {
  const finished = animation.finished.then(
    () => undefined,
    () => undefined
  );
  if (!signal) return finished;
  return new Promise((resolve) => {
    const complete = (): void => {
      signal.removeEventListener('abort', complete);
      resolve();
    };
    if (signal.aborted) {
      complete();
      return;
    }
    signal.addEventListener('abort', complete, { once: true });
    void finished.then(complete);
  });
}

function resolvedOptions(
  element: Element,
  definition: TransitionDefinition
): KeyframeAnimationOptions {
  const options: KeyframeAnimationOptions = {
    fill: 'both',
    ...definition.options,
  };
  const view = element.ownerDocument.defaultView;
  if (
    definition.respectReducedMotion !== false &&
    view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    options.duration = 0;
    options.delay = 0;
    options.endDelay = 0;
  }
  return options;
}

export function createTransition(
  target: TransitionTarget,
  definition: TransitionDefinition
): MotionController {
  let element: Element | null = null;
  let animation: Animation | null = null;

  const ensureAnimation = (): Animation | null => {
    const nextElement = target() || null;
    if (!nextElement || typeof nextElement.animate !== 'function') return null;
    if (animation && element === nextElement) return animation;
    animation?.cancel();
    element = nextElement;
    animation = nextElement.animate(
      definition.keyframes,
      resolvedOptions(nextElement, definition)
    );
    animation.pause();
    animation.currentTime = 0;
    return animation;
  };

  const play = async (
    direction: 1 | -1,
    signal?: AbortSignal
  ): Promise<void> => {
    if (signal?.aborted) return;
    const current = ensureAnimation();
    if (!current) return;
    const endTime = current.effect?.getComputedTiming().endTime;
    if (
      direction === -1 &&
      current.currentTime == null &&
      typeof endTime === 'number' &&
      Number.isFinite(endTime)
    ) {
      current.currentTime = endTime;
    }
    current.playbackRate = direction * (Math.abs(current.playbackRate) || 1);
    current.play();
    await waitForAnimation(current, signal);
  };

  return {
    enter: (signal) => play(1, signal),
    leave: (signal) => play(-1, signal),
    cancel() {
      animation?.cancel();
      animation = null;
      element = null;
    },
  };
}

interface CollapseInlineStyles {
  size: string;
  opacity: string;
  overflow: string;
  visibility: string;
}

export function createCollapseTransition(
  target: () => HTMLElement | null | undefined,
  definition: CollapseTransitionDefinition = {}
): CollapseMotionController {
  const axis = definition.axis || 'vertical';
  let element: HTMLElement | null = null;
  let animation: Animation | null = null;
  let original: CollapseInlineStyles | null = null;
  let visibleOpacity = '1';
  let operation = 0;

  const readSize = (current: HTMLElement): string =>
    axis === 'vertical' ? current.style.height : current.style.width;

  const writeSize = (current: HTMLElement, value: string): void => {
    if (axis === 'vertical') current.style.height = value;
    else current.style.width = value;
  };

  const restore = (): void => {
    if (!element || !original) return;
    writeSize(element, original.size);
    element.style.opacity = original.opacity;
    element.style.overflow = original.overflow;
    element.style.visibility = original.visibility;
  };

  const resolveElement = (): HTMLElement | null => {
    const next = target() || null;
    if (next === element) return element;

    animation?.cancel();
    restore();
    animation = null;
    element = next;
    original = next
      ? {
          size: readSize(next),
          opacity: next.style.opacity,
          overflow: next.style.overflow,
          visibility: next.style.visibility,
        }
      : null;
    visibleOpacity =
      next?.ownerDocument.defaultView?.getComputedStyle(next).opacity || '1';
    return element;
  };

  const applyBoundary = (expanded: boolean): void => {
    const current = resolveElement();
    if (!current || !original) return;
    if (expanded) {
      restore();
      return;
    }
    writeSize(current, '0px');
    current.style.overflow = 'hidden';
    current.style.visibility = 'hidden';
    if (definition.fade !== false) current.style.opacity = '0';
  };

  const measureExpandedSize = (current: HTMLElement): number => {
    if (!original) return 0;
    const size = readSize(current);
    const visibility = current.style.visibility;
    writeSize(current, original.size);
    current.style.visibility = original.visibility;
    const bounds = current.getBoundingClientRect();
    const measured =
      axis === 'vertical'
        ? Math.max(bounds.height, current.scrollHeight)
        : Math.max(bounds.width, current.scrollWidth);
    writeSize(current, size);
    current.style.visibility = visibility;
    return measured;
  };

  const play = async (
    expanded: boolean,
    signal?: AbortSignal
  ): Promise<void> => {
    if (signal?.aborted) return;
    const current = resolveElement();
    if (!current || !original) return;

    const bounds = current.getBoundingClientRect();
    const currentSize = axis === 'vertical' ? bounds.height : bounds.width;
    const computedOpacity =
      current.ownerDocument.defaultView?.getComputedStyle(current).opacity;
    const currentOpacity = animation
      ? computedOpacity || (expanded ? '0' : visibleOpacity)
      : current.style.opacity ||
        computedOpacity ||
        (expanded ? '0' : visibleOpacity);
    const token = ++operation;

    animation?.cancel();
    animation = null;
    const targetSize = expanded ? measureExpandedSize(current) : 0;
    current.style.overflow = 'hidden';
    current.style.visibility = original.visibility;

    if (typeof current.animate !== 'function') {
      applyBoundary(expanded);
      return;
    }

    const options = resolvedOptions(current, {
      keyframes: [],
      options: {
        duration: 250,
        easing: 'ease',
        ...definition.options,
        fill: 'both',
      },
      respectReducedMotion: definition.respectReducedMotion,
    });
    animation = current.animate(
      [
        {
          [axis === 'vertical' ? 'height' : 'width']: `${currentSize}px`,
          ...(definition.fade === false ? {} : { opacity: currentOpacity }),
        },
        {
          [axis === 'vertical' ? 'height' : 'width']: `${targetSize}px`,
          ...(definition.fade === false
            ? {}
            : { opacity: expanded ? visibleOpacity : '0' }),
        },
      ],
      options
    );
    const currentAnimation = animation;
    await waitForAnimation(currentAnimation, signal);
    if (token !== operation || signal?.aborted) return;
    currentAnimation.cancel();
    if (animation === currentAnimation) animation = null;
    applyBoundary(expanded);
  };

  return {
    enter: (signal) => play(true, signal),
    leave: (signal) => play(false, signal),
    setExpanded(expanded) {
      operation += 1;
      animation?.cancel();
      animation = null;
      applyBoundary(expanded);
    },
    cancel() {
      operation += 1;
      animation?.cancel();
      animation = null;
      restore();
      element = null;
      original = null;
    },
  };
}
