import { onCleanup } from 'vanilla-signal';

export interface ElementRef<TElement extends Element> {
  readonly current: TElement | null;
  set: (element: TElement) => void;
  clear: () => void;
}

export function createElementRef<
  TElement extends Element,
>(): ElementRef<TElement> {
  let current: TElement | null = null;

  return {
    get current() {
      return current;
    },
    set(element) {
      current = element;
    },
    clear() {
      current = null;
    },
  };
}

export interface KeyedElementRefs<TKey, TElement extends Element> {
  readonly elements: ReadonlyMap<TKey, TElement>;
  get: (key: TKey) => TElement | undefined;
  bind: (key: TKey) => (element: TElement) => void;
  clear: () => void;
}

export function createKeyedElementRefs<
  TKey,
  TElement extends Element,
>(): KeyedElementRefs<TKey, TElement> {
  const elements = new Map<TKey, TElement>();

  return {
    elements,
    get(key) {
      return elements.get(key);
    },
    bind(key) {
      return (element) => {
        elements.set(key, element);
        onCleanup(() => {
          if (elements.get(key) === element) elements.delete(key);
        });
      };
    },
    clear() {
      elements.clear();
    },
  };
}
