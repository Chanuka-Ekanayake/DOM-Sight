import type { HeavySubtree } from '../shared/types';

export interface HighlightOptions {
  durationMs?: number;
  log?: (...args: unknown[]) => void;
  doc?: Document;
}

const OUTLINE = '3px solid #e74c3c';

/**
 * Outlines the heaviest subtree on the page for a few seconds, scrolls it into view and logs
 * the element to the console so it can be inspected. Returns the element or null.
 */
export function highlightHeaviest(heaviest: HeavySubtree[], options: HighlightOptions = {}): Element | null {
  const durationMs = options.durationMs ?? 3000;
  const log = options.log ?? ((...args: unknown[]) => console.log(...args));
  const doc = options.doc ?? document;

  const target = heaviest[0];
  if (!target) return null;
  let el: Element | null = null;
  try {
    el = doc.querySelector(target.selector);
  } catch {
    return null;
  }
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return null;

  const previous = el.style.outline;
  const previousOffset = el.style.outlineOffset;
  el.style.outline = OUTLINE;
  el.style.outlineOffset = '-3px';
  el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  log(`[DOM Tracker] Heaviest subtree: ${target.selector} — ${target.nodes.toLocaleString('en-US')} nodes, depth ${target.depth}`, el);

  setTimeout(() => {
    el.style.outline = previous;
    el.style.outlineOffset = previousOffset;
  }, durationMs);

  return el;
}
