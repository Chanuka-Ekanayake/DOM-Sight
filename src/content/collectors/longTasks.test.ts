import { createLongTasksCollector } from './longTasks';

type Entry = { startTime: number; duration: number };

describe('longTasks collector', () => {
  /** Fake PerformanceObserver we can feed entries into. */
  function fakePO(supported = true) {
    let callback: ((list: { getEntries(): Entry[] }) => void) | undefined;
    let disconnected = false;
    class PO {
      static supportedEntryTypes = supported ? ['longtask'] : [];
      constructor(cb: (list: { getEntries(): Entry[] }) => void) {
        callback = cb;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    }
    return {
      PO: PO as unknown as typeof PerformanceObserver,
      feed: (entries: Entry[]) => callback?.({ getEntries: () => entries }),
      wasDisconnected: () => disconnected,
    };
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts long tasks within the trailing 10 s window and reports the last duration', () => {
    const f = fakePO();
    let now = 0;
    const emits: { longTasks10s?: number; lastLongTaskMs?: number }[] = [];
    const c = createLongTasksCollector({ PerformanceObserverCtor: f.PO, now: () => now });
    c.start((m) => emits.push(m));
    f.feed([{ startTime: 0, duration: 80 }, { startTime: 500, duration: 120 }]);
    expect(emits.at(-1)).toEqual({ longTasks10s: 2, lastLongTaskMs: 120 });
    c.stop();
  });

  it('expires tasks older than 10 s on the next tick', () => {
    const f = fakePO();
    let now = 0;
    const emits: { longTasks10s?: number }[] = [];
    const c = createLongTasksCollector({ PerformanceObserverCtor: f.PO, now: () => now, tickMs: 1000 });
    c.start((m) => emits.push(m));
    f.feed([{ startTime: 0, duration: 80 }]);
    now = 11_000;
    vi.advanceTimersByTime(1000);
    expect(emits.at(-1)?.longTasks10s).toBe(0);
    c.stop();
  });

  it('emits undefined metrics once when longtask is unsupported', () => {
    const f = fakePO(false);
    const emits: unknown[] = [];
    const c = createLongTasksCollector({ PerformanceObserverCtor: f.PO });
    c.start((m) => emits.push(m));
    expect(emits).toEqual([{ longTasks10s: undefined, lastLongTaskMs: undefined }]);
    c.stop();
  });

  it('disconnects the observer on stop()', () => {
    const f = fakePO();
    const c = createLongTasksCollector({ PerformanceObserverCtor: f.PO });
    c.start(() => {});
    c.stop();
    expect(f.wasDisconnected()).toBe(true);
  });
});
