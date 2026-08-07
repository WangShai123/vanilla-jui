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

function data() {
  return [
    { name: 'basic', title: 'Basic', content: 'Basic content' },
    { name: 'advanced', title: 'Advanced', content: 'Advanced content' },
  ];
}

function mount(instance: AccordionInstance): AccordionInstance {
  instance.build();
  if (!instance.element) throw new Error('Accordion did not build a root.');
  app().appendChild(instance.element);
  return instance;
}

function headers(instance: AccordionInstance): HTMLElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLElement>(
      '[data-accordion-header]'
    ) || []
  );
}

function panels(instance: AccordionInstance): HTMLElement[] {
  return Array.from(
    instance.element?.querySelectorAll<HTMLElement>('[data-accordion-panel]') ||
      []
  );
}

function controlledPanelAnimation(): {
  animation: Animation;
  resolve: () => void;
  cancel: ReturnType<typeof vi.fn>;
} {
  let resolve!: () => void;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  const cancel = vi.fn();
  return {
    animation: { finished, cancel } as unknown as Animation,
    resolve,
    cancel,
  };
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
      data: data(),
    });

    expect(accordion.element).toBeNull();

    accordion.build();

    expect(app().children).toHaveLength(0);
    expect(accordion.element?.classList.contains('j-accordion')).toBe(true);
    expect(accordion.element?.getAttribute('data-accordion')).toBe('root');
    expect(accordion.element?.dataset.direction).toBe('vertical');
    expect(
      accordion.element?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(2);
    expect(
      accordion.element?.querySelectorAll('[data-accordion-panel]')
    ).toHaveLength(2);
    expect(headers(accordion)[1]?.getAttribute('aria-expanded')).toBe('true');
    expect(panels(accordion)[1]?.getAttribute('aria-hidden')).toBe('false');
    expect(panels(accordion)[0]?.hasAttribute('hidden')).toBe(false);
    expect(panels(accordion)[0]?.style.height).toBe('0px');
    expect(panels(accordion)[0]?.style.visibility).toBe('hidden');
    expect(panels(accordion)[0]?.inert).toBe(true);
    expect(panels(accordion)[1]?.style.height).toBe('');
    expect(panels(accordion)[1]?.inert).toBe(false);
  });

  it('uses horizontal layout and width collapse for horizontal direction', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        direction: 'horizontal',
        data: data(),
      })
    );

    expect(accordion.element?.dataset.direction).toBe('horizontal');
    expect(panels(accordion)[0]?.style.width).toBe('');
    expect(panels(accordion)[0]?.style.height).toBe('');
    expect(panels(accordion)[1]?.style.width).toBe('0px');
    expect(panels(accordion)[1]?.style.height).toBe('');

    await accordion.activate('advanced');

    expect(panels(accordion)[0]?.style.width).toBe('0px');
    expect(panels(accordion)[1]?.style.width).toBe('');
  });

  it('animates measured panel height and settles both boundaries', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        collapsible: true,
        data: data(),
      })
    );

    const [basicPanel, advancedPanel] = panels(accordion);
    const basicAnimation = controlledPanelAnimation();
    const advancedAnimation = controlledPanelAnimation();
    const animateBasic = vi.fn(() => basicAnimation.animation);
    const animateAdvanced = vi.fn(() => advancedAnimation.animation);
    Object.defineProperties(basicPanel, {
      animate: { configurable: true, value: animateBasic },
      scrollHeight: { configurable: true, value: 60 },
    });
    Object.defineProperties(advancedPanel, {
      animate: { configurable: true, value: animateAdvanced },
      scrollHeight: { configurable: true, value: 80 },
    });

    const switching = accordion.activate('advanced');

    expect(basicPanel.dataset.state).toBe('closed');
    expect(basicPanel.inert).toBe(true);
    expect(advancedPanel.dataset.state).toBe('open');
    expect(advancedPanel.inert).toBe(false);
    expect(animateBasic).toHaveBeenCalledOnce();
    expect(animateAdvanced).toHaveBeenCalledWith(
      [
        { height: '0px', opacity: '0' },
        { height: '80px', opacity: '1' },
      ],
      expect.objectContaining({ duration: 250, easing: 'ease', fill: 'both' })
    );

    basicAnimation.resolve();
    advancedAnimation.resolve();
    await switching;

    expect(basicPanel.style.height).toBe('0px');
    expect(basicPanel.style.visibility).toBe('hidden');
    expect(advancedPanel.style.height).toBe('');
    expect(advancedPanel.style.visibility).toBe('');
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
        data: data(),
        onChange,
      })
    );

    expect(accordion.element?.classList.contains('qa-accordion')).toBe(true);
    expect(accordion.element?.classList.contains('j-accordion')).toBe(false);
    expect(accordion.element?.querySelector('.accordion-header')).toBeNull();

    const title = accordion.element?.querySelector<HTMLElement>(
      '[data-accordion-title="advanced"]'
    );
    title?.click();
    await Promise.resolve();

    expect(accordion.current.name).toBe('advanced');
    expect(onChange).toHaveBeenCalledWith(
      1,
      'advanced',
      headers(accordion)[1],
      panels(accordion)[1],
      accordion
    );
  });

  it('supports collapsible and multiple active panels', async () => {
    accordion = mount(
      createAccordion({
        active: ['basic'],
        collapsible: true,
        multiple: true,
        data: data(),
      })
    );

    await accordion.activate('advanced');
    expect(accordion.state.activeNames).toEqual(['basic', 'advanced']);

    await accordion.activate('basic');
    expect(accordion.state.activeNames).toEqual(['advanced']);
  });

  it('projects direct activeNames state changes through Motion', async () => {
    accordion = mount(createAccordion({ active: 'basic', data: data() }));

    accordion.setState({ activeNames: ['advanced'] });
    await tick();

    expect(panels(accordion)[0]?.style.height).toBe('0px');
    expect(panels(accordion)[0]?.inert).toBe(true);
    expect(panels(accordion)[1]?.style.height).toBe('');
    expect(panels(accordion)[1]?.inert).toBe(false);
  });

  it('toggles from the keyboard and removes mounted DOM on destroy', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        collapsible: true,
        data: data(),
      })
    );

    headers(accordion)[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    await Promise.resolve();
    expect(accordion.state.activeNames).toEqual([]);

    const root = accordion.element;
    accordion.destroy();
    accordion = null;
    expect(root?.parentNode).toBeNull();
    expect(app().children).toHaveLength(0);
  });

  it('renders automatically when state.data is replaced or mutated', async () => {
    accordion = mount(
      createAccordion({
        active: 'basic',
        data: data(),
      })
    );

    flushSync(() => {
      accordion!.state.data = [
        { name: 'next', title: 'Next', content: 'Next content' },
      ];
    });
    await tick();

    expect(
      accordion.element?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(1);
    expect(headers(accordion)[0]?.dataset.accordionHeader).toBe('next');
    expect(accordion.current).toEqual({ index: null, name: null });

    flushSync(() => {
      accordion!.state.data.push({
        name: 'more',
        title: 'More',
        content: 'More content',
      });
    });
    await tick();

    expect(
      accordion.element?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(2);
    expect(accordion.element?.textContent).toContain('More content');

    await accordion.activate('more');
    expect(accordion.current).toEqual({ index: 1, name: 'more' });

    accordion.setState({
      data: [{ name: 'state', title: 'State', content: 'State content' }],
    });
    await tick();

    expect(
      accordion.element?.querySelectorAll('[data-accordion-header]')
    ).toHaveLength(1);
    expect(headers(accordion)[0]?.dataset.accordionHeader).toBe('state');
    expect(accordion.current).toEqual({ index: null, name: null });
  });

  it('rejects invalid props and requires build before activation', async () => {
    expect(() => createAccordion({ data: [] })).toThrow(
      /expects a non-empty array/
    );
    expect(() =>
      createAccordion({
        data: [
          { name: 'same', title: 'One', content: 'One content' },
          { name: 'same', title: 'Two', content: 'Two content' },
        ],
      })
    ).toThrow(/must be unique/);
    expect(() =>
      createAccordion({ direction: 'diagonal' as never, data: data() })
    ).toThrow(/expects one of vertical, horizontal/);

    accordion = createAccordion({
      data: data(),
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
        data: data(),
      })
    );

    await accordion.activate('basic');
    expect(accordion.state.activeNames).toEqual(['basic']);
  });

  it('rejects duplicate names during reactive item updates', () => {
    accordion = mount(
      createAccordion({
        data: data(),
      })
    );

    expect(() =>
      accordion!.setState({
        data: [
          { name: 'same', title: 'One', content: 'One content' },
          { name: 'same', title: 'Two', content: 'Two content' },
        ],
      })
    ).toThrow(/must be unique/);
  });
});
