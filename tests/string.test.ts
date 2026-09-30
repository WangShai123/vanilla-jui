import { describe, expect, it } from 'vite-plus/test';

import { removeSpaces } from '../src/utilities/string.ts';

describe('string utilities', () => {
  it('removes leading, trailing and inner whitespace', () => {
    expect(removeSpaces(' demo \t user \n ')).toBe('demouser');
  });

  it('returns an empty string for nullish values', () => {
    expect(removeSpaces(null)).toBe('');
    expect(removeSpaces(undefined)).toBe('');
  });
});
