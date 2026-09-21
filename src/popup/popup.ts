import type { Corner, Snapshot, TrackerState } from '../shared/types';
import { loadSiteConfig, saveSiteConfig } from '../shared/storage';
import { sendToRuntime, sendToTab } from '../shared/messaging';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function currentTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'file:' ? u.origin : undefined;
  } catch {
    return undefined;
  }
}

function disableAll(message: string): void {
  for (const id of ['enabled', 'corner', 'nodes-budget', 'download']) ($(id) as HTMLInputElement).disabled = true;
  $('hint').innerHTML = `<span class="unavailable">${message}</span>`;
}

async function refreshState(tabId: number): Promise<void> {
  try {
    const state = await sendToTab<TrackerState>(tabId, { type: 'get-state' });
    $('dot').dataset.status = state.enabled ? state.status : '';
    $('nodes').textContent = state.enabled && state.nodes !== undefined ? state.nodes.toLocaleString('en-US') : '';
    $<HTMLButtonElement>('download').disabled = !state.enabled;
  } catch {
    // Content script not present (page loaded before install, or a restricted page).
    $('hint').textContent = 'Reload the page to activate the HUD.';
    $<HTMLButtonElement>('download').disabled = true;
  }
}

async function main(): Promise<void> {
  const tab = await currentTab();
  const origin = originOf(tab?.url);
  if (!tab?.id || !origin) {
    $('origin').textContent = tab?.url ?? '';
    return disableAll('Not available on this page.');
  }
  const tabId = tab.id;
  $('origin').textContent = origin;
  $('origin').title = origin;

  const config = await loadSiteConfig(origin);
  const enabled = $<HTMLInputElement>('enabled');
  const corner = $<HTMLSelectElement>('corner');
  const nodes = $<HTMLInputElement>('nodes-budget');
  enabled.checked = config.enabled;
  corner.value = config.corner;
  nodes.value = String(config.budget.nodes);

  enabled.addEventListener('change', async () => {
    await saveSiteConfig(origin, { enabled: enabled.checked });
    setTimeout(() => void refreshState(tabId), 600);
  });
  corner.addEventListener('change', () => void saveSiteConfig(origin, { corner: corner.value as Corner, position: undefined }));
  nodes.addEventListener('change', () => {
    const value = Math.max(100, Math.round(Number(nodes.value) || 0));
    nodes.value = String(value);
    void saveSiteConfig(origin, { budget: { nodes: value } });
  });

  $('download').addEventListener('click', async () => {
    const snapshot = await sendToTab<Snapshot | { error: string }>(tabId, { type: 'get-snapshot' });
    if ('error' in snapshot) {
      $('hint').textContent = 'Enable the HUD first.';
      return;
    }
    await sendToRuntime({ type: 'download-snapshot', snapshot });
    $('hint').textContent = 'Snapshot downloaded.';
  });
  $('options').addEventListener('click', () => void chrome.runtime.openOptionsPage());

  await refreshState(tabId);
  setInterval(() => void refreshState(tabId), 1000);
}

void main();
