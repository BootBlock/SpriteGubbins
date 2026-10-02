import { describe, expect, it } from 'vitest';
import { spokenIconState } from './spokenIconState.ts';

describe('spokenIconState', () => {
  it('says a hyphenated state as words, and a plain one as it is', () => {
    expect(spokenIconState('not-ready')).toBe('not ready');
    expect(spokenIconState('muted')).toBe('muted');
  });
});
