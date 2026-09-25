import { describe, expect, it } from 'vitest';
import { capitalised } from './capitalised.ts';

describe('capitalised', () => {
  it('raises the first letter alone', () => {
    expect(capitalised('')).toBe('');
    expect(capitalised('root masses')).toBe('Root masses');
    expect(capitalised('twenty-six')).toBe('Twenty-six');
    expect(capitalised('Heads')).toBe('Heads');
  });
});
