import { evaluate } from './budget';
import { DEFAULT_BUDGET } from '../shared/defaults';

describe('evaluate', () => {
  it('is green when all metrics are well under budget', () => {
    const r = evaluate({ nodes: 100, maxDepth: 5, widestParent: { selector: 'ul', children: 10 } }, DEFAULT_BUDGET);
    expect(r.status).toBe('green');
    expect(r.flags).toEqual({ nodes: 'green', depth: 'green', children: 'green' });
  });

  it('turns nodes amber at 60% of the node budget', () => {
    const r = evaluate({ nodes: 900 }, DEFAULT_BUDGET);
    expect(r.flags.nodes).toBe('amber');
    expect(r.status).toBe('amber');
  });

  it('turns nodes red at 100% of the node budget', () => {
    const r = evaluate({ nodes: 1500 }, DEFAULT_BUDGET);
    expect(r.flags.nodes).toBe('red');
    expect(r.status).toBe('red');
  });

  it('reports nodeRatio as nodes divided by budget, allowed to exceed 1', () => {
    expect(evaluate({ nodes: 3000 }, DEFAULT_BUDGET).nodeRatio).toBe(2);
    expect(evaluate({ nodes: 750 }, DEFAULT_BUDGET).nodeRatio).toBe(0.5);
  });

  it('overall status is the worst of the individual flags', () => {
    const r = evaluate({ nodes: 10, maxDepth: 40, widestParent: { selector: 'div', children: 40 } }, DEFAULT_BUDGET);
    expect(r.flags).toEqual({ nodes: 'green', depth: 'red', children: 'amber' });
    expect(r.status).toBe('red');
  });

  it('treats unmeasured metrics as green with a zero node ratio', () => {
    const r = evaluate({}, DEFAULT_BUDGET);
    expect(r.status).toBe('green');
    expect(r.nodeRatio).toBe(0);
  });
});
