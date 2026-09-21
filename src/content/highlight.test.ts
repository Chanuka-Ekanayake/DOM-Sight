import { highlightHeaviest } from './highlight';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="grid"><table><tbody><tr><td></td></tr></tbody></table></div>';
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('highlightHeaviest', () => {
  const heaviest = [{ selector: 'div#grid > table > tbody', nodes: 2, depth: 2 }];

  it('outlines the heaviest element and clears it after the duration', () => {
    const tbody = document.querySelector('tbody')!;
    const result = highlightHeaviest(heaviest, { durationMs: 3000, log: () => {} });
    expect(result).toBe(tbody);
    expect(tbody.style.outline).toContain('3px solid');
    vi.advanceTimersByTime(3000);
    expect(tbody.style.outline).toBe('');
  });

  it('restores a pre-existing outline instead of blanking it', () => {
    const tbody = document.querySelector('tbody')!;
    tbody.style.outline = '1px dotted blue';
    highlightHeaviest(heaviest, { durationMs: 100, log: () => {} });
    vi.advanceTimersByTime(100);
    expect(tbody.style.outline).toBe('1px dotted blue');
  });

  it('logs the element, selector and node count to the console', () => {
    const log = vi.fn();
    highlightHeaviest(heaviest, { durationMs: 100, log });
    expect(log).toHaveBeenCalledTimes(1);
    const args = log.mock.calls[0]!;
    expect(args[0]).toContain('div#grid > table > tbody');
    expect(args[0]).toContain('2 nodes');
    expect(args).toContain(document.querySelector('tbody'));
  });

  it('returns null and does nothing when there is nothing to highlight', () => {
    const log = vi.fn();
    expect(highlightHeaviest([], { durationMs: 100, log })).toBeNull();
    expect(highlightHeaviest([{ selector: 'section.nope', nodes: 1, depth: 1 }], { durationMs: 100, log })).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it('scrolls the element into view', () => {
    const tbody = document.querySelector('tbody')!;
    tbody.scrollIntoView = vi.fn();
    highlightHeaviest(heaviest, { durationMs: 100, log: () => {} });
    expect(tbody.scrollIntoView).toHaveBeenCalled();
  });
});
