import { describe, expect, it } from 'vitest';

import { addIcons, icon, iconMarkup } from '../../src/components/icons.js';

describe('icons', () => {
  it('requires DOM for node rendering', () => {
    expect(() => icon('info')).toThrow('DOM render environment is required');
  });

  it('keeps string markup available for legacy innerHTML usage', () => {
    const markup = iconMarkup('success');

    expect(markup).toContain('<svg');
    expect(markup).toContain('<path');
    expect(markup).toContain('</svg>');
  });

  it('registers custom SVG fragments', () => {
    addIcons({
      custom: '<circle cx="12" cy="12" r="4"></circle>',
    });

    expect(iconMarkup('custom')).toContain('<circle');
  });
});
