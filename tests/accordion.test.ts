// @vitest-environment jsdom

import { flushSync } from 'vanilla-signal';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import { createAccordion } from '../src/components/accordion.ts';

type AccordionInstance = ReturnType<typeof createAccordion>;

let accordion: AccordionInstance | null = null;

function app(): HTMLElement {
  const element = document.querySelector<HTMLElement>('#app');
  if (!element) throw new Error('Missing #app fixture.');
  return element;
}

function items() {
  return [
    { name: 'basic', title: 'Basic', content: 'Basic content' },
    { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
  ];
}

function mount(instance: AccordionInstance): AccordionInstance {
  instance.build();
  if (!instance.dom.root) throw new Error('Accordion did not build a root.');
  app().appendChild(instance.dom.root);
  return instance;
}

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
  it('builds default classes and stable data markers without mounting', () => {
    accordion = createAccordion({
      id: 'default-accordion',
      active: 'advanced',
      items: items(),
    });

    expect(accordion.dom.root).toBeNull();

    accordion.build();

    expect(app().children).toHaveLength(0);
    expect(accordion.dom.root?.classList.contains('j-accordion')).toBe(true);
    expect(accordion.dom.root?.getAttribute('data-accordion')).toBe('root');
    expect(
      accordion.dom.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(2);
    expect(
      accordion.dom.root?.querySelectorAll('[data-accordion-panel]')
    ).toHaveLength(2);
    expect(accordion.dom.headers[1]?.getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(accordion.dom.panels[1]?.getAttribute('aria-hidden')).toBe('false');
    expect(accordion.dom.panels[0]?.hidden).toBe(true);
  });

  it('uses data markers for interaction when className is customized', async () => {
    const onChange = vi.fn();

    accordion = mount(
      createAccordion({
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
      })
    );

    expect(accordion.dom.root?.classList.contains('qa-accordion')).toBe(true);
    expect(accordion.dom.root?.classList.contains('j-accordion')).toBe(false);
    expect(accordion.dom.root?.querySelector('.accordion-header')).toBeNull();

    const title = accordion.dom.root?.querySelector<HTMLElement>(
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
    accordion = mount(
      createAccordion({
        active: ['basic'],
        collapsible: true,
        multiple: true,
        items: items(),
      })
    );

    await accordion.activate('advanced');
    expect(accordion.state.activeNames).toEqual(['basic', 'advanced']);

    await accordion.activate('basic');
    expect(accordion.state.activeNames).toEqual(['advanced']);
  });

  it('toggles from the keyboard and removes mounted DOM on destroy', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        collapsible: true,
        items: items(),
      })
    );

    accordion.dom.headers[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    await Promise.resolve();
    expect(accordion.state.activeNames).toEqual([]);

    const root = accordion.dom.root;
    accordion.destroy();
    accordion = null;
    expect(root?.parentNode).toBeNull();
    expect(app().children).toHaveLength(0);
  });

  it('renders automatically when state.items is replaced or mutated', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        items: items(),
      })
    );

    flushSync(() => {
      accordion!.state.items = [
        { name: 'next', title: 'Next', content: 'Next content' },
      ];
    });
    await tick();

    expect(
      accordion.dom.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(1);
    expect(accordion.dom.headers[0]?.dataset.accordionHeader).toBe('next');
    expect(accordion.state.current).toEqual({ index: null, name: null });

    flushSync(() => {
      accordion!.state.items.push({
        name: 'more',
        title: 'More',
        content: 'More content',
      });
    });
    await tick();

    expect(
      accordion.dom.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(2);
    expect(accordion.dom.root?.textContent).toContain('More content');

    await accordion.activate('more');
    expect(accordion.state.current).toEqual({ index: 1, name: 'more' });

    accordion.setState({
      items: [{ name: 'state', title: 'State', content: 'State content' }],
    });
    await tick();

    expect(
      accordion.dom.root?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(1);
    expect(accordion.dom.headers[0]?.dataset.accordionHeader).toBe('state');
    expect(accordion.state.current).toEqual({ index: null, name: null });
  });

  it('rejects invalid props and requires build before activation', async () => {
    expect(() => createAccordion({ items: [] })).toThrow(
      /expects a non-empty array/
    );
    expect(() =>
      createAccordion({
        items: [
          { name: 'same', title: 'One', content: 'One content' },
          { name: 'same', title: 'Two', content: 'Two content' },
        ],
      })
    ).toThrow(/must be unique/);

    accordion = createAccordion({
      items: items(),
    });

    await expect(accordion.activate('basic')).rejects.toThrow(
      /call build\(\) first/
    );
  });

  it('keeps one panel open when multiple mode is not collapsible', async () => {
    accordion = mount(
      createAccordion({
        active: ['basic'],
        multiple: true,
        items: items(),
      })
    );

    await accordion.activate('basic');
    expect(accordion.state.activeNames).toEqual(['basic']);
  });

  it('rejects duplicate names during reactive item updates', () => {
    accordion = mount(
      createAccordion({
        items: items(),
      })
    );

    expect(() =>
      accordion!.setState({
        items: [
          { name: 'same', title: 'One', content: 'One content' },
          { name: 'same', title: 'Two', content: 'Two content' },
        ],
      })
    ).toThrow(/must be unique/);
  });
});
