import type { Collector } from './types';

export interface LongTasksOptions {
  PerformanceObserverCtor?: typeof PerformanceObserver;
  now?: () => number;
  /** How often the trailing window is re-evaluated so old tasks expire. */
  tickMs?: number;
  windowMs?: number;
}

/** Tracks main-thread tasks >= 50 ms (the platform's own threshold) over a trailing window. */
export function createLongTasksCollector(options: LongTasksOptions = {}): Collector {
  const PO = options.PerformanceObserverCtor ?? (typeof PerformanceObserver !== 'undefined' ? PerformanceObserver : undefined);
  const now = options.now ?? (() => performance.now());
  const tickMs = options.tickMs ?? 1000;
  const windowMs = options.windowMs ?? 10_000;

  let observer: PerformanceObserver | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  /** Wall-clock (per `now`) at which each long task was observed. */
  let seenAt: number[] = [];
  let lastMs: number | undefined;

  return {
    start(emit) {
      const supported = PO?.supportedEntryTypes?.includes('longtask') ?? false;
      if (!PO || !supported) {
        emit({ longTasks10s: undefined, lastLongTaskMs: undefined });
        return;
      }
      const prune = () => {
        const cutoff = now() - windowMs;
        seenAt = seenAt.filter((t) => t >= cutoff);
      };
      const report = () => emit({ longTasks10s: seenAt.length, lastLongTaskMs: lastMs });

      observer = new PO((list) => {
        const t = now();
        for (const entry of list.getEntries()) {
          seenAt.push(t);
          lastMs = Math.round(entry.duration);
        }
        prune();
        report();
      });
      observer.observe({ type: 'longtask', buffered: false });
      timer = setInterval(() => {
        const before = seenAt.length;
        prune();
        if (seenAt.length !== before) report();
      }, tickMs);
      report();
    },
    stop() {
      observer?.disconnect();
      observer = undefined;
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      seenAt = [];
      lastMs = undefined;
    },
  };
}
