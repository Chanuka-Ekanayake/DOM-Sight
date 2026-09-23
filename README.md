# DOM Tracker

A game-style HUD for the browser that shows **live DOM usage against a budget** — node count, tree depth,
widest parent, FPS, long tasks and JS heap — so you can see when a page render is getting too heavy
while developing, dev-testing or QA-ing .NET MVC / ASP.NET / Vue / React front-ends.

It is a Chrome/Edge extension (Manifest V3). No code changes are needed in the project being measured.

```
┌ ● DOM 4,120/1,500 · 58 fps      [−] ┐
│ ████████████████████████████░░░░░░░ │
│ Nodes            4,120 / 1,500 (275%) │
│ Depth                       12 / 32 │
│ Widest       div#grid > tbody ×420 │
│ FPS                              58 │
│ Long tasks 10s        3 (last 120 ms) │
│ JS heap                51.2 / 120 MB │
│ ▁▁▂▂▃▅▇███  (last 60 s)             │
│ [Highlight] [Snapshot] [Hide]       │
└─────────────────────────────────────┘
```

## Why "budget", not "capacity"

Unlike CPU or FPS, the DOM has no hard limit — the browser never refuses another node. What hurts is
the *effect* of DOM size on style recalculation, layout and memory. So the HUD measures against a
**budget** with Lighthouse-derived defaults, overridable per site:

| Metric                | Default | Amber at | Red at |
| --------------------- | ------- | -------- | ------ |
| Total elements        | 1,500   | 60 %     | 100 %  |
| Max nesting depth     | 32      | 60 %     | 100 %  |
| Max children / parent | 60      | 60 %     | 100 %  |
| Long task threshold   | 50 ms   | —        | —      |

## Install (unpacked)

```bash
npm install
npm run build          # -> dist/
```

1. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**.
2. **Load unpacked** → select the `dist/` folder.
3. Open any page, click the toolbar icon and switch **Show HUD on this site** on.
   The choice is remembered per origin; the toolbar badge shows the node count even when the HUD is hidden.

## Using it

- **Collapse** (`−`/`+`) to a one-line pill: `DOM 1,240/1,500 · 58 fps`. Drag the title bar to move it.
- **Highlight** outlines the heaviest subtree (the element where the node mass fans out, e.g. a grid
  `tbody`), scrolls to it and logs the element to the console for inspection.
- **Snapshot** copies a JSON report (metrics, budget, status, top-5 heavy subtrees, 60 s history) to the
  clipboard — attach it to a bug or work item. On pages where the clipboard is unavailable it downloads
  instead; the popup's **Download snapshot** always downloads.
- **Page type** in the popup sets the node budget from a preset instead of typing a number. The box
  below still accepts any value; the dropdown then reads **Custom**.
- **Options** (from the popup) lists every configured origin with its own node / depth / children /
  long-task thresholds. Changes apply live to open tabs.

### Page-type presets

Starting points to calibrate from — the right budget is the count at which a page stops feeling fast:

| Page type | Nodes |
| --------- | ----- |
| Public / marketing page | 1,500 |
| CRUD form / detail screen | 2,500 |
| Dashboard / widgets | 4,000 |
| Paged data grid | 6,000 |
| Virtualized / infinite grid | 10,000 |

Above 10,000 the fix is virtualization or paging, not a larger budget.

## How it measures without skewing the numbers

- Node count reads `document.getElementsByTagName('*').length` every 500 ms — the engine caches this,
  so it is near-free.
- Depth, widest parent and heaviest subtrees come from a tree walk that runs **only in idle time**
  (`requestIdleCallback`), **only when a `MutationObserver` flagged the DOM as changed**, and is
  **time-sliced at ~8 ms** so it never becomes a long task itself — even on 100k-node pages.
- The HUD lives in a **Shadow Root** on a single host element, which is subtracted from the count.
- FPS is a `requestAnimationFrame` counter; long tasks come from `PerformanceObserver('longtask')`;
  heap from the Chromium-only `performance.memory` (shown as `n/a` elsewhere).

## Limitations

- Elements inside the page's *own* shadow roots (web components) are not counted.
- Top frame only; iframes are not measured.
- `performance.memory` and `longtask` are Chromium-only.
- Pages open before the extension was installed need a reload.

## Development

```bash
npm test               # Vitest (jsdom) unit + integration tests
npm run typecheck
npm run lint
npm run build          # two Vite builds: pages/background (ESM) + content script (IIFE)
npm run dev            # same, in watch mode
node scripts/smoke-dist.mjs   # boots dist/content.js under jsdom with test-pages/chrome-shim.js
```

`test-pages/` has manual fixtures — serve the repo root (e.g. `python -m http.server 8765`) and open:

- `grid.html` — append 100 / 1k / 10k / 50k table rows, or churn rows continuously.
- `deep.html` — nest 20 / 40 / 80 levels to trip the depth budget.
- `leak.html` — detach nodes while keeping references: flat DOM count, rising heap.
- `standalone.html` — runs `dist/content.js` with an in-memory `chrome.*` shim, no install needed.

## Layout

```
src/
  content/            content script: collectors -> budget -> history -> overlay
    collectors/       domCount, domShape (sliced idle walk), fps, longTasks, memory
    overlay/          Shadow-DOM HUD, sparkline, styles
    tracker.ts        glue; index.ts adds chrome.* wiring
  popup/ options/     toolbar popup, per-site budget table
  background.ts       badge + snapshot downloads
  shared/             types, defaults, storage (chrome.storage.sync per origin), messaging
docs/superpowers/specs/  design spec
```
