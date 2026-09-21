import { createMemoryCollector } from './memory';

describe('memory collector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits used and total heap in MB each tick', () => {
    const perf = { memory: { usedJSHeapSize: 50 * 1024 * 1024, totalJSHeapSize: 120 * 1024 * 1024 } };
    const emits: unknown[] = [];
    const c = createMemoryCollector({ perf, intervalMs: 1000 });
    c.start((m) => emits.push(m));
    vi.advanceTimersByTime(1000);
    expect(emits).toEqual([{ usedHeapMB: 50, totalHeapMB: 120 }]);
    c.stop();
  });

  it('rounds to one decimal place', () => {
    const perf = { memory: { usedJSHeapSize: 12.345 * 1024 * 1024, totalJSHeapSize: 100 * 1024 * 1024 } };
    const emits: { usedHeapMB?: number }[] = [];
    const c = createMemoryCollector({ perf, intervalMs: 1000 });
    c.start((m) => emits.push(m));
    vi.advanceTimersByTime(1000);
    expect(emits[0]?.usedHeapMB).toBe(12.3);
    c.stop();
  });

  it('emits undefined once and does not poll when performance.memory is unavailable', () => {
    const emits: unknown[] = [];
    const c = createMemoryCollector({ perf: {}, intervalMs: 1000 });
    c.start((m) => emits.push(m));
    vi.advanceTimersByTime(5000);
    expect(emits).toEqual([{ usedHeapMB: undefined, totalHeapMB: undefined }]);
    c.stop();
  });
});
