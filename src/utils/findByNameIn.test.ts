import { describe, expect, it } from 'vitest';
import { findByNameIn } from './findByNameIn.ts';

const records = [
  { id: 'a', projectId: 'castle', name: 'Hero' },
  { id: 'b', projectId: 'harbour', name: 'Hero' },
  { id: 'c', projectId: 'harbour', name: 'Harbour Guard' },
];

describe('findByNameIn', () => {
  it('finds the record of that name inside the project asked about, and not another project’s', () => {
    expect(findByNameIn(records, 'harbour', 'Hero')?.id).toBe('b');
    expect(findByNameIn(records, 'castle', 'Hero')?.id).toBe('a');
  });

  it('compares names as findByName does, trimmed and without regard to case', () => {
    expect(findByNameIn(records, 'harbour', '  harbour guard ')?.id).toBe('c');
  });

  it('returns undefined where the project holds no record of that name', () => {
    expect(findByNameIn(records, 'castle', 'Harbour Guard')).toBeUndefined();
    expect(findByNameIn(records, 'nowhere', 'Hero')).toBeUndefined();
  });
});
