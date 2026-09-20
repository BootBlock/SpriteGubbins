import { describe, expect, it } from 'vitest';
import type { Palette } from '../../types/palette.ts';
import { describePalette } from './hardware.ts';

/**
 * Section 2's palette block, asserted on the function rather than through a compiled prompt.
 *
 * `promptCompiler.test.ts` checks what the block *says* under each machine, which is the claim that
 * matters to a reader. What it cannot check is the block's **shape**: the prompt embeds it between
 * headings, so a part left empty is trimmed away by every locator that finds the block, and an
 * assertion made there passes whether or not the empty part was dropped. This suite holds the
 * function to its own output, where that difference is visible.
 */

/** A palette the reader loaded: a list, no machine, and therefore none of a machine's three facts. */
function loaded(entries: readonly string[]): Palette {
  return {
    id: 'CUSTOM',
    name: 'Dusk Harbour',
    label: 'Dusk Harbour',
    space: { kind: 'FIXED', entries, approximates: null },
    onScreenColors: null,
    colorsPerComponent: null,
    note: '',
  };
}

describe('describePalette', () => {
  it('ends on its last sentence when the palette has no note to close with', () => {
    // The part that is empty for every custom palette and for no machine. Joined rather than
    // dropped, it leaves a blank paragraph between the entries and whatever section follows.
    const text = describePalette(loaded(['#102030', '#405060']), null);

    expect(text).toBe(text.trimEnd());
    expect(text).not.toContain('\n\n\n');
  });

  it('keeps a machine’s own closing sentence', () => {
    // The other half of the same branch: dropping empty parts must not drop a part that has words
    // in it, which is what the filter would do if it tested the wrong thing.
    const machine = { ...loaded(['#102030']), note: 'The backdrop entry is shared.' };

    expect(describePalette(machine, null).endsWith('The backdrop entry is shared.')).toBe(true);
  });

  it('counts a single colour in the singular', () => {
    // Unreachable until a palette could be the reader's own: no machine in the library holds fewer
    // than four entries.
    expect(describePalette(loaded(['#102030']), null)).toContain('exactly one of the 1 colour of');
  });

  it('names the palette as its own set where it has a name of its own', () => {
    expect(describePalette(loaded(['#102030', '#405060']), null)).toContain(
      'one of the 2 colours of Dusk Harbour, listed below',
    );
  });
});
