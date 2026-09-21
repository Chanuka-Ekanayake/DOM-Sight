import { loadSiteConfig, saveSiteConfig, loadAllSites, deleteSite, onSiteConfigChange, siteKey } from './storage';
import { DEFAULT_BUDGET, DEFAULT_SITE_CONFIG } from './defaults';
import { fakeChrome } from '../test/fakeChrome';

let fake: ReturnType<typeof fakeChrome>;
beforeEach(() => {
  fake = fakeChrome();
  (globalThis as unknown as { chrome: unknown }).chrome = fake.chrome;
});

describe('siteKey', () => {
  it('namespaces the origin', () => {
    expect(siteKey('https://localhost:5001')).toBe('site:https://localhost:5001');
  });
});

describe('loadSiteConfig', () => {
  it('returns defaults for an unknown origin', async () => {
    expect(await loadSiteConfig('https://a.test')).toEqual(DEFAULT_SITE_CONFIG);
  });

  it('deep-merges a stored partial budget over the defaults', async () => {
    fake.store['site:https://a.test'] = { enabled: true, budget: { nodes: 5000 } };
    const cfg = await loadSiteConfig('https://a.test');
    expect(cfg.enabled).toBe(true);
    expect(cfg.corner).toBe(DEFAULT_SITE_CONFIG.corner);
    expect(cfg.budget).toEqual({ ...DEFAULT_BUDGET, nodes: 5000 });
  });
});

describe('saveSiteConfig', () => {
  it('merges the patch into the existing stored config', async () => {
    await saveSiteConfig('https://a.test', { enabled: true });
    await saveSiteConfig('https://a.test', { budget: { maxDepth: 10 } });
    expect(fake.store['site:https://a.test']).toEqual({ enabled: true, budget: { maxDepth: 10 } });
    const cfg = await loadSiteConfig('https://a.test');
    expect(cfg.enabled).toBe(true);
    expect(cfg.budget.maxDepth).toBe(10);
    expect(cfg.budget.nodes).toBe(DEFAULT_BUDGET.nodes);
  });
});

describe('loadAllSites / deleteSite', () => {
  it('lists every configured origin with full merged configs', async () => {
    await saveSiteConfig('https://a.test', { enabled: true });
    await saveSiteConfig('https://b.test', { budget: { nodes: 99 } });
    fake.store['unrelated'] = 1;
    const all = await loadAllSites();
    expect(Object.keys(all).sort()).toEqual(['https://a.test', 'https://b.test']);
    expect(all['https://b.test']?.budget.nodes).toBe(99);
    expect(all['https://a.test']?.budget).toEqual(DEFAULT_BUDGET);
  });

  it('removes a site so it falls back to defaults', async () => {
    await saveSiteConfig('https://a.test', { enabled: true });
    await deleteSite('https://a.test');
    expect(await loadSiteConfig('https://a.test')).toEqual(DEFAULT_SITE_CONFIG);
  });
});

describe('onSiteConfigChange', () => {
  it('invokes the callback with the merged config when that origin changes', async () => {
    const seen: unknown[] = [];
    onSiteConfigChange('https://a.test', (cfg) => seen.push(cfg));
    await saveSiteConfig('https://a.test', { budget: { nodes: 42 } });
    expect(seen).toHaveLength(1);
    expect((seen[0] as { budget: { nodes: number } }).budget.nodes).toBe(42);
  });

  it('ignores changes to other origins', async () => {
    const seen: unknown[] = [];
    onSiteConfigChange('https://a.test', (cfg) => seen.push(cfg));
    await saveSiteConfig('https://b.test', { enabled: true });
    expect(seen).toHaveLength(0);
  });

  it('fires with defaults when the site entry is removed', async () => {
    await saveSiteConfig('https://a.test', { enabled: true });
    const seen: unknown[] = [];
    onSiteConfigChange('https://a.test', (cfg) => seen.push(cfg));
    await deleteSite('https://a.test');
    expect(seen[0]).toEqual(DEFAULT_SITE_CONFIG);
  });

  it('returns an unsubscribe function', async () => {
    const seen: unknown[] = [];
    const off = onSiteConfigChange('https://a.test', (cfg) => seen.push(cfg));
    off();
    await saveSiteConfig('https://a.test', { enabled: true });
    expect(seen).toHaveLength(0);
  });
});
