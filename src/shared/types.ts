export type Status = 'green' | 'amber' | 'red';

/** Thresholds a page is measured against. All values are "red at or above". */
export interface Budget {
  /** Total element count (Lighthouse recommends < 1,500). */
  nodes: number;
  /** Maximum nesting depth (Lighthouse recommends <= 32). */
  maxDepth: number;
  /** Maximum children under one parent (Lighthouse recommends <= 60). */
  maxChildren: number;
  /** A main-thread task at or above this many ms counts as a long task. */
  longTaskMs: number;
}

export interface HeavySubtree {
  selector: string;
  nodes: number;
  depth: number;
}

export interface WidestParent {
  selector: string;
  children: number;
}

/** Everything the collectors produce. Fields are undefined until first measured or if unsupported. */
export interface Metrics {
  nodes?: number;
  maxDepth?: number;
  widestParent?: WidestParent;
  heaviest?: HeavySubtree[];
  fps?: number;
  longTasks10s?: number;
  lastLongTaskMs?: number;
  usedHeapMB?: number;
  totalHeapMB?: number;
}

export interface BudgetEvaluation {
  status: Status;
  /** 0..1+ ratio of nodes used vs budget (may exceed 1). */
  nodeRatio: number;
  flags: {
    nodes: Status;
    depth: Status;
    children: Status;
  };
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Per-origin settings stored in chrome.storage.sync. */
export interface SiteConfig {
  enabled: boolean;
  corner: Corner;
  collapsed: boolean;
  /** Set when the HUD was dragged away from its corner. */
  position?: { x: number; y: number };
  budget: Budget;
}

export interface Snapshot {
  url: string;
  timestamp: string;
  budget: Budget;
  metrics: Metrics;
  status: Status;
  heaviest: HeavySubtree[];
  history: number[];
}

/** Messages exchanged between popup / background / content script. */
export type Message =
  | { type: 'get-state' }
  | { type: 'get-snapshot' }
  | { type: 'badge'; nodes: number | undefined; status: Status }
  | { type: 'download-snapshot'; snapshot: Snapshot };

/** Reply to 'get-state' from the content script. */
export interface TrackerState {
  origin: string;
  enabled: boolean;
  nodes?: number;
  status: Status;
}
