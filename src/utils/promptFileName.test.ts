import { describe, expect, it } from 'vitest';
import { promptFileName } from './promptFileName.ts';

describe('promptFileName', () => {
  it('names the file after the subject', () => {
    expect(promptFileName('Cybernetic Cyborg')).toBe('cybernetic-cyborg-prompt.md');
  });

  it('reduces anything a filesystem would refuse to a single hyphen', () => {
    // A species field is free text, and every one of these is illegal on at least one platform.
    expect(promptFileName('Knight / Paladin: "Elite"')).toBe('knight-paladin-elite-prompt.md');
  });

  it('keeps digits, which are part of plenty of real names', () => {
    expect(promptFileName('16-Bit Village Hero')).toBe('16-bit-village-hero-prompt.md');
  });

  it('never leaves a leading or trailing hyphen', () => {
    // Otherwise a subject ending in punctuation produces `knight--prompt.md`.
    expect(promptFileName('  ¡Knight!  ')).toBe('knight-prompt.md');
  });

  it('falls back rather than producing a file with no name', () => {
    // Empty is the studio's opening state, and punctuation alone reduces to the same thing — both
    // would otherwise be written out as `-prompt.md`.
    expect(promptFileName('')).toBe('sprite-prompt.md');
    expect(promptFileName('!!!')).toBe('sprite-prompt.md');
  });
});
