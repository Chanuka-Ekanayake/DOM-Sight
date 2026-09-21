import { createDomCountCollector } from './domCount';
import { OVERLAY_HOST_ID } from '../../shared/defaults';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('domCount collector', () => {
  it('emits the total element count on the first tick', () => {
    document.body.innerHTML = '<div><span></span><span></span></div>';
    const emits: number[] = [];
    const c = createDomCountCollector({ intervalMs: 500 });
    c.start((m) => emits.push(m.nodes as number));
    vi.advanceTimersByTime(500);
    // html, head, body, div, span, span
    expect(emits).toEqual([6]);
    c.stop();
  });

  it('does not count the HUD host element', () => {
    document.body.innerHTML = `<div id="${OVERLAY_HOST_ID}"></div><p></p>`;
    const emits: number[] = [];
    const c = createDomCountCollector({ intervalMs: 500 });
    c.start((m) => emits.push(m.nodes as number));
    vi.advanceTimersByTime(500);
    expect(emits).toEqual([4]); // html, head, body, p
    c.stop();
  });

  it('only emits again when the count changes', () => {
    document.body.innerHTML = '<div></div>';
    const emits: number[] = [];
    const c = createDomCountCollector({ intervalMs: 500 });
    c.start((m) => emits.push(m.nodes as number));
    vi.advanceTimersByTime(1500);
    expect(emits).toEqual([4]);
    document.body.appendChild(document.createElement('p'));
    vi.advanceTimersByTime(500);
    expect(emits).toEqual([4, 5]);
    c.stop();
  });

  it('stops emitting after stop()', () => {
    const emits: number[] = [];
    const c = createDomCountCollector({ intervalMs: 500 });
    c.start((m) => emits.push(m.nodes as number));
    vi.advanceTimersByTime(500);
    c.stop();
    document.body.appendChild(document.createElement('p'));
    vi.advanceTimersByTime(2000);
    expect(emits).toHaveLength(1);
  });
});
