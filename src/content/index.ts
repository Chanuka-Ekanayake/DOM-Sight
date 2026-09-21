import type { SiteConfig, TrackerState } from '../shared/types';
import { loadSiteConfig, onSiteConfigChange, saveSiteConfig } from '../shared/storage';
import { onMessage, sendToRuntime } from '../shared/messaging';
import { createTracker, type Tracker } from './tracker';
import { createOverlay, type Overlay } from './overlay/overlay';
import { createDomCountCollector } from './collectors/domCount';
import { createDomShapeCollector } from './collectors/domShape';
import { createFpsCollector } from './collectors/fps';
import { createLongTasksCollector } from './collectors/longTasks';
import { createMemoryCollector } from './collectors/memory';
import { highlightHeaviest } from './highlight';
import { snapshotFileName } from '../shared/filename';

const origin = location.origin;
let config: SiteConfig;
let tracker: Tracker | undefined;
let overlay: Overlay | undefined;

async function copyOrDownloadSnapshot(): Promise<void> {
  if (!tracker) return;
  const snapshot = tracker.snapshot();
  const json = JSON.stringify(snapshot, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    overlay?.toast('Snapshot copied');
  } catch {
    // Clipboard needs a secure context + focus; fall back to a download via the background worker.
    await sendToRuntime({ type: 'download-snapshot', snapshot });
    overlay?.toast(`Saved ${snapshotFileName(snapshot.url, snapshot.timestamp)}`);
  }
}

function build(cfg: SiteConfig): void {
  overlay = createOverlay({
    corner: cfg.corner,
    collapsed: cfg.collapsed,
    onToggleCollapse: (collapsed) => void saveSiteConfig(origin, { collapsed }),
    onMove: (position) => void saveSiteConfig(origin, { position }),
    onHide: () => void saveSiteConfig(origin, { enabled: false }),
    onHighlight: () => {
      const el = highlightHeaviest(tracker?.metrics().heaviest ?? []);
      overlay?.toast(el ? 'Outlined — see console' : 'Nothing to highlight yet');
    },
    onSnapshot: () => void copyOrDownloadSnapshot(),
  });

  tracker = createTracker({
    budget: cfg.budget,
    url: location.href,
    overlay,
    collectors: [
      createDomCountCollector(),
      createDomShapeCollector(),
      createFpsCollector(),
      createLongTasksCollector(),
      createMemoryCollector(),
    ],
    onStatus: (nodes, status) => void sendToRuntime({ type: 'badge', nodes, status }).catch(() => {}),
  });

  tracker.start();
  if (cfg.position) overlay.setPosition(cfg.position);
}

function teardown(): void {
  tracker?.stop();
  tracker = undefined;
  overlay = undefined;
  void sendToRuntime({ type: 'badge', nodes: undefined, status: 'green' }).catch(() => {});
}

function apply(next: SiteConfig): void {
  const prev = config;
  config = next;

  if (next.enabled && !tracker) return build(next);
  if (!next.enabled && tracker) return teardown();
  if (!tracker || !overlay) return;

  tracker.setBudget(next.budget);
  if (next.corner !== prev?.corner) overlay.setCorner(next.corner);
  if (next.position && (next.position.x !== prev?.position?.x || next.position.y !== prev?.position?.y)) {
    overlay.setPosition(next.position);
  }
  if (!next.position && prev?.position) overlay.setPosition(undefined);
}

function state(): TrackerState {
  return { origin, enabled: !!tracker, nodes: tracker?.metrics().nodes, status: tracker?.status() ?? 'green' };
}

async function main(): Promise<void> {
  config = await loadSiteConfig(origin);
  apply(config);
  onSiteConfigChange(origin, apply);

  onMessage((message) => {
    switch (message.type) {
      case 'get-state':
        return state();
      case 'get-snapshot':
        return tracker ? tracker.snapshot() : { error: 'not-enabled' };
      default:
        return undefined;
    }
  });
}

// Only meaningful in real documents; skip about:blank / view-source style contexts.
if (typeof chrome !== 'undefined' && chrome.storage && document.documentElement) {
  void main().catch((err) => console.warn('[DOM Tracker] failed to start', err));
}
