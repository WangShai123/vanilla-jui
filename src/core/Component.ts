import { flushSync } from 'vanilla-signal';

import { isPlainObject } from '../utilities/object.ts';
import { createOwnedView } from './view.ts';

export type ComponentProps = Record<string, unknown>;
export type ComponentState = Record<string, unknown>;
export type ComponentCleanup =
  | void
  | (() => void)
  | {
      destroy: () => void;
    };
export type ComponentPluginOptions = Record<string, unknown> | undefined;

export interface ComponentRuntime {
  built: boolean;
  mounted: boolean;
  destroyed: boolean;
}

export type ComponentLifecycleEvent = 'build' | 'mount' | 'unmount' | 'destroy';
export type ComponentListener = (...args: unknown[]) => void;

export interface ComponentController<
  TProps extends ComponentProps = ComponentProps,
  TState extends ComponentState = ComponentState,
  TElement extends Element = HTMLElement,
> {
  readonly props: TProps;
  readonly state: TState;
  readonly runtime: ComponentRuntime;
  readonly element: TElement | null;
  build(): this;
  mount(container: Element | DocumentFragment): this;
  unmount(): this;
  setState(patch?: Partial<TState> | null): this;
  setState<TKey extends keyof TState>(key: TKey, value: TState[TKey]): this;
  own(cleanup: ComponentCleanup): this;
  use(
    plugin: ComponentPlugin<this> | null | undefined,
    options?: ComponentPluginOptions
  ): this;
  on(event: string, listener: ComponentListener): this;
  off(event: string, listener: ComponentListener): this;
  emit(event: string, ...args: unknown[]): this;
  destroy(): void;
}

export type ComponentPlugin<TComponent = ComponentController> =
  | ((
      component: TComponent,
      options?: ComponentPluginOptions
    ) => ComponentCleanup)
  | {
      install: (
        component: TComponent,
        options?: ComponentPluginOptions
      ) => ComponentCleanup;
    };

export interface ComponentContext<
  TProps extends ComponentProps,
  TState extends ComponentState,
  TElement extends Element,
> {
  readonly props: TProps;
  readonly state: TState;
  readonly runtime: ComponentRuntime;
  readonly element: TElement | null;
  own: (cleanup: ComponentCleanup) => void;
  assertActive: (operation: string) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

export interface ComponentDefinition<
  TProps extends ComponentProps,
  TState extends ComponentState,
  TElement extends Element,
  TActions extends object,
> {
  name: string;
  ownsElement?: boolean;
  props: TProps;
  state: TState;
  view: (context: ComponentContext<TProps, TState, TElement>) => TElement;
  actions?: TActions;
  normalizeStatePatch?: (patch: Partial<TState>) => Partial<TState>;
  validateStatePatch?: (patch: Partial<TState>, state: TState) => void;
  onBuild?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onMount?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onUnmount?: (context: ComponentContext<TProps, TState, TElement>) => void;
  onDestroy?: (context: ComponentContext<TProps, TState, TElement>) => void;
}

export type FunctionalComponent<
  TProps extends ComponentProps,
  TState extends ComponentState,
  TElement extends Element,
  TActions extends object = object,
> = ComponentController<TProps, TState, TElement> & TActions;

const globalPlugins = new Map<string, ComponentPlugin>();

export function useComponentPlugin(
  name: string,
  plugin: ComponentPlugin | null | undefined
): void {
  if (!name || !plugin) return;
  globalPlugins.set(name, plugin);
}

export function removeComponentPlugin(name: string): void {
  globalPlugins.delete(name);
}

function runCleanup(cleanup: ComponentCleanup): void {
  if (typeof cleanup === 'function') cleanup();
  else if (cleanup && typeof cleanup.destroy === 'function') cleanup.destroy();
}

export function defineComponent<
  TProps extends ComponentProps,
  TState extends ComponentState,
  TElement extends Element,
  TActions extends object = object,
>(
  definition: ComponentDefinition<TProps, TState, TElement, TActions>
): FunctionalComponent<TProps, TState, TElement, TActions> {
  const runtime: ComponentRuntime = {
    built: false,
    mounted: false,
    destroyed: false,
  };
  const listeners = new Map<string, Set<ComponentListener>>();
  const resources = new Set<ComponentCleanup>();
  const plugins = new Map<ComponentPlugin<unknown>, ComponentCleanup>();
  let element: TElement | null = null;
  let disposeView: (() => void) | null = null;
  let component: FunctionalComponent<TProps, TState, TElement, TActions>;

  const assertActive = (operation: string): void => {
    if (runtime.destroyed) {
      throw new Error(`${definition.name}.${operation}: instance destroyed`);
    }
  };

  const emit = (event: string, ...args: unknown[]): void => {
    for (const listener of listeners.get(event) || []) {
      try {
        listener(...args);
      } catch {
        // Listener failures must not interrupt the component lifecycle.
      }
    }
  };

  const context: ComponentContext<TProps, TState, TElement> = {
    props: definition.props,
    state: definition.state,
    runtime,
    get element() {
      return element;
    },
    own(cleanup) {
      if (cleanup) resources.add(cleanup);
    },
    assertActive,
    emit,
  };

  const controller: ComponentController<TProps, TState, TElement> = {
    props: definition.props,
    state: definition.state,
    runtime,
    get element() {
      return element;
    },
    build() {
      assertActive('build');
      if (runtime.built) return component;

      const ownedView = createOwnedView(() => definition.view(context), {
        removeOnDispose: definition.ownsElement,
      });
      element = ownedView.element;
      disposeView = ownedView.dispose;
      runtime.built = true;
      definition.onBuild?.(context);
      emit('build', component);
      return component;
    },
    mount(container) {
      assertActive('mount');
      if (!runtime.built) component.build();
      if (!element) {
        throw new Error(
          `${definition.name}.mount: view did not create an element.`
        );
      }
      if (element.parentNode !== container) container.appendChild(element);
      runtime.mounted = true;
      definition.onMount?.(context);
      emit('mount', component, container);
      return component;
    },
    unmount() {
      assertActive('unmount');
      if (!runtime.mounted && !element?.parentNode) return component;
      definition.onUnmount?.(context);
      if (definition.ownsElement !== false) element?.remove();
      runtime.mounted = false;
      emit('unmount', component);
      return component;
    },
    setState(
      keyOrPatch: Partial<TState> | keyof TState | null | undefined = {},
      value?: unknown
    ) {
      assertActive('setState');
      const patch =
        typeof keyOrPatch === 'string' && arguments.length > 1
          ? { [keyOrPatch]: value }
          : keyOrPatch;
      if (!isPlainObject(patch)) {
        throw new Error(
          `${definition.name}.setState: expects a plain object patch.`
        );
      }

      const normalized = definition.normalizeStatePatch
        ? definition.normalizeStatePatch(patch as Partial<TState>)
        : (patch as Partial<TState>);
      if (!isPlainObject(normalized)) {
        throw new Error(
          `${definition.name}.setState: expects a plain object patch.`
        );
      }

      if (definition.validateStatePatch) {
        definition.validateStatePatch(normalized, definition.state);
      } else {
        for (const key of Object.keys(normalized)) {
          if (!Object.hasOwn(definition.state, key)) {
            throw new Error(
              `${definition.name}.setState: "${key}" is not a supported state key.`
            );
          }
        }
      }

      flushSync(() => {
        Object.assign(definition.state, normalized);
      });
      return component;
    },
    own(cleanup) {
      if (cleanup) resources.add(cleanup);
      return component;
    },
    use(plugin, options) {
      if (!plugin) return component;
      const cleanup =
        typeof plugin === 'function'
          ? plugin(component, options)
          : plugin.install(component, options);
      plugins.set(plugin as ComponentPlugin<unknown>, cleanup);
      return component;
    },
    on(event, listener) {
      if (!event || typeof listener !== 'function') return component;
      let eventListeners = listeners.get(event);
      if (!eventListeners) {
        eventListeners = new Set();
        listeners.set(event, eventListeners);
      }
      eventListeners.add(listener);
      return component;
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
      return component;
    },
    emit(event, ...args) {
      emit(event, ...args);
      return component;
    },
    destroy() {
      if (runtime.destroyed) return;
      runtime.destroyed = true;
      definition.onDestroy?.(context);
      emit('destroy', component);

      for (const cleanup of resources) {
        try {
          runCleanup(cleanup);
        } catch {
          // Cleanup is best-effort; remaining resources must still be released.
        }
      }
      resources.clear();

      for (const cleanup of plugins.values()) {
        try {
          runCleanup(cleanup);
        } catch {
          // Plugin cleanup must not prevent view disposal.
        }
      }
      plugins.clear();

      disposeView?.();
      disposeView = null;
      if (definition.ownsElement !== false) element?.remove();
      element = null;
      runtime.built = false;
      runtime.mounted = false;
      listeners.clear();
    },
  };

  component = Object.assign(
    controller,
    definition.actions || {}
  ) as FunctionalComponent<TProps, TState, TElement, TActions>;

  for (const plugin of globalPlugins.values()) {
    component.use(plugin as ComponentPlugin<typeof component>);
  }

  return component;
}
