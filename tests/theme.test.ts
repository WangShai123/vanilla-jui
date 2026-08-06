// @vitest-environment jsdom

import { createStorage } from 'vanilla-create-storage';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { createTheme } from '../src/primitives/theme.ts';

let theme: ReturnType<typeof createTheme> | null = null;
const themeStorage = createStorage({
  driver: 'cookie',
  codec: 'json',
  driverOptions: {
    path: '/',
    sameSite: 'lax',
  },
});

function waitStorage(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.className = '';
  document.cookie = 'ui-theme=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
});

afterEach(() => {
  theme?.destroy();
  theme = null;
  document.body.innerHTML = '';
  document.documentElement.className = '';
  document.cookie = 'ui-theme=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
});

describe('Theme', () => {
  it('creates default panel classes and stable data markers', () => {
    theme = createTheme({ theme: 'blue' });
    const panel = theme.createPanel();
    document.body.appendChild(panel);

    expect(panel.classList.contains('j-theme-palette')).toBe(true);
    expect(panel.getAttribute('data-theme-palette')).toBe('root');
    expect(panel.querySelectorAll('[data-theme-group]')).toHaveLength(5);
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="blue"]')
        ?.classList.contains('is-active')
    ).toBe(true);
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="blue"]')
        ?.getAttribute('aria-selected')
    ).toBe('true');
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="indigo"]')
        ?.hasAttribute('aria-selected')
    ).toBe(false);
  });

  it('uses data markers for interaction when className is customized', () => {
    theme = createTheme({
      theme: 'indigo',
      className: {
        panel: 'qa-theme-panel',
        item: 'qa-theme-item',
        items: 'qa-theme-items',
        button: 'qa-theme-button',
        active: 'qa-active',
      },
    });
    const panel = theme.createPanel();
    document.body.appendChild(panel);

    expect(panel.classList.contains('qa-theme-panel')).toBe(true);
    expect(panel.classList.contains('j-theme-palette')).toBe(false);
    expect(panel.querySelector('.palette-item')).toBeNull();

    const blue = panel.querySelector<HTMLButtonElement>(
      '[data-theme-button="theme"][data-theme-value="blue"]'
    );
    const indigo = panel.querySelector<HTMLButtonElement>(
      '[data-theme-button="theme"][data-theme-value="indigo"]'
    );
    blue?.click();

    expect(theme.props.theme).toBe('blue');
    expect(document.documentElement.classList.contains('j-theme-blue')).toBe(
      true
    );
    expect(blue?.classList.contains('qa-active')).toBe(true);
    expect(blue?.getAttribute('aria-selected')).toBe('true');
    expect(indigo?.classList.contains('qa-active')).toBe(false);
    expect(indigo?.hasAttribute('aria-selected')).toBe(false);
  });

  it('setConfig saves config and syncs active buttons without changing html class', async () => {
    theme = createTheme({ theme: 'indigo' });
    const panel = theme.createPanel();
    document.body.appendChild(panel);

    theme.setConfig({ theme: 'tomato' });
    await waitStorage();
    const stored = await themeStorage.get<Record<string, unknown>>('ui-theme');

    expect(theme.props.theme).toBe('tomato');
    expect(stored).toMatchObject({ theme: 'tomato' });
    expect(document.documentElement.classList.contains('j-theme-tomato')).toBe(
      false
    );
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="tomato"]')
        ?.classList.contains('is-active')
    ).toBe(true);
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="tomato"]')
        ?.getAttribute('aria-selected')
    ).toBe('true');
    expect(
      panel
        .querySelector('[data-theme-button="theme"][data-theme-value="indigo"]')
        ?.hasAttribute('aria-selected')
    ).toBe(false);
  });

  it('destroy unbinds document interaction', () => {
    theme = createTheme({ theme: 'indigo' });
    const panel = theme.createPanel();
    document.body.appendChild(panel);
    theme.destroy();

    panel
      .querySelector<HTMLButtonElement>(
        '[data-theme-button="theme"][data-theme-value="blue"]'
      )
      ?.click();

    expect(theme.props.theme).toBe('indigo');
  });
});
