import { readFileSync } from 'node:fs';
import { fakeChrome } from '../test/fakeChrome';
import { siteKey } from '../shared/storage';
import { PAGE_TYPE_PRESETS, CUSTOM_PRESET_ID } from '../shared/presets';

const ORIGIN = 'https://localhost:5001';

/** Loads the real popup.html body so the tests exercise the shipped markup, not a stand-in. */
function loadPopupMarkup(): void {
  const html = readFileSync('src/popup/popup.html', 'utf8');
  const body = /<body>([\s\S]*)<\/body>/.exec(html)![1] as string;
  document.body.innerHTML = body;
}

async function openPopup(fake: ReturnType<typeof fakeChrome>) {
  (globalThis as unknown as { chrome: unknown }).chrome = fake.chrome;
  loadPopupMarkup();
  vi.resetModules();
  await import('./popup');
  await vi.advanceTimersByTimeAsync(20);
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('popup — Show HUD on this site toggle', () => {
  it('enables the HUD when the visible switch is clicked', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/leave/apply` });
    await openPopup(fake);

    // The user clicks the switch itself, not the text label.
    $('.slider').click();
    await vi.advanceTimersByTimeAsync(20);

    expect($<HTMLInputElement>('#enabled').checked).toBe(true);
    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ enabled: true });
  });

  it('disables the HUD when the switch is clicked again', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/leave/apply` });
    fake.store[siteKey(ORIGIN)] = { enabled: true };
    await openPopup(fake);
    expect($<HTMLInputElement>('#enabled').checked).toBe(true);

    $('.slider').click();
    await vi.advanceTimersByTimeAsync(20);

    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ enabled: false });
  });

  it('still works when the text label is clicked', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/leave/apply` });
    await openPopup(fake);

    $('label[for="enabled"]').click();
    await vi.advanceTimersByTimeAsync(20);

    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ enabled: true });
  });

  it('shows the stored state for this origin when opened', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    fake.store[siteKey(ORIGIN)] = { enabled: true, budget: { nodes: 4000 } };
    await openPopup(fake);

    expect($<HTMLInputElement>('#enabled').checked).toBe(true);
    expect($<HTMLInputElement>('#nodes-budget').value).toBe('4000');
    expect($('#origin').textContent).toBe(ORIGIN);
  });

  it('disables the controls on a restricted page', async () => {
    const fake = fakeChrome({ tabUrl: 'chrome://extensions' });
    await openPopup(fake);

    expect($<HTMLInputElement>('#enabled').disabled).toBe(true);
    expect($('#hint').textContent).toContain('Not available');
  });
});

describe('popup — page type preset dropdown', () => {
  const select = () => $<HTMLSelectElement>('#page-type');
  const nodesInput = () => $<HTMLInputElement>('#nodes-budget');
  const choose = async (value: string) => {
    select().value = value;
    select().dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(20);
  };
  const typeBudget = async (value: string) => {
    nodesInput().value = value;
    nodesInput().dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(20);
  };

  it('offers every page type plus a custom entry', async () => {
    await openPopup(fakeChrome({ tabUrl: `${ORIGIN}/x` }));
    const values = [...select().options].map((o) => o.value);
    expect(values).toEqual([...PAGE_TYPE_PRESETS.map((p) => p.id), CUSTOM_PRESET_ID]);
    expect([...select().options].map((o) => o.textContent)).toContain('Paged data grid');
  });

  it('selects the page type matching the stored budget', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    fake.store[siteKey(ORIGIN)] = { budget: { nodes: 6000 } };
    await openPopup(fake);
    expect(select().value).toBe('grid');
  });

  it('selects Custom when the stored budget matches no page type', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    fake.store[siteKey(ORIGIN)] = { budget: { nodes: 3333 } };
    await openPopup(fake);
    expect(select().value).toBe(CUSTOM_PRESET_ID);
  });

  it('applies and saves the budget when a page type is chosen', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    await openPopup(fake);

    await choose('virtualized');

    expect(nodesInput().value).toBe('10000');
    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ budget: { nodes: 10000 } });
  });

  it('keeps the dropdown in sync when a budget is typed by hand', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    await openPopup(fake);

    await typeBudget('4000');
    expect(select().value).toBe('dashboard');

    await typeBudget('4321');
    expect(select().value).toBe(CUSTOM_PRESET_ID);
    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ budget: { nodes: 4321 } });
  });

  it('does not change the budget when Custom is chosen', async () => {
    const fake = fakeChrome({ tabUrl: `${ORIGIN}/x` });
    fake.store[siteKey(ORIGIN)] = { budget: { nodes: 6000 } };
    await openPopup(fake);

    await choose(CUSTOM_PRESET_ID);

    expect(nodesInput().value).toBe('6000');
    expect(fake.store[siteKey(ORIGIN)]).toMatchObject({ budget: { nodes: 6000 } });
  });
});
