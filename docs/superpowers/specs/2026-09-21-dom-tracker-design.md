# DOM Tracker — Design Spec (2026-09-21)

## Context

When building .NET MVC / ASP.NET / Vue / React front-ends that render large datasets, there is no
easy way to see *how much DOM a page is using* or when it crosses into "too much". The user wants a
game-style HUD (like an FPS/CPU counter) that shows live DOM usage vs. a budget, so developers,
dev-testers and QA can spot heavy renders without opening DevTools.

Key framing agreed with the user: the DOM has no hard capacity, so "used / left" is measured against
a **configurable budget** (Lighthouse-derived defaults: 1,500 nodes, depth 32, 60 children/parent).

Decisions made in brainstorming (all approved):
- **Delivery:** Chrome/Edge extension (Manifest V3) — zero code changes in target projects.
- **Metrics:** node count vs budget, max depth + widest parent, FPS + long tasks, JS heap.
- **v1 scope:** per-site budget config, 60 s history sparkline, highlight heaviest subtree,
  export JSON snapshot.
- **Stack:** TypeScript + Vite, vanilla overlay in a Shadow Root (no framework), Vitest + jsdom.
- **Measurement strategy:** Option C hybrid — MutationObserver as dirty flag only; cheap
  `document.getElementsByTagName('*').length` on a 500 ms ticker; expensive tree walk in
  `requestIdleCallback` (≤ every 2 s, only when dirty, time-sliced at ~8 ms).

Working directory `D:\MyProjects\DOM Tracker` is empty and not a git repo.

## Design

### Architecture

```
manifest.json (MV3)
src/
  content/
    index.ts              entry: load config for origin, mount overlay, start collectors
    collectors/
      domCount.ts         500ms ticker + MutationObserver dirty flag  → { nodes }
      domShape.ts         idle, time-sliced TreeWalker → { maxDepth, widestParent, heaviest[5] }
      fps.ts              rAF counter                  → { fps }
      longTasks.ts        PerformanceObserver('longtask') → { longTasks10s, lastLongTaskMs }
      memory.ts           performance.memory (1 s)     → { usedHeapMB, totalHeapMB } | n/a
    budget.ts             metrics + thresholds → 'green' | 'amber' | 'red' (+ per-metric flags)
    history.ts            ring buffer, last 60 samples of node count (+ min/max)
    overlay/
      overlay.ts          Shadow-DOM HUD host, collapsed/expanded, drag, position persistence
      sparkline.ts        <canvas> renderer for history
      styles.ts           CSS string applied via adoptedStyleSheets (fallback: <style> in shadow)
    highlight.ts          outline heaviest subtree 3 s + console.log selector/count
    report.ts             builds snapshot JSON
  popup/                  toggle HUD for this origin, corner picker, quick node budget, download snapshot
  options/                per-site budgets table (origin → nodes/depth/width/longTaskMs)
  background.ts           service worker: mirrors node count to toolbar badge; relays snapshot download
  shared/
    types.ts              Metrics, Budget, Status, Snapshot, messages
    defaults.ts           DEFAULT_BUDGET, thresholds (amber 60 %, red 100 %)
    storage.ts            chrome.storage.sync helpers keyed by origin + onChanged subscription
    messaging.ts          typed runtime message helpers
test-pages/
  grid.html               append 1k / 10k / 50k rows
  deep.html               50-level nesting
  leak.html               create/detach nodes on a timer
```

Each collector exposes `start(emit: (partial: Partial<Metrics>) => void)` and `stop()`.
`index.ts` merges partials into one `Metrics`, runs `budget.evaluate`, pushes to `history`,
and calls `overlay.render(metrics, status, history)` (text node updates only; canvas redraw for sparkline).

### Overlay behaviour
- Fixed pill, ~200 px, dark semi-transparent, monospace; collapsed line `DOM 1,240/1,500 · 58 fps`.
- Expanded: gauge bar (green/amber/red), depth, widest parent (`div.grid-body ×420`), fps,
  long tasks (10 s), heap MB, 60 s sparkline; buttons Highlight / Snapshot / Hide.
- Draggable, corner/position remembered per origin. Host is the only extra light-DOM node
  (`getElementsByTagName('*')` does not descend into shadow roots ⇒ HUD never inflates the count).
- Off by default per tab; enabled via popup, remembered per origin.

### Robustness
- Missing `performance.memory` or `longtask` support → row shows `n/a`; rest unaffected.
- Idle walk aborts after ~8 ms slice and resumes next idle callback (never a self-inflicted long task).
- CSP-safe: no injected `<script>`; styles via `adoptedStyleSheets` with CSSOM fallback.
- SPA route changes handled naturally by MutationObserver + continuous history.
- Top frame only in v1 (`all_frames: false`).
- Page's own shadow roots not counted by the cheap read (documented limitation).

### Snapshot JSON
```json
{ "url": "...", "timestamp": "...", "budget": {...}, "metrics": {...}, "status": "amber",
  "heaviest": [{ "selector": "div#grid > tbody", "nodes": 4120, "depth": 9 }],
  "history": [ 60 numbers ] }
```

