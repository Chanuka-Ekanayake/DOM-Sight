import type { Budget, BudgetEvaluation, Metrics, Status } from '../shared/types';
import { AMBER_RATIO } from '../shared/defaults';

const RANK: Record<Status, number> = { green: 0, amber: 1, red: 2 };

function rate(value: number | undefined, limit: number): Status {
  if (value === undefined) return 'green';
  const ratio = value / limit;
  if (ratio >= 1) return 'red';
  if (ratio >= AMBER_RATIO) return 'amber';
  return 'green';
}

export function worst(...statuses: Status[]): Status {
  return statuses.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'green');
}

export function evaluate(metrics: Metrics, budget: Budget): BudgetEvaluation {
  const flags = {
    nodes: rate(metrics.nodes, budget.nodes),
    depth: rate(metrics.maxDepth, budget.maxDepth),
    children: rate(metrics.widestParent?.children, budget.maxChildren),
  };
  return {
    status: worst(flags.nodes, flags.depth, flags.children),
    nodeRatio: (metrics.nodes ?? 0) / budget.nodes,
    flags,
  };
}
