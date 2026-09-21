import type { Collector } from './types';
import { OVERLAY_HOST_ID } from '../../shared/defaults';

export interface DomCountOptions {
  intervalMs?: number;
  doc?: Document;
}

/**
 * Cheap element count. `getElementsByTagName('*')` is a live collection whose length is
 * cached by the engine and invalidated on mutation, so reading it every tick is near-free.
 * Shadow roots are not traversed, so the HUD (inside a shadow root) contributes only its host,
 * which is subtracted here.
 */
export function createDomCountCollector(options: DomCountOptions = {}): Collector {
  const intervalMs = options.intervalMs ?? 500;
  const doc = options.doc ?? document;
  let timer: ReturnType<typeof setInterval> | undefined;
  let last: number | undefined;

  const all = doc.getElementsByTagName('*');

  const read = (): number => {
    const hostPresent = doc.getElementById(OVERLAY_HOST_ID) ? 1 : 0;
    return all.length - hostPresent;
  };

  return {
    start(emit) {
      last = undefined;
      timer = setInterval(() => {
        const nodes = read();
        if (nodes !== last) {
          last = nodes;
          emit({ nodes });
        }
      }, intervalMs);
    },
    stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    },
  };
}
