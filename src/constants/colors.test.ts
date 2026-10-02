import { describe, expect, it } from 'vitest';
import { COLOR_HEX_MAP } from './colors.ts';

describe('COLOR_HEX_MAP', () => {
  it('gives every colour name a value of its own', () => {
    // `tan` and `bronze` once shared `#d97706`, and `gold` and `amber` `#f59e0b`, so the
    // "Dust Tan & Faded Denim" palette previewed in bronze's orange. Two names with one value means
    // one swatch lies.
    const namesByValue = new Map<string, string[]>();
    for (const [name, hex] of Object.entries(COLOR_HEX_MAP)) {
      const value = hex.toLowerCase();
      namesByValue.set(value, [...(namesByValue.get(value) ?? []), name]);
    }
    const shared = [...namesByValue].filter(([, names]) => names.length > 1);

    expect(shared).toEqual([]);
  });
});
