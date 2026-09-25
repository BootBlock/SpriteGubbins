import { describe, expect, it } from 'vitest';
import { spokenList } from './spokenList.ts';

describe('spokenList', () => {
  it('joins with commas and a final “and”, and no serial comma', () => {
    expect(spokenList([])).toBe('');
    expect(spokenList(['head'])).toBe('head');
    expect(spokenList(['head', 'mantle'])).toBe('head and mantle');
    expect(spokenList(['head', 'body', 'hindquarters'])).toBe('head, body and hindquarters');
  });
});
