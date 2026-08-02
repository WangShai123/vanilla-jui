// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import {
  Accordion,
  createAccordion,
  type AccordionItem,
} from '../src/components/accordion.ts';

let accordion: Accordion | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function items(): AccordionItem[] {
  return [
    { name: 'basic', title: 'Basic', content: 'Basic content' },
    { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
  ];
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  accordion?.destroy();
  accordion = null;
  document.body.innerHTML = '';
});

describe('Accordion', () => {
  it('builds default classes and stable data markers', () => {
    accordion = new Accordion(app(), {
      id: 'default-accordion',
      active: 'advanced',
      items: items(),
    }).build();

    expect(accordion.root?.classList.contains('j-accordion')).toBe(true);
    expect(accordion.root?.getAttribute('data-accordion')).toBe('root');
    expect(
      accordion.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(2);
    expect(
      accordion.root?.querySelectorAll('[data-accordion-panel]')
    ).toHaveLength(2);
    expect(accordion.dom.headers[1]?.getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(accordion.dom.panels[1]?.getAttribute('aria-hidden')).toBe('false');
    expect(accordion.dom.panels[0]?.hidden).toBe(true);
  });

  it('uses data markers for interaction when className is customized', async () => {
    const onChange = vi.fn();

    accordion = createAccordion(app(), {
      active: 'basic',
      collapsible: true,
      className: {
        root: 'qa-accordion',
        header: 'qa-header',
        title: 'qa-title',
        panel: 'qa-panel',
        content: 'qa-content',
      },
      items: items(),
      onChange,
    }).build();

    expect(accordion.root?.classList.contains('qa-accordion')).toBe(true);
    expect(accordion.root?.classList.contains('j-accordion')).toBe(false);
    expect(accordion.root?.querySelector('.accordion-header')).toBeNull();

    const title = accordion.root?.querySelector<HTMLElement>(
      '[data-accordion-title="advanced"]'
    );
    title?.click();
    await Promise.resolve();

    expect(accordion.state.current.name).toBe('advanced');
    expect(onChange).toHaveBeenCalledWith(
      1,
      'advanced',
      accordion.dom.headers[1],
      accordion.dom.panels[1],
      accordion
    );
  });

  it('supports collapsible and multiple active panels', async () => {
    accordion = createAccordion(app(), {
      active: ['basic'],
      collapsible: true,
      multiple: true,
      items: items(),
    }).build();

    await accordion.active('advanced');
    expect(accordion.state.activeNames).toEqual(['basic', 'advanced']);

    await accordion.active('basic');
    expect(accordion.state.activeNames).toEqual(['advanced']);
  });

  it('replaces items with setItems and keeps data selectors', () => {
    accordion = createAccordion(app(), {
      active: 'basic',
      items: items(),
    }).build();

    accordion.setItems(
      [{ name: 'next', title: 'Next', content: 'Next content' }],
      'next'
    );

    expect(
      accordion.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(1);
    expect(accordion.dom.headers[0]?.dataset.accordionHeader).toBe('next');
    expect(accordion.state.current.name).toBe('next');
  });
});
