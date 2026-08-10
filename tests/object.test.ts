import { describe, expect, it } from 'vite-plus/test';

import { isPlainObject } from '../src/utilities/object.ts';

class Example {}

describe('isPlainObject', () => {
  it('accepts object literals and null-prototype records', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ nested: true })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('rejects arrays, functions and class instances', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(new Example())).toBe(false);
    expect(isPlainObject(null)).toBe(false);
  });
});
