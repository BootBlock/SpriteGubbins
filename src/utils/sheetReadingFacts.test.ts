import { describe, expect, it } from 'vitest';
import type { SheetFacts } from '../types/quantiser.ts';
import { sheetReadingFacts } from './sheetReadingFacts.ts';

const FACTS: SheetFacts = { scale: null, colors: 12 };

describe('sheetReadingFacts', () => {
  it('returns the facts of a reading that answered', () => {
    expect(sheetReadingFacts({ kind: 'facts', facts: FACTS })).toBe(FACTS);
  });

  it('returns nothing for a reading that is pending or failed', () => {
    expect(sheetReadingFacts({ kind: 'pending' })).toBeNull();
    expect(sheetReadingFacts({ kind: 'failed', cause: 'sheet' })).toBeNull();
    expect(sheetReadingFacts({ kind: 'failed', cause: 'thread' })).toBeNull();
  });
});
