import type { Budget, Metrics, Snapshot, Status } from '../shared/types';
import type { Collector } from './collectors/types';
import type { Overlay } from './overlay/overlay';
import { HISTORY_SIZE } from '../shared/defaults';
import { evaluate } from './budget';
import { History } from './history';
import { buildSnapshot } from './report';

export interface TrackerOptions {
  budget: Budget;
  collectors: Collector[];
  overlay: Overlay;
  url: string;
  /** Called whenever nodes or status change (used for the toolbar badge). */
  onStatus?: (nodes: number | undefined, status: Status) => void;
}

export interface Tracker {
  start(): void;
  stop(): void;
  setBudget(budget: Budget): void;
  snapshot(): Snapshot;
  metrics(): Metrics;
  status(): Status;
}

/** Merges collector output, evaluates it against the budget and drives the overlay. */
export function createTracker(options: TrackerOptions): Tracker {
  let budget = options.budget;
  let metrics: Metrics = {};
  let status: Status = 'green';
  let active = false;
  let lastBadge: string | undefined;
  const history = new History(HISTORY_SIZE);

  const refresh = () => {
    const evaluation = evaluate(metrics, budget);
    status = evaluation.status;
    options.overlay.render({ metrics, evaluation, budget, history });
    const badge = `${metrics.nodes}|${status}`;
    if (badge !== lastBadge) {
      lastBadge = badge;
      options.onStatus?.(metrics.nodes, status);
    }
  };

  const onEmit = (partial: Partial<Metrics>) => {
    if (!active) return;
    if (partial.nodes !== undefined && partial.nodes !== metrics.nodes) history.push(partial.nodes);
    metrics = { ...metrics, ...partial };
    refresh();
  };

  return {
    start() {
      if (active) return;
      active = true;
      options.overlay.mount();
      for (const c of options.collectors) c.start(onEmit);
    },
    stop() {
      if (!active) return;
      active = false;
      for (const c of options.collectors) c.stop();
      options.overlay.unmount();
    },
    setBudget(next) {
      budget = next;
      if (active) refresh();
    },
    snapshot() {
      return buildSnapshot({ url: options.url, metrics, budget, status, history });
    },
    metrics: () => metrics,
    status: () => status,
  };
}
