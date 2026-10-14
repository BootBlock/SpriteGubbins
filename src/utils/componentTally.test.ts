import { describe, expect, it } from 'vitest';
import { componentTally } from './componentTally.ts';

describe('componentTally', () => {
  it('makes the noun agree with the count', () => {
    expect(componentTally(1)).toBe('1 component');
    expect(componentTally(0)).toBe('0 components');
    expect(componentTally(16)).toBe('16 components');
  });
});
