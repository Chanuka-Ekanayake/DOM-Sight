import type { Budget, SiteConfig } from '../shared/types';
import { DEFAULT_BUDGET } from '../shared/defaults';
import { deleteSite, loadAllSites, saveSiteConfig } from '../shared/storage';

const BUDGET_FIELDS: { key: keyof Budget; min: number }[] = [
  { key: 'nodes', min: 100 },
  { key: 'maxDepth', min: 2 },
  { key: 'maxChildren', min: 2 },
  { key: 'longTaskMs', min: 16 },
];

function numberInput(origin: string, key: keyof Budget, value: number, min: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.value = String(value);
  input.addEventListener('change', () => {
    const v = Math.max(min, Math.round(Number(input.value) || min));
    input.value = String(v);
    void saveSiteConfig(origin, { budget: { [key]: v } });
  });
  return input;
}

function row(origin: string, cfg: SiteConfig): HTMLTableRowElement {
  const tr = document.createElement('tr');

  const tdOrigin = document.createElement('td');
  tdOrigin.className = 'origin';
  tdOrigin.textContent = origin;
  tdOrigin.title = origin;
  tr.append(tdOrigin);

  const tdEnabled = document.createElement('td');
  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabled.checked = cfg.enabled;
  enabled.addEventListener('change', () => void saveSiteConfig(origin, { enabled: enabled.checked }));
  tdEnabled.append(enabled);
  tr.append(tdEnabled);

  for (const { key, min } of BUDGET_FIELDS) {
    const td = document.createElement('td');
    td.append(numberInput(origin, key, cfg.budget[key], min));
    tr.append(td);
  }

  const tdActions = document.createElement('td');
  const remove = document.createElement('button');
  remove.className = 'danger';
  remove.textContent = 'Remove';
  remove.title = 'Forget this site (falls back to defaults)';
  remove.addEventListener('click', async () => {
    await deleteSite(origin);
    await render();
  });
  tdActions.append(remove);
  tr.append(tdActions);

  return tr;
}

async function render(): Promise<void> {
  const sites = await loadAllSites();
  const tbody = document.getElementById('rows') as HTMLTableSectionElement;
  tbody.replaceChildren();
  const origins = Object.keys(sites).sort();
  if (origins.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'empty';
    td.textContent = 'No sites configured yet. Enable the HUD from the toolbar popup on a page, or add an origin below.';
    tr.append(td);
    tbody.append(tr);
    return;
  }
  for (const origin of origins) tbody.append(row(origin, sites[origin] as SiteConfig));
}

function normaliseOrigin(raw: string): string | undefined {
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  (document.getElementById('defaults') as HTMLElement).textContent =
    `Defaults: nodes ${DEFAULT_BUDGET.nodes}, depth ${DEFAULT_BUDGET.maxDepth}, children ${DEFAULT_BUDGET.maxChildren}, long task ${DEFAULT_BUDGET.longTaskMs} ms (Lighthouse guidance).`;

  const input = document.getElementById('new-origin') as HTMLInputElement;
  const add = async () => {
    const origin = normaliseOrigin(input.value.trim());
    if (!origin) {
      input.focus();
      return;
    }
    await saveSiteConfig(origin, { enabled: true });
    input.value = '';
    await render();
  };
  document.getElementById('add')!.addEventListener('click', () => void add());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void add();
  });

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'sync' && document.activeElement?.tagName !== 'INPUT') void render();
  });

  await render();
}

void main();
