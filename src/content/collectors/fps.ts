import type { Collector } from './types';

export interface FpsOptions {
  raf?: (cb: (t: number) => void) => number;
  caf?: (handle: number) => void;
}

/** Counts animation frames per 1 s window. When the tab is throttled this drops accordingly. */
export function createFpsCollector(options: FpsOptions = {}): Collector {
  const raf = options.raf ?? ((cb) => requestAnimationFrame(cb));
  const caf = options.caf ?? ((h) => cancelAnimationFrame(h));
  let handle: number | undefined;

  return {
    start(emit) {
      let windowStart: number | undefined;
      let frames = 0;
      const loop = (t: number) => {
        if (windowStart === undefined) windowStart = t;
        frames++;
        const elapsed = t - windowStart;
        if (elapsed >= 1000) {
          emit({ fps: Math.round(((frames - 1) * 1000) / elapsed) });
          windowStart = t;
          frames = 1;
        }
        handle = raf(loop);
      };
      handle = raf(loop);
    },
    stop() {
      if (handle !== undefined) caf(handle);
      handle = undefined;
    },
  };
}
