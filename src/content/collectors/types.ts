import type { Metrics } from '../../shared/types';

export type Emit = (partial: Partial<Metrics>) => void;

export interface Collector {
  start(emit: Emit): void;
  stop(): void;
}
