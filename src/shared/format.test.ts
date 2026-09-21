import { abbreviate } from './format';

describe('abbreviate', () => {
  it('keeps numbers under 1,000 as-is', () => {
    expect(abbreviate(0)).toBe('0');
    expect(abbreviate(999)).toBe('999');
  });
  it('uses one decimal below 10k', () => {
    expect(abbreviate(1234)).toBe('1.2k');
    expect(abbreviate(9870)).toBe('9.9k');
  });
  it('rounds to whole thousands up to a million', () => {
    expect(abbreviate(12_345)).toBe('12k');
    expect(abbreviate(999_499)).toBe('999k');
  });
  it('switches to millions', () => {
    expect(abbreviate(1_250_000)).toBe('1.3M');
  });
});
