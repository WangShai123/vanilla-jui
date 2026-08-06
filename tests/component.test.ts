import { describe, expect, it } from 'vite-plus/test';

import Component from '../src/core/Component.ts';

interface ProbeProps extends Record<string, unknown> {
  id: string;
  label?: string;
}

interface ProbeState extends Record<string, unknown> {
  count: number;
}

class ProbeComponent extends Component<ProbeProps, ProbeState> {
  static events: string[] = [];

  override emit(event: string, ...args: unknown[]): this {
    ProbeComponent.events.push(event);
    return super.emit(event, ...args);
  }

  protected override onReCreate(
    propsPatch: Partial<ProbeProps> | null | undefined,
    options: { force: boolean }
  ): void {
    ProbeComponent.events.push(
      `onReCreate:${String(propsPatch?.label)}:${String(options.force)}`
    );
  }
}

describe('Component', () => {
  it('reCreate creates a new instance and destroys the previous instance', () => {
    ProbeComponent.events = [];
    const component = new ProbeComponent({ id: 'first', label: 'Initial' });

    const next = component.reCreate({ label: 'Next' }, { force: true });

    expect(next).toBeInstanceOf(ProbeComponent);
    expect(next).not.toBe(component);
    expect(next.props).toEqual({ id: 'first', label: 'Next' });
    expect(component.runtime.destroyed).toBe(true);
    expect(component.state).toBeNull();
    expect(next.runtime.destroyed).toBe(false);
    expect(ProbeComponent.events).toEqual([
      'beforeReCreate',
      'onReCreate:Next:true',
      'destroy',
      'afterReCreate',
    ]);
  });

  it('does not expose update as the reCreate alias', () => {
    const component = new ProbeComponent({ id: 'strict' });

    expect('update' in component).toBe(false);
  });
});
