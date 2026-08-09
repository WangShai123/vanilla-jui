import { createRoot, onCleanup, untrack } from 'vanilla-signal';

export interface OwnedView<TElement extends Element> {
  element: TElement;
  dispose: () => void;
}

export interface OwnedViewOptions {
  removeOnDispose?: boolean;
}

/**
 * Creates one stable view inside a vanilla-signal owner.
 * Reactive accessors declared by the factory retain the owner, while the
 * factory itself is not turned into a replaceable dynamic region.
 */
export function createOwnedView<TElement extends Element>(
  factory: () => TElement,
  options: OwnedViewOptions = {}
): OwnedView<TElement> {
  let element!: TElement;
  const removeOnDispose = options.removeOnDispose !== false;

  const dispose = createRoot((disposeRoot) => {
    element = untrack(factory);
    if (removeOnDispose) onCleanup(() => element.remove());
    return disposeRoot;
  }) as () => void;

  return { element, dispose };
}
