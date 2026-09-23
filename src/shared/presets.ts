import { DEFAULT_BUDGET } from './defaults';

export interface PagePreset {
  id: string;
  label: string;
  /** Node budget this page type should be measured against. */
  nodes: number;
  /** Shown as the dropdown tooltip: when to pick this one. */
  hint: string;
}

/** Selected in the dropdown when the budget was typed by hand and matches no preset. */
export const CUSTOM_PRESET_ID = 'custom';

/**
 * Starting budgets by page type, ascending. These are opening values to calibrate from, not
 * rules: the right budget is the count at which a given page stops feeling fast.
 */
export const PAGE_TYPE_PRESETS: PagePreset[] = [
  {
    id: 'public',
    label: 'Public / marketing page',
    nodes: DEFAULT_BUDGET.nodes,
    hint: 'Lighthouse default (1,500) — public pages where the performance score matters.',
  },
  {
    id: 'form',
    label: 'CRUD form / detail screen',
    nodes: 2500,
    hint: 'Typical internal form or record detail page.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard / widgets',
    nodes: 4000,
    hint: 'Several charts, cards or widgets on one screen.',
  },
  {
    id: 'grid',
    label: 'Paged data grid',
    nodes: 6000,
    hint: 'Server-paged table, roughly 25-100 rows per page.',
  },
  {
    id: 'virtualized',
    label: 'Virtualized / infinite grid',
    nodes: 10000,
    hint: 'Virtualized or infinite-scroll list. Above this, fix the rendering, not the budget.',
  },
];

/** The preset matching an exact node budget, or CUSTOM_PRESET_ID when it was typed by hand. */
export function presetIdForNodes(nodes: number): string {
  return PAGE_TYPE_PRESETS.find((p) => p.nodes === nodes)?.id ?? CUSTOM_PRESET_ID;
}
