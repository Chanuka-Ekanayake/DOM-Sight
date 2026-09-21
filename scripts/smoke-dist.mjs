// Loads the built content script + the test-page chrome shim in jsdom and checks the HUD renders.
// Run after `npm run build`: `node scripts/smoke-dist.mjs`
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = `<!doctype html><html><body><div id="app">${'<p></p>'.repeat(50)}</div></body></html>`;
const dom = new JSDOM(html, {
  url: 'http://localhost:8765/test-pages/standalone.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => null;
window.eval(readFileSync('test-pages/chrome-shim.js', 'utf8'));
window.eval(readFileSync('dist/content.js', 'utf8'));

await new Promise((r) => setTimeout(r, 2500));
const host = window.document.getElementById('dom-tracker-hud-host');
if (!host) throw new Error('HUD host not mounted');
const text = (sel) => host.shadowRoot.querySelector(sel).textContent.trim();
console.log('summary :', text('.summary'));
console.log('nodes   :', text('.v-nodes'));
console.log('depth   :', text('.v-depth'));
console.log('widest  :', text('.v-widest'));
console.log('badge   :', JSON.stringify(window.__domTrackerLastMessage));
// html, head, body, div, 50 p
if (!text('.v-nodes').startsWith('54 /')) throw new Error('unexpected node count');
console.log('SMOKE OK');
process.exit(0);
