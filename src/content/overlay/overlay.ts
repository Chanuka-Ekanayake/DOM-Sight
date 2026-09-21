import type { Budget, BudgetEvaluation, Corner, Metrics } from '../../shared/types';
import type { History } from '../history';
import { OVERLAY_HOST_ID } from '../../shared/defaults';
import { HUD_CSS } from './styles';
import { drawSparkline } from './sparkline';

export interface OverlayOptions {
  corner: Corner;
  collapsed: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  onHighlight?: () => void;
  onSnapshot?: () => void;
  onHide?: () => void;
  onMove?: (pos: { x: number; y: number }) => void;
}

export interface RenderInput {
  metrics: Metrics;
  evaluation: BudgetEvaluation;
  budget: Budget;
  history: History;
}

export interface Overlay {
  mount(): void;
  unmount(): void;
  render(input: RenderInput): void;
  setCorner(corner: Corner): void;
  setPosition(pos: { x: number; y: number } | undefined): void;
  toast(message: string): void;
}

const fmt = (n: number | undefined): string => (n === undefined ? 'n/a' : n.toLocaleString('en-US'));
const STATUS_COLOR = { green: '#2ecc71', amber: '#f1c40f', red: '#e74c3c' } as const;

const TEMPLATE = `
<div class="hud" data-status="green">
  <div class="bar" title="Drag to move">
    <span class="dot"></span>
    <span class="summary"></span>
    <button class="toggle" title="Collapse / expand">&minus;</button>
  </div>
  <div class="body">
    <div class="gauge"><div class="fill" style="width:0%"></div></div>
    <div class="row r-nodes"><span class="k">Nodes</span><span class="v v-nodes"></span></div>
    <div class="row r-depth"><span class="k">Depth</span><span class="v v-depth"></span></div>
    <div class="row r-widest"><span class="k">Widest</span><span class="v v-widest"></span></div>
    <div class="row"><span class="k">FPS</span><span class="v v-fps"></span></div>
    <div class="row"><span class="k">Long tasks 10s</span><span class="v v-long"></span></div>
    <div class="row"><span class="k">JS heap</span><span class="v v-heap"></span></div>
    <canvas class="spark" width="204" height="32"></canvas>
    <div class="actions">
      <button class="btn-highlight" title="Outline the heaviest subtree">Highlight</button>
      <button class="btn-snapshot" title="Copy a JSON snapshot">Snapshot</button>
      <button class="btn-hide" title="Hide the HUD for this site">Hide</button>
    </div>
  </div>
  <div class="toast"></div>
</div>`;

function applyStyles(root: ShadowRoot): void {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(HUD_CSS);
    root.adoptedStyleSheets = [sheet];
    return;
  } catch {
    /* fall back to a <style> element (older engines / jsdom) */
  }
  const style = document.createElement('style');
  style.textContent = HUD_CSS;
  root.prepend(style);
}

export function createOverlay(options: OverlayOptions): Overlay {
  let host: HTMLElement | undefined;
  let root: ShadowRoot | undefined;
  let collapsed = options.collapsed;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let ctx: CanvasRenderingContext2D | null | undefined;

  const q = <T extends Element>(sel: string): T => root!.querySelector(sel) as T;

  const setCollapsed = (value: boolean, notify: boolean) => {
    collapsed = value;
    q<HTMLElement>('.hud').classList.toggle('collapsed', collapsed);
    q<HTMLElement>('.toggle').textContent = collapsed ? '+' : '−';
    if (notify) options.onToggleCollapse?.(collapsed);
  };

  const wireDrag = () => {
    const bar = q<HTMLElement>('.bar');
    let start: { px: number; py: number; hx: number; hy: number } | undefined;
    bar.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const rect = host!.getBoundingClientRect();
      start = { px: e.clientX, py: e.clientY, hx: rect.left, hy: rect.top };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!start) return;
      const x = Math.max(0, Math.min(window.innerWidth - host!.offsetWidth, start.hx + e.clientX - start.px));
      const y = Math.max(0, Math.min(window.innerHeight - host!.offsetHeight, start.hy + e.clientY - start.py));
      api.setPosition({ x, y });
    });
    const end = () => {
      if (!start) return;
      start = undefined;
      const rect = host!.getBoundingClientRect();
      options.onMove?.({ x: Math.round(rect.left), y: Math.round(rect.top) });
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  };

  const api: Overlay = {
    mount() {
      if (host) return;
      host = document.createElement('div');
      host.id = OVERLAY_HOST_ID;
      host.dataset.corner = options.corner;
      root = host.attachShadow({ mode: 'open' });
      applyStyles(root);
      const tpl = document.createElement('template');
      tpl.innerHTML = TEMPLATE;
      root.append(tpl.content.cloneNode(true));
      document.documentElement.append(host);

      setCollapsed(collapsed, false);
      q<HTMLElement>('.toggle').addEventListener('click', () => setCollapsed(!collapsed, true));
      q<HTMLElement>('.btn-highlight').addEventListener('click', () => options.onHighlight?.());
      q<HTMLElement>('.btn-snapshot').addEventListener('click', () => options.onSnapshot?.());
      q<HTMLElement>('.btn-hide').addEventListener('click', () => options.onHide?.());
      wireDrag();
    },

    unmount() {
      host?.remove();
      host = undefined;
      root = undefined;
      ctx = undefined;
    },

    render({ metrics: m, evaluation: ev, budget, history }) {
      if (!root) return;
      const pct = Math.round(ev.nodeRatio * 100);
      q<HTMLElement>('.hud').dataset.status = ev.status;
      q<HTMLElement>('.summary').textContent = `DOM ${fmt(m.nodes)}/${fmt(budget.nodes)} · ${fmt(m.fps)} fps`;
      q<HTMLElement>('.fill').style.width = `${Math.min(100, pct)}%`;

      q<HTMLElement>('.v-nodes').textContent = m.nodes === undefined ? 'n/a' : `${fmt(m.nodes)} / ${fmt(budget.nodes)} (${pct}%)`;
      q<HTMLElement>('.r-nodes').dataset.flag = ev.flags.nodes;
      q<HTMLElement>('.v-depth').textContent = m.maxDepth === undefined ? 'n/a' : `${m.maxDepth} / ${budget.maxDepth}`;
      q<HTMLElement>('.r-depth').dataset.flag = ev.flags.depth;
      q<HTMLElement>('.v-widest').textContent = m.widestParent
        ? `${m.widestParent.selector} ×${fmt(m.widestParent.children)}`
        : 'n/a';
      q<HTMLElement>('.r-widest').dataset.flag = ev.flags.children;
      q<HTMLElement>('.v-fps').textContent = fmt(m.fps);
      q<HTMLElement>('.v-long').textContent =
        m.longTasks10s === undefined
          ? 'n/a'
          : `${m.longTasks10s}${m.lastLongTaskMs !== undefined ? ` (last ${m.lastLongTaskMs} ms)` : ''}`;
      q<HTMLElement>('.v-heap').textContent = m.usedHeapMB === undefined ? 'n/a' : `${m.usedHeapMB} / ${m.totalHeapMB} MB`;

      if (collapsed) return;
      const canvas = q<HTMLCanvasElement>('.spark');
      if (ctx === undefined) {
        try {
          ctx = canvas.getContext('2d');
        } catch {
          ctx = null;
        }
      }
      if (ctx) drawSparkline(ctx, history.values(), canvas.width, canvas.height, STATUS_COLOR[ev.status], budget.nodes);
    },

    setCorner(corner) {
      if (!host) return;
      host.dataset.corner = corner;
      api.setPosition(undefined);
    },

    setPosition(pos) {
      if (!host) return;
      if (!pos) {
        delete host.dataset.dragged;
        host.style.removeProperty('--x');
        host.style.removeProperty('--y');
        return;
      }
      host.dataset.dragged = '';
      host.style.setProperty('--x', `${pos.x}px`);
      host.style.setProperty('--y', `${pos.y}px`);
    },

    toast(message) {
      if (!root) return;
      const el = q<HTMLElement>('.toast');
      el.textContent = message;
      el.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
    },
  };

  return api;
}
