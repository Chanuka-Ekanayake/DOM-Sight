/** 1234 -> "1.2k", 12345 -> "12k", 1250000 -> "1.3M" — the toolbar badge fits ~4 characters. */
export function abbreviate(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
