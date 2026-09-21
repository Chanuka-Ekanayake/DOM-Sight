import type { Budget, SiteConfig } from './types';

/** Lighthouse-derived defaults for "Avoid an excessive DOM size". */
export const DEFAULT_BUDGET: Budget = {
  nodes: 1500,
  maxDepth: 32,
  maxChildren: 60,
  longTaskMs: 50,
};

/** Ratio of a budget at which the status turns amber (red is at 1.0). */
export const AMBER_RATIO = 0.6;

export const HISTORY_SIZE = 60;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  enabled: false,
  corner: 'bottom-right',
  collapsed: false,
  budget: DEFAULT_BUDGET,
};

export const OVERLAY_HOST_ID = 'dom-tracker-hud-host';
