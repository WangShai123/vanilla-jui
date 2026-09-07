import { describe, expect, it } from 'vite-plus/test';

import { resolveConfig, type ConfigSchema } from '../src/utilities/config.ts';
import { cloneConfigValue, mergeDeepConfig } from '../src/utilities/merge.ts';

describe('merge utilities', () => {
  it('clones plain object and array defaults without sharing nested state', () => {
    const source = {
      className: { root: 'root' },
      items: [{ id: 1 }],
    };
    const cloned = cloneConfigValue(source);

    cloned.className.root = 'changed';
    cloned.items[0].id = 2;

    expect(source.className.root).toBe('root');
    expect(source.items[0].id).toBe(1);
  });

  it('deep merges only plain objects and replaces arrays', () => {
    const merged = mergeDeepConfig(
      {
        root: 'root',
        ui: { button: 'button', icon: 'icon' },
        items: ['a'],
      },
      {
        ui: { button: 'custom-button' },
        items: ['b'],
      }
    );

    expect(merged).toEqual({
      root: 'root',
      ui: { button: 'custom-button', icon: 'icon' },
      items: ['b'],
    });
  });

  it('ignores unsafe keys during clone and merge', () => {
    const input = JSON.parse(
      '{"safe":"yes","__proto__":{"polluted":true},"constructor":{"polluted":true}}'
    ) as Record<string, unknown>;
    const merged = mergeDeepConfig({ root: 'root' }, input) as Record<
      string,
      unknown
    >;

    expect(merged).toEqual({ root: 'root', safe: 'yes' });
    expect({}).not.toHaveProperty('polluted');
  });
});

describe('resolveConfig', () => {
  it('resolves defaults and treats undefined as missing config', () => {
    const schema = {
      size: { default: 'md', type: 'string' },
      once: { default: true, type: 'boolean' },
    } satisfies ConfigSchema;

    const resolved = resolveConfig({ size: undefined }, schema, 'Test');

    expect(resolved.size).toBe('md');
    expect(resolved.once).toBe(true);
  });

  it('supports shallow object merge from schema instead of component code', () => {
    const schema = {
      className: {
        default: { root: 'root', button: 'button' },
        type: 'plainObject',
        merge: 'shallow',
      },
    } satisfies ConfigSchema;

    const resolved = resolveConfig(
      { className: { button: 'custom-button' } },
      schema,
      'Test'
    );

    expect(resolved.className).toEqual({
      root: 'root',
      button: 'custom-button',
    });
  });

  it('supports nested schema with deep object merge, normalize and validation', () => {
    const schema = {
      className: {
        default: {
          root: 'root',
          ui: { button: 'button', icon: 'icon' },
        },
        type: 'plainObject',
        merge: 'deep',
        schema: {
          root: { default: 'root', type: 'string' },
          ui: {
            default: { button: 'button', icon: 'icon' },
            type: 'plainObject',
            merge: 'shallow',
            schema: {
              button: {
                default: 'button',
                type: 'string',
                normalize: (value: unknown) =>
                  typeof value === 'string' ? value.trim() : value,
                nonEmpty: true,
              },
              icon: { default: 'icon', type: 'string' },
            },
          },
        },
      },
    } satisfies ConfigSchema;

    const resolved = resolveConfig(
      { className: { ui: { button: ' primary ' } } },
      schema,
      'Test'
    );

    expect(resolved.className).toEqual({
      root: 'root',
      ui: { button: 'primary', icon: 'icon' },
    });
    expect(() =>
      resolveConfig({ className: { ui: { button: ' ' } } }, schema, 'Test')
    ).toThrow(
      'Validator: Test.className.ui.button expects a non-empty string.'
    );
  });

  it('replaces arrays by default and supports default factories', () => {
    let count = 0;
    const schema = {
      items: {
        defaultFactory: () => {
          count += 1;
          return [{ id: count }];
        },
        type: 'array',
      },
    } satisfies ConfigSchema;

    const first = resolveConfig(undefined, schema, 'Test');
    const second = resolveConfig({ items: [{ id: 9 }] }, schema, 'Test');

    expect(first.items).toEqual([{ id: 1 }]);
    expect(second.items).toEqual([{ id: 9 }]);
  });

  it('runs normalize after all schema defaults are resolved', () => {
    const schema = {
      min: { default: 2, type: 'number' },
      max: { default: 8, type: 'number' },
      value: {
        default: 1,
        type: 'number',
        normalize: (value: unknown, { options }) =>
          Math.min(
            options.max as number,
            Math.max(options.min as number, value as number)
          ),
      },
    } satisfies ConfigSchema;

    const resolved = resolveConfig(
      { value: 99 } as Record<string, unknown>,
      schema,
      'Test'
    );

    expect(resolved.value).toBe(8);
  });

  it('validates nested schema after parent normalize runs', () => {
    const schema = {
      text: {
        default: { title: 'Title' },
        type: 'plainObject',
        merge: 'shallow',
        schema: {
          title: 'string',
        },
        normalize: () => ({ title: 1 }),
      },
    } satisfies ConfigSchema;

    expect(() => resolveConfig(undefined, schema, 'Test')).toThrow(
      'Validator: Test.text.title expects string, but got number.'
    );
  });
});
