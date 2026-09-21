import { createTracker } from './tracker';
import { DEFAULT_BUDGET } from '../shared/defaults';
import type { Collector, Emit } from './collectors/types';
import type { Overlay, RenderInput } from './overlay/overlay';
import type { Status } from '../shared/types';

function fakeCollector() {
  let emit: Emit | undefined;
  let started = 0;
  let stopped = 0;
  const c: Collector = {
    start(e) {
      emit = e;
      started++;
    },
    stop() {
      stopped++;
    },
  };
  return { c, emit: (p: Parameters<Emit>[0]) => emit?.(p), started: () => started, stopped: () => stopped };
}

function fakeOverlay() {
  const renders: RenderInput[] = [];
  const toasts: string[] = [];
  let mounted = 0;
  let unmounted = 0;
  const o: Overlay = {
    mount: () => void mounted++,
    unmount: () => void unmounted++,
    render: (i) => void renders.push(i),
    setCorner: () => {},
    setPosition: () => {},
    toast: (m) => void toasts.push(m),
  };
  return { o, renders, toasts, mounted: () => mounted, unmounted: () => unmounted };
}

describe('tracker', () => {
  it('starts every collector and mounts the overlay on start, reverses on stop', () => {
    const a = fakeCollector();
    const b = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c, b.c], overlay: ov.o, url: 'x' });
    t.start();
    expect([a.started(), b.started(), ov.mounted()]).toEqual([1, 1, 1]);
    t.stop();
    expect([a.stopped(), b.stopped(), ov.unmounted()]).toEqual([1, 1, 1]);
  });

  it('merges partial metrics from collectors and renders the evaluated result', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c], overlay: ov.o, url: 'x' });
    t.start();
    a.emit({ nodes: 1000 });
    a.emit({ fps: 60 });
    const last = ov.renders.at(-1)!;
    expect(last.metrics).toEqual({ nodes: 1000, fps: 60 });
    expect(last.evaluation.status).toBe('amber');
    expect(last.budget).toBe(DEFAULT_BUDGET);
  });

  it('records node counts in history only when they change', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c], overlay: ov.o, url: 'x' });
    t.start();
    a.emit({ nodes: 10 });
    a.emit({ fps: 1 });
    a.emit({ nodes: 12 });
    expect(ov.renders.at(-1)!.history.values()).toEqual([10, 12]);
  });

  it('notifies status changes for the badge with nodes and status', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const seen: [number | undefined, Status][] = [];
    const t = createTracker({
      budget: DEFAULT_BUDGET,
      collectors: [a.c],
      overlay: ov.o,
      url: 'x',
      onStatus: (nodes, status) => seen.push([nodes, status]),
    });
    t.start();
    a.emit({ nodes: 100 });
    a.emit({ nodes: 100 });
    a.emit({ nodes: 1600 });
    expect(seen).toEqual([
      [100, 'green'],
      [1600, 'red'],
    ]);
  });

  it('re-evaluates against a new budget immediately', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c], overlay: ov.o, url: 'x' });
    t.start();
    a.emit({ nodes: 1000 });
    t.setBudget({ ...DEFAULT_BUDGET, nodes: 10_000 });
    expect(ov.renders.at(-1)!.evaluation.status).toBe('green');
    expect(ov.renders.at(-1)!.budget.nodes).toBe(10_000);
  });

  it('produces a snapshot of the current state', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c], overlay: ov.o, url: 'https://s.test/p' });
    t.start();
    a.emit({ nodes: 2000, heaviest: [{ selector: 'tbody', nodes: 1900, depth: 2 }] });
    const s = t.snapshot();
    expect(s.url).toBe('https://s.test/p');
    expect(s.status).toBe('red');
    expect(s.heaviest[0]!.selector).toBe('tbody');
    expect(s.history).toEqual([2000]);
  });

  it('ignores collector emissions after stop()', () => {
    const a = fakeCollector();
    const ov = fakeOverlay();
    const t = createTracker({ budget: DEFAULT_BUDGET, collectors: [a.c], overlay: ov.o, url: 'x' });
    t.start();
    t.stop();
    a.emit({ nodes: 5 });
    expect(ov.renders).toHaveLength(0);
  });
});
