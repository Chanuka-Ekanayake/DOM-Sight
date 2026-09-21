import { buildSnapshot } from './report';
import { DEFAULT_BUDGET } from '../shared/defaults';
import { History } from './history';

describe('buildSnapshot', () => {
  const metrics = {
    nodes: 4200,
    maxDepth: 12,
    widestParent: { selector: 'tbody', children: 400 },
    heaviest: [{ selector: 'div#grid > tbody', nodes: 4120, depth: 9 }],
    fps: 58,
  };

  it('captures url, budget, metrics, status, heaviest and history', () => {
    const h = new History(3);
    [10, 20, 30].forEach((v) => h.push(v));
    const s = buildSnapshot({ url: 'https://example.test/page', metrics, budget: DEFAULT_BUDGET, status: 'red', history: h });
    expect(s.url).toBe('https://example.test/page');
    expect(s.budget).toEqual(DEFAULT_BUDGET);
    expect(s.metrics).toEqual(metrics);
    expect(s.status).toBe('red');
    expect(s.heaviest).toEqual(metrics.heaviest);
    expect(s.history).toEqual([10, 20, 30]);
  });

  it('stamps an ISO-8601 timestamp', () => {
    const s = buildSnapshot({ url: 'x', metrics, budget: DEFAULT_BUDGET, status: 'green', history: new History(1) });
    expect(() => new Date(s.timestamp).toISOString()).not.toThrow();
    expect(s.timestamp).toBe(new Date(s.timestamp).toISOString());
  });

  it('uses an empty heaviest list when the shape walk has not run yet', () => {
    const s = buildSnapshot({ url: 'x', metrics: { nodes: 1 }, budget: DEFAULT_BUDGET, status: 'green', history: new History(1) });
    expect(s.heaviest).toEqual([]);
  });

  it('serialises to JSON round-trip without loss', () => {
    const s = buildSnapshot({ url: 'x', metrics, budget: DEFAULT_BUDGET, status: 'amber', history: new History(1) });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
