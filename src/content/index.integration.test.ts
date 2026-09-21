import { fakeChrome } from '../test/fakeChrome';
import { OVERLAY_HOST_ID } from '../shared/defaults';

/**
 * Boots the real content script entry under jsdom with an in-memory chrome.* and checks the
 * whole chain: storage -> collectors -> budget -> overlay -> badge message.
 */
describe('content script end-to-end (jsdom)', () => {
  let fake: ReturnType<typeof fakeChrome>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    document.getElementById(OVERLAY_HOST_ID)?.remove(); // host lives under <html>, not <body>
    document.body.innerHTML = '<div id="app">' + '<p></p>'.repeat(10) + '</div>';
    fake = fakeChrome();
    fake.store[`site:${location.origin}`] = { enabled: true };
    (globalThis as unknown as { chrome: unknown }).chrome = fake.chrome;
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const shadowText = (sel: string) => document.getElementById(OVERLAY_HOST_ID)!.shadowRoot!.querySelector(sel)!.textContent!.trim();

  it('mounts the HUD when the site is enabled and renders live node counts', async () => {
    await import('./index');
    await vi.advanceTimersByTimeAsync(600);
    expect(document.getElementById(OVERLAY_HOST_ID)).not.toBeNull();
    // html, head, body, div, 10 p = 14 (host excluded)
    expect(shadowText('.v-nodes')).toBe('14 / 1,500 (1%)');
    expect(fake.messages).toContainEqual({ type: 'badge', nodes: 14, status: 'green' });

    document.getElementById('app')!.append(...Array.from({ length: 2000 }, () => document.createElement('span')));
    await vi.advanceTimersByTimeAsync(600);
    expect(shadowText('.v-nodes')).toBe('2,014 / 1,500 (134%)');
    expect(document.getElementById(OVERLAY_HOST_ID)!.shadowRoot!.querySelector('.hud')!.getAttribute('data-status')).toBe('red');
  });

  it('stays dormant when the site is disabled and mounts once enabled via storage', async () => {
    fake.store[`site:${location.origin}`] = { enabled: false };
    await import('./index');
    await vi.advanceTimersByTimeAsync(600);
    expect(document.getElementById(OVERLAY_HOST_ID)).toBeNull();

    await fake.chrome.storage.sync.set({ [`site:${location.origin}`]: { enabled: true } });
    await vi.advanceTimersByTimeAsync(600);
    expect(document.getElementById(OVERLAY_HOST_ID)).not.toBeNull();
  });

  it('applies a live budget change and unmounts when disabled', async () => {
    await import('./index');
    await vi.advanceTimersByTimeAsync(600);
    await fake.chrome.storage.sync.set({ [`site:${location.origin}`]: { enabled: true, budget: { nodes: 10 } } });
    expect(shadowText('.v-nodes')).toBe('14 / 10 (140%)');

    await fake.chrome.storage.sync.set({ [`site:${location.origin}`]: { enabled: false } });
    expect(document.getElementById(OVERLAY_HOST_ID)).toBeNull();
    expect(fake.messages.at(-1)).toEqual({ type: 'badge', nodes: undefined, status: 'green' });
  });
});
