import { createFpsCollector } from './fps';

describe('fps collector', () => {
  /** Manual rAF: we decide when frames happen and at what timestamp. */
  function fakeRaf() {
    let queued: ((t: number) => void) | undefined;
    return {
      raf: (cb: (t: number) => void) => {
        queued = cb;
        return 1;
      },
      caf: () => {
        queued = undefined;
      },
      frame(t: number) {
        const cb = queued;
        queued = undefined;
        cb?.(t);
      },
      hasQueued: () => queued !== undefined,
    };
  }

  it('emits frames counted over each one-second window', () => {
    const r = fakeRaf();
    const emits: number[] = [];
    const c = createFpsCollector({ raf: r.raf, caf: r.caf });
    c.start((m) => emits.push(m.fps as number));
    for (let i = 0; i <= 60; i++) r.frame(Math.round((i * 1000) / 60));
    expect(emits).toEqual([60]);
    c.stop();
  });

  it('reports a low rate when frames are sparse', () => {
    const r = fakeRaf();
    const emits: number[] = [];
    const c = createFpsCollector({ raf: r.raf, caf: r.caf });
    c.start((m) => emits.push(m.fps as number));
    [0, 200, 400, 600, 800, 1000].forEach((t) => r.frame(t));
    expect(emits).toEqual([5]);
    c.stop();
  });

  it('cancels the loop on stop()', () => {
    const r = fakeRaf();
    const c = createFpsCollector({ raf: r.raf, caf: r.caf });
    c.start(() => {});
    expect(r.hasQueued()).toBe(true);
    c.stop();
    expect(r.hasQueued()).toBe(false);
  });
});
