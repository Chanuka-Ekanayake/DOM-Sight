import { PAGE_TYPE_PRESETS, presetIdForNodes, CUSTOM_PRESET_ID } from './presets';
import { DEFAULT_BUDGET } from './defaults';

describe('PAGE_TYPE_PRESETS', () => {
  it('lists page types in ascending budget order', () => {
    const values = PAGE_TYPE_PRESETS.map((p) => p.nodes);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('has unique ids and none collides with the custom sentinel', () => {
    const ids = PAGE_TYPE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(CUSTOM_PRESET_ID);
  });

  it('starts at the Lighthouse default so the out-of-the-box budget maps to a page type', () => {
    expect(PAGE_TYPE_PRESETS[0]!.nodes).toBe(DEFAULT_BUDGET.nodes);
  });

  it('gives every preset a label and a hint describing when to use it', () => {
    for (const p of PAGE_TYPE_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.hint.length).toBeGreaterThan(0);
    }
  });
});

describe('presetIdForNodes', () => {
  it('returns the id of an exactly matching preset', () => {
    for (const p of PAGE_TYPE_PRESETS) expect(presetIdForNodes(p.nodes)).toBe(p.id);
  });

  it('returns the custom sentinel for a hand-typed value', () => {
    expect(presetIdForNodes(1234)).toBe(CUSTOM_PRESET_ID);
    expect(presetIdForNodes(0)).toBe(CUSTOM_PRESET_ID);
  });
});
