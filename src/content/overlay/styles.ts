/** HUD styles. Lives inside the shadow root so page CSS can't leak in or out. */
export const HUD_CSS = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color: #e6e8ee;
}
:host([data-corner="top-left"])     { top: 12px; left: 12px; }
:host([data-corner="top-right"])    { top: 12px; right: 12px; }
:host([data-corner="bottom-left"])  { bottom: 12px; left: 12px; }
:host([data-corner="bottom-right"]) { bottom: 12px; right: 12px; }
:host([data-dragged]) { top: var(--y); left: var(--x); right: auto; bottom: auto; }

.hud {
  position: relative;
  pointer-events: auto;
  width: 220px;
  background: rgba(18, 20, 26, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.35);
  user-select: none;
}
.hud[data-status="green"] { --accent: #2ecc71; }
.hud[data-status="amber"] { --accent: #f1c40f; }
.hud[data-status="red"]   { --accent: #e74c3c; }

.bar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px;
  cursor: grab;
  background: rgba(255,255,255,0.04);
  border-radius: 8px 8px 0 0;
}
.hud.collapsed .bar { border-radius: 8px; }
.bar:active { cursor: grabbing; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px var(--accent); flex: none; }
.summary { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.toggle, .actions button {
  all: unset; cursor: pointer; padding: 1px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.08); color: #cfd3dc; font: inherit; font-size: 10px;
}
.toggle:hover, .actions button:hover { background: rgba(255,255,255,0.16); color: #fff; }

.body { padding: 6px 8px 8px; }
.hud.collapsed .body { display: none; }

.gauge { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; margin-bottom: 6px; }
.fill { height: 100%; background: var(--accent); transition: width .25s ease; }

.row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
.row .k { color: #9aa0ad; }
.row .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; }
.row[data-flag="amber"] .v { color: #f1c40f; }
.row[data-flag="red"] .v { color: #e74c3c; font-weight: 700; }

.spark { display: block; width: 100%; height: 32px; margin: 6px 0 4px; background: rgba(255,255,255,0.04); border-radius: 4px; }

.actions { display: flex; gap: 4px; margin-top: 4px; }
.actions button { flex: 1; text-align: center; padding: 3px 0; }

.toast {
  position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -6px);
  padding: 3px 8px; border-radius: 4px; background: #2ecc71; color: #06110a; font-weight: 700;
  white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s;
}
.toast.show { opacity: 1; }
`;
