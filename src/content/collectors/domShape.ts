import type { HeavySubtree, WidestParent } from '../../shared/types';
import type { Collector } from './types';
import { OVERLAY_HOST_ID } from '../../shared/defaults';

export interface ShapeResult {
  maxDepth: number;
  widestParent: WidestParent;
  heaviest: HeavySubtree[];
}

/** Minimum descendants for a subtree to be reported as a hub. */
const MIN_HUB_NODES = 20;
/** A subtree is a "hub" (mass fans out here) when no single child holds more than this share of it. */
const MAX_CHILD_SHARE = 0.8;
const TOP_N = 5;
/** Elements visited between generator yields. */
const YIELD_EVERY = 200;
const SELECTOR_LEVELS = 3;

/** Short, human-readable locator: `div#grid > table > tbody`. Stops at the first id or at <html>. */
export function buildSelector(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && parts.length < SELECTOR_LEVELS) {
    const tag = cur.tagName.toLowerCase();
    if (tag === 'html') {
      if (parts.length === 0) parts.unshift(tag);
      break;
    }
    if (cur.id) {
      parts.unshift(`${tag}#${cur.id}`);
      break;
    }
    const classes = Array.from(cur.classList).slice(0, 2);
    parts.unshift(classes.length ? `${tag}.${classes.join('.')}` : tag);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

interface Frame {
  el: Element;
  depth: number;
  idx: number;
  descendants: number;
  height: number;
  largestChild: number;
}

function isHost(el: Element): boolean {
  return el.id === OVERLAY_HOST_ID;
}

function isRootish(el: Element): boolean {
  const t = el.tagName;
  return t === 'HTML' || t === 'BODY' || t === 'HEAD';
}

/**
 * Iterative post-order walk that yields every YIELD_EVERY elements so the caller can
 * spread the work across idle callbacks. Drive with `.next()` until `done`.
 */
export function* shapeWalker(root: Element): Generator<void, ShapeResult, void> {
  const stack: Frame[] = [{ el: root, depth: 1, idx: 0, descendants: 0, height: 0, largestChild: 0 }];
  let maxDepth = 0;
  let widest: WidestParent = { selector: buildSelector(root), children: root.childElementCount };
  const hubs: HeavySubtree[] = [];
  let visited = 0;

  while (stack.length) {
    const top = stack[stack.length - 1] as Frame;
    const children = top.el.children;
    if (top.idx < children.length) {
      const child = children[top.idx++] as Element;
      if (isHost(child)) continue;
      stack.push({ el: child, depth: top.depth + 1, idx: 0, descendants: 0, height: 0, largestChild: 0 });
      if (++visited % YIELD_EVERY === 0) yield;
      continue;
    }

    stack.pop();
    const { el, depth, descendants, height, largestChild } = top;
    if (depth > maxDepth) maxDepth = depth;
    if (el.childElementCount > widest.children) widest = { selector: buildSelector(el), children: el.childElementCount };
    if (descendants >= MIN_HUB_NODES && !isRootish(el) && largestChild / descendants <= MAX_CHILD_SHARE) {
      insertTop(hubs, { selector: buildSelector(el), nodes: descendants, depth: height });
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      const size = descendants + 1;
      parent.descendants += size;
      if (height + 1 > parent.height) parent.height = height + 1;
      if (size > parent.largestChild) parent.largestChild = size;
    }
  }

  return { maxDepth, widestParent: widest, heaviest: hubs };
}

function insertTop(list: HeavySubtree[], item: HeavySubtree): void {
  let i = list.findIndex((h) => item.nodes > h.nodes);
  if (i === -1) i = list.length;
  if (i >= TOP_N) return;
  list.splice(i, 0, item);
  if (list.length > TOP_N) list.length = TOP_N;
}

/** Synchronous convenience: drains the walker in one go. */
export function computeShape(root: Element): ShapeResult {
  const gen = shapeWalker(root);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}


// ---------------------------------------------------------------------------------------------
// Collector: MutationObserver is only a dirty flag; the walk runs in idle time, sliced.
// ---------------------------------------------------------------------------------------------

export interface IdleDeadlineLike {
  timeRemaining(): number;
}
export type RequestIdle = (cb: (deadline: IdleDeadlineLike) => void) => void;

export interface DomShapeOptions {
  /** How often to check the dirty flag and kick off a walk. */
  everyMs?: number;
  /** Max main-thread time per idle callback before yielding. */
  sliceMs?: number;
  doc?: Document;
  requestIdle?: RequestIdle;
  now?: () => number;
}

function defaultRequestIdle(): RequestIdle {
  if (typeof requestIdleCallback === 'function') return (cb) => void requestIdleCallback(cb, { timeout: 1000 });
  return (cb) => void setTimeout(() => cb({ timeRemaining: () => 8 }), 50);
}

export function createDomShapeCollector(options: DomShapeOptions = {}): Collector {
  const everyMs = options.everyMs ?? 2000;
  const sliceMs = options.sliceMs ?? 8;
  const doc = options.doc ?? document;
  const requestIdle = options.requestIdle ?? defaultRequestIdle();
  const now = options.now ?? (() => performance.now());

  let dirty = true;
  let walking = false;
  let active = false;
  let observer: MutationObserver | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;

  const walk = (onDone: (r: ShapeResult) => void) => {
    walking = true;
    dirty = false;
    const gen = shapeWalker(doc.documentElement);
    const slice = (deadline: IdleDeadlineLike) => {
      if (!active) return;
      const start = now();
      let step = gen.next();
      while (!step.done && deadline.timeRemaining() > 1 && now() - start < sliceMs) step = gen.next();
      if (step.done) {
        walking = false;
        onDone(step.value);
      } else {
        requestIdle(slice);
      }
    };
    requestIdle(slice);
  };

  return {
    start(emit) {
      active = true;
      dirty = true;
      observer = new MutationObserver(() => {
        dirty = true;
      });
      observer.observe(doc.documentElement, { childList: true, subtree: true });
      const tick = () => {
        if (!dirty || walking) return;
        walk((r) => emit({ maxDepth: r.maxDepth, widestParent: r.widestParent, heaviest: r.heaviest }));
      };
      tick();
      timer = setInterval(tick, everyMs);
    },
    stop() {
      active = false;
      observer?.disconnect();
      observer = undefined;
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    },
  };
}
