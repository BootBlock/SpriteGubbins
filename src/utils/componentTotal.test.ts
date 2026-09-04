import { describe, expect, it } from 'vitest';
import type { ComponentEntry } from '../types/components.ts';
import { componentTotal } from './componentTotal.ts';

/** Three lines worth six components, which is what makes the sum different from the line count. */
const ENTRIES: readonly ComponentEntry[] = [
  { label: 'first', text: 'First ×3', count: 3, kind: 'tile' },
  { label: 'second', text: 'Second ×1', count: 1, kind: 'tile' },
  { label: 'third', text: 'Third ×2', count: 2, kind: 'tile' },
];

describe('componentTotal', () => {
  it('sums the counts rather than counting the lines', () => {
    expect(componentTotal(ENTRIES)).toBe(6);
    expect(componentTotal(ENTRIES)).not.toBe(ENTRIES.length);
  });

  it('answers zero for no entries', () => {
    // A group with no entries is not a plan this app ships, but the sum has to be the identity
    // rather than a throw: the plans compose it with other figures, and a special case there would
    // be arithmetic written twice again.
    expect(componentTotal([])).toBe(0);
  });
});
