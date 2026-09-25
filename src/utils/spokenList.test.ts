import { describe, expect, it } from 'vitest';
import { spokenList } from './spokenList.ts';

describe('spokenList', () => {
  it('says one item as itself, and nothing as nothing', () => {
    expect(spokenList(['a head'])).toBe('a head');
    expect(spokenList([])).toBe('');
  });

  it('joins the last item with “and” and the others with commas, without a serial comma', () => {
    expect(spokenList(['arms', 'legs'])).toBe('arms and legs');
    expect(spokenList(['trunk', 'arms', 'forelegs'])).toBe('trunk, arms and forelegs');
  });
});
