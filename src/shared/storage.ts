import type { Budget, SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG } from './defaults';

const PREFIX = 'site:';

/** Shape actually persisted: everything optional, budget may be partial. */
export type StoredSiteConfig = Partial<Omit<SiteConfig, 'budget'>> & { budget?: Partial<Budget> };

export function siteKey(origin: string): string {
  return PREFIX + origin;
}

function merge(stored: StoredSiteConfig | undefined): SiteConfig {
  return {
    ...DEFAULT_SITE_CONFIG,
    ...stored,
    budget: { ...DEFAULT_SITE_CONFIG.budget, ...stored?.budget },
  };
}

function isStored(v: unknown): v is StoredSiteConfig {
  return typeof v === 'object' && v !== null;
}

export async function loadSiteConfig(origin: string): Promise<SiteConfig> {
  const key = siteKey(origin);
  const result = await chrome.storage.sync.get(key);
  const raw = result[key];
  return merge(isStored(raw) ? raw : undefined);
}

export async function saveSiteConfig(origin: string, patch: StoredSiteConfig): Promise<void> {
  const key = siteKey(origin);
  const result = await chrome.storage.sync.get(key);
  const current = isStored(result[key]) ? (result[key] as StoredSiteConfig) : {};
  const next: StoredSiteConfig = { ...current, ...patch };
  if (current.budget || patch.budget) next.budget = { ...current.budget, ...patch.budget };
  await chrome.storage.sync.set({ [key]: next });
}

export async function loadAllSites(): Promise<Record<string, SiteConfig>> {
  const all = await chrome.storage.sync.get(null);
  const out: Record<string, SiteConfig> = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(PREFIX) && isStored(value)) out[key.slice(PREFIX.length)] = merge(value);
  }
  return out;
}

export async function deleteSite(origin: string): Promise<void> {
  await chrome.storage.sync.remove(siteKey(origin));
}

/** Subscribe to changes for one origin. Returns an unsubscribe function. */
export function onSiteConfigChange(origin: string, cb: (config: SiteConfig) => void): () => void {
  const key = siteKey(origin);
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync' || !(key in changes)) return;
    const next = changes[key]?.newValue;
    cb(merge(isStored(next) ? next : undefined));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
