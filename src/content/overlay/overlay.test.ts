import { createOverlay, type Overlay } from './overlay';
import { OVERLAY_HOST_ID, DEFAULT_BUDGET } from '../../shared/defaults';
import { History } from '../history';
import { evaluate } from '../budget';
import type { Metrics } from '../../shared/types';

function mountOverlay(over: Partial<Parameters<typeof createOverlay>[0]> = {}): Overlay {
  const o = createOverlay({ corner: 'bottom-right', collapsed: false, ...over });
  o.mount();
  return o;
}
const shadow = () => document.getElementById(OVERLAY_HOST_ID)!.shadowRoot!;
const text = (sel: string) => shadow().querySelector(sel)?.textContent?.trim();

beforeEach(() => {
  document.body.innerHTML = '';
  // jsdom has no canvas; the overlay must tolerate a null 2D context.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe('overlay mount', () => {
  it('adds exactly one host element with a shadow root', () => {
    const o = mountOverlay();
    const host = document.getElementById(OVERLAY_HOST_ID);
    expect(host).not.toBeNull();
    expect(host!.shadowRoot).not.toBeNull();
    expect(document.querySelectorAll(`#${OVERLAY_HOST_ID}`)).toHaveLength(1);
    o.unmount();
    expect(document.getElementById(OVERLAY_HOST_ID)).toBeNull();
  });

  it('applies the corner as a data attribute on the host', () => {
    const o = mountOverlay({ corner: 'top-left' });
    expect(document.getElementById(OVERLAY_HOST_ID)!.dataset.corner).toBe('top-left');
    o.setCorner('bottom-left');
    expect(document.getElementById(OVERLAY_HOST_ID)!.dataset.corner).toBe('bottom-left');
    o.unmount();
  });
});

describe('overlay render', () => {
  const metrics: Metrics = {
    nodes: 1240,
    maxDepth: 12,
    widestParent: { selector: 'div#grid > tbody', children: 420 },
    heaviest: [],
    fps: 58,
    longTasks10s: 3,
    lastLongTaskMs: 120,
    usedHeapMB: 51.2,
    totalHeapMB: 120,
  };

  it('renders the collapsed summary line', () => {
    const o = mountOverlay();
    o.render({ metrics, evaluation: evaluate(metrics, DEFAULT_BUDGET), budget: DEFAULT_BUDGET, history: new History(5) });
    expect(text('.summary')).toBe('DOM 1,240/1,500 · 58 fps');
    o.unmount();
  });

  it('renders every metric row against its budget', () => {
    const o = mountOverlay();
    o.render({ metrics, evaluation: evaluate(metrics, DEFAULT_BUDGET), budget: DEFAULT_BUDGET, history: new History(5) });
    expect(text('.v-nodes')).toBe('1,240 / 1,500 (83%)');
    expect(text('.v-depth')).toBe('12 / 32');
    expect(text('.v-widest')).toBe('div#grid > tbody ×420');
    expect(text('.v-fps')).toBe('58');
    expect(text('.v-long')).toBe('3 (last 120 ms)');
    expect(text('.v-heap')).toBe('51.2 / 120 MB');
    o.unmount();
  });

  it('shows n/a for unmeasured or unsupported metrics', () => {
    const o = mountOverlay();
    o.render({ metrics: {}, evaluation: evaluate({}, DEFAULT_BUDGET), budget: DEFAULT_BUDGET, history: new History(5) });
    expect(text('.summary')).toBe('DOM n/a/1,500 · n/a fps');
    expect(text('.v-heap')).toBe('n/a');
    expect(text('.v-long')).toBe('n/a');
    expect(text('.v-widest')).toBe('n/a');
    o.unmount();
  });

  it('reflects the status on the root and sizes the gauge fill by node ratio (capped at 100%)', () => {
    const o = mountOverlay();
    o.render({ metrics: { nodes: 3000 }, evaluation: evaluate({ nodes: 3000 }, DEFAULT_BUDGET), budget: DEFAULT_BUDGET, history: new History(5) });
    expect(shadow().querySelector('.hud')!.getAttribute('data-status')).toBe('red');
    expect((shadow().querySelector('.fill') as HTMLElement).style.width).toBe('100%');
    o.unmount();
  });
});

describe('overlay interaction', () => {
  it('collapses and expands via the toggle button and reports it', () => {
    const seen: boolean[] = [];
    const o = mountOverlay({ onToggleCollapse: (c) => seen.push(c) });
    const hud = () => shadow().querySelector('.hud')!;
    expect(hud().classList.contains('collapsed')).toBe(false);
    (shadow().querySelector('.toggle') as HTMLElement).click();
    expect(hud().classList.contains('collapsed')).toBe(true);
    (shadow().querySelector('.toggle') as HTMLElement).click();
    expect(hud().classList.contains('collapsed')).toBe(false);
    expect(seen).toEqual([true, false]);
    o.unmount();
  });

  it('starts collapsed when configured so', () => {
    const o = mountOverlay({ collapsed: true });
    expect(shadow().querySelector('.hud')!.classList.contains('collapsed')).toBe(true);
    o.unmount();
  });

  it('wires the action buttons to callbacks', () => {
    const calls: string[] = [];
    const o = mountOverlay({
      onHighlight: () => calls.push('highlight'),
      onSnapshot: () => calls.push('snapshot'),
      onHide: () => calls.push('hide'),
    });
    (shadow().querySelector('.btn-highlight') as HTMLElement).click();
    (shadow().querySelector('.btn-snapshot') as HTMLElement).click();
    (shadow().querySelector('.btn-hide') as HTMLElement).click();
    expect(calls).toEqual(['highlight', 'snapshot', 'hide']);
    o.unmount();
  });

  it('briefly shows a toast message', () => {
    vi.useFakeTimers();
    const o = mountOverlay();
    o.toast('Copied');
    expect(text('.toast')).toBe('Copied');
    vi.advanceTimersByTime(2000);
    expect(shadow().querySelector('.toast')!.classList.contains('show')).toBe(false);
    o.unmount();
    vi.useRealTimers();
  });
});
