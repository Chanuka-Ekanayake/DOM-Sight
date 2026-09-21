export interface Point {
  x: number;
  y: number;
}

function scale(values: number[], height: number, pad: number, ceiling?: number) {
  const min = Math.min(...values);
  const max = Math.max(...values, ceiling ?? -Infinity);
  const innerH = height - pad * 2;
  if (max === min) return () => pad + innerH / 2; // flat series: centre it
  return (v: number) => pad + innerH - ((v - min) / (max - min)) * innerH;
}

/** Maps samples to canvas coordinates; larger values sit higher. A flat series is centred. */
export function sparklinePoints(values: number[], width: number, height: number, pad = 2, ceiling?: number): Point[] {
  if (values.length === 0) return [];
  const y = scale(values, height, pad, ceiling);
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => ({ x: pad + i * stepX, y: y(v) }));
}

/** Whether the budget is close enough to the data to be worth drawing (within 2x of the peak). */
export function budgetCeiling(values: number[], budget: number): number | undefined {
  if (values.length === 0) return undefined;
  return Math.max(...values) >= budget / 2 ? budget : undefined;
}

/** Y of the budget line on the same scale `sparklinePoints` uses, or undefined if not drawable. */
export function budgetLineY(values: number[], budget: number, height: number, pad = 2): number | undefined {
  const ceiling = budgetCeiling(values, budget);
  if (ceiling === undefined) return undefined;
  return scale(values, height, pad, ceiling)(budget);
}

export function drawSparkline(
  ctx: CanvasRenderingContext2D,
  values: number[],
  width: number,
  height: number,
  color: string,
  budget?: number,
): void {
  ctx.clearRect(0, 0, width, height);
  if (values.length === 0) return;

  const ceiling = budget === undefined ? undefined : budgetCeiling(values, budget);
  const pts = sparklinePoints(values, width, height, 2, ceiling);

  if (budget !== undefined) {
    const y = budgetLineY(values, budget, height, 2);
    if (y !== undefined) {
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (pts.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}
