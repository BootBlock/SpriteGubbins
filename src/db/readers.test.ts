import { describe, expect, it } from 'vitest';
import { isRecord } from './readers.ts';

/**
 * The one narrowing primitive whose answer is not obvious from its name.
 *
 * Everything else here is a `typeof` test against a named field. `isRecord` decides what "a
 * record" means for every parser built on it, and JavaScript's own answer — `typeof [] ===
 * 'object'` — is not the one any of them wants.
 */
describe('isRecord', () => {
  it('accepts a plain object, empty or not', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ id: 'x' })).toBe(true);
  });

  it('refuses an array, which JavaScript alone would call an object', () => {
    // The failure this prevents: a parser that repairs field by field reads `[]` as a record with
    // no keys and returns a full set of defaults, so a foreign file arrives looking like a
    // complete, deliberate record. `parseImportedQuantisePreset` is the caller that depends on it.
    expect(isRecord([])).toBe(false);
    expect(isRecord([{ id: 'x' }])).toBe(false);
  });

  it('refuses null and the primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord('a string')).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});
