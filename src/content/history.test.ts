import { History } from './history';

describe('History ring buffer', () => {
  it('returns samples in insertion order while under capacity', () => {
    const h = new History(4);
    h.push(1); h.push(2); h.push(3);
    expect(h.values()).toEqual([1, 2, 3]);
  });

  it('drops the oldest sample once capacity is exceeded', () => {
    const h = new History(3);
    [1, 2, 3, 4, 5].forEach((v) => h.push(v));
    expect(h.values()).toEqual([3, 4, 5]);
  });

  it('exposes min and max of the retained window only', () => {
    const h = new History(3);
    [100, 1, 2, 3].forEach((v) => h.push(v));
    expect(h.min()).toBe(1);
    expect(h.max()).toBe(3);
  });

  it('reports zero min/max and empty values when nothing was pushed', () => {
    const h = new History(3);
    expect(h.values()).toEqual([]);
    expect(h.min()).toBe(0);
    expect(h.max()).toBe(0);
  });

  it('exposes the latest sample', () => {
    const h = new History(2);
    expect(h.latest()).toBeUndefined();
    h.push(7); h.push(9);
    expect(h.latest()).toBe(9);
  });
});
