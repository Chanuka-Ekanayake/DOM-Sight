import type { Budget, Metrics, Snapshot, Status } from '../shared/types';
import type { History } from './history';

export interface SnapshotInput {
  url: string;
  metrics: Metrics;
  budget: Budget;
  status: Status;
  history: History;
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
  return {
    url: input.url,
    timestamp: new Date().toISOString(),
    budget: input.budget,
    metrics: input.metrics,
    status: input.status,
    heaviest: input.metrics.heaviest ?? [],
    history: input.history.values(),
  };
}


export function snapshotFileName(snapshot: Snapshot): string {
  let host = 'page';
  try {
    host = new URL(snapshot.url).host.replace(/[^a-z0-9.-]/gi, '_');
  } catch {
    /* keep fallback */
  }
  const stamp = snapshot.timestamp.replace(/[:.]/g, '-');
  return `dom-tracker_${host}_${stamp}.json`;
}
