import { sparklinePoints, budgetLineY } from './sparkline';

describe('sparklinePoints', () => {
  it('returns no points for an empty series', () => {
    expect(sparklinePoints([], 100, 20)).toEqual([]);
  });

  it('spreads samples evenly across the width and maps min to the bottom, max to the top', () => {
    const pts = sparklinePoints([0, 5, 10], 100, 24, 2);
    expect(pts.map((p) => p.x)).toEqual([2, 50, 98]);
    expect(pts[0]!.y).toBe(22); // min -> bottom (height - pad)
    expect(pts[2]!.y).toBe(2); // max -> top (pad)
    expect(pts[1]!.y).toBe(12);
  });

  it('draws a flat series in the middle instead of dividing by zero', () => {
    const pts = sparklinePoints([7, 7, 7], 100, 24, 2);
    expect(pts.every((p) => p.y === 12)).toBe(true);
  });

  it('stretches the scale to a ceiling above the data when given', () => {
    const pts = sparklinePoints([0, 50], 100, 24, 2, 100);
    expect(pts[1]!.y).toBe(12); // 50 of 100 -> halfway
  });
});

describe('budgetLineY', () => {
  it('positions the budget on the same scale as the points', () => {
    expect(budgetLineY([0, 50], 100, 24, 2)).toBe(2); // budget above data becomes the ceiling
    expect(budgetLineY([0, 200], 100, 24, 2)).toBe(12); // budget inside data range
  });

  it('is undefined when the data is far below the budget (line would flatten the chart)', () => {
    expect(budgetLineY([10, 20], 1000, 24, 2)).toBeUndefined();
  });
});
