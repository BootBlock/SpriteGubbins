import { describe, expect, it } from 'vitest';
import { uniqueNamesWithin } from './uniqueNamesWithin.ts';

/**
 * The per-scope name rule a library-pack import applies: a later repeat is renamed, never dropped,
 * and nothing is renamed onto a name the file already uses.
 */

interface Entry {
  readonly id: string;
  readonly scope: string;
  readonly name: string;
}

const byScope = (entry: Entry) => entry.scope;

function names(entries: readonly Entry[], maxLength?: number): string[] {
  return uniqueNamesWithin(entries, byScope, maxLength).map((entry) => entry.name);
}

describe('uniqueNamesWithin', () => {
  it('leaves entries alone when every name is unique in its scope', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Hero' },
      { id: 'b', scope: 'two', name: 'Hero' },
    ];

    expect(uniqueNamesWithin(entries, byScope)).toEqual(entries);
  });

  it('keeps the first of a repeated name and numbers the later ones', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Hero' },
      { id: 'b', scope: 'one', name: 'Hero' },
      { id: 'c', scope: 'one', name: 'Hero' },
    ];

    expect(names(entries)).toEqual(['Hero', 'Hero (2)', 'Hero (3)']);
  });

  it('treats names that differ only in case or spacing as one name', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Hero' },
      { id: 'b', scope: 'one', name: ' hero ' },
    ];

    expect(names(entries)).toEqual(['Hero', 'hero (2)']);
  });

  it('never renames onto a name the file already uses further down', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Hero' },
      { id: 'b', scope: 'one', name: 'Hero' },
      { id: 'c', scope: 'one', name: 'Hero (2)' },
    ];

    expect(names(entries)).toEqual(['Hero', 'Hero (3)', 'Hero (2)']);
  });

  it('numbers a repeat of a numbered name from its base', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Hero (2)' },
      { id: 'b', scope: 'one', name: 'Hero (2)' },
    ];

    expect(names(entries)).toEqual(['Hero (2)', 'Hero (3)']);
  });

  it('leaves blank names alone, since a blank name clashes with nothing', () => {
    const entries = [
      { id: 'a', scope: 'one', name: '' },
      { id: 'b', scope: 'one', name: ' ' },
    ];

    expect(names(entries)).toEqual(['', ' ']);
  });

  it('shortens the name rather than the suffix to fit a length limit', () => {
    const entries = [
      { id: 'a', scope: 'one', name: 'Harbour Town' },
      { id: 'b', scope: 'one', name: 'Harbour Town' },
    ];

    expect(names(entries, 12)).toEqual(['Harbour Town', 'Harbour (2)']);
  });

  it('keeps the entry’s other fields', () => {
    const [, renamed] = uniqueNamesWithin(
      [
        { id: 'a', scope: 'one', name: 'Hero' },
        { id: 'b', scope: 'one', name: 'Hero' },
      ],
      byScope,
    );

    expect(renamed).toEqual({ id: 'b', scope: 'one', name: 'Hero (2)' });
  });
});
