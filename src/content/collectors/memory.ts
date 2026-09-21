import type { Collector } from './types';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}
export interface PerfWithMemory {
  memory?: MemoryInfo;
}

export interface MemoryOptions {
  perf?: PerfWithMemory;
  intervalMs?: number;
}

const MB = 1024 * 1024;
const toMB = (bytes: number) => Math.round((bytes / MB) * 10) / 10;

/** Reads the non-standard `performance.memory` (Chromium only). Emits undefined once if absent. */
export function createMemoryCollector(options: MemoryOptions = {}): Collector {
  const perf = options.perf ?? (performance as unknown as PerfWithMemory);
  const intervalMs = options.intervalMs ?? 1000;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    start(emit) {
      if (!perf.memory) {
        emit({ usedHeapMB: undefined, totalHeapMB: undefined });
        return;
      }
      timer = setInterval(() => {
        const m = perf.memory;
        if (!m) return;
        emit({ usedHeapMB: toMB(m.usedJSHeapSize), totalHeapMB: toMB(m.totalJSHeapSize) });
      }, intervalMs);
    },
    stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    },
  };
}
