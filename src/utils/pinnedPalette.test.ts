import { describe, expect, it } from 'vitest';
import { DEFAULT_CUSTOM_PALETTE_NAME } from '../constants/customPalette.ts';
import { PALETTES } from '../constants/palettes/index.ts';
import { PALETTE_IDS } from '../types/palette.ts';
import { pinnedPalette } from './pinnedPalette.ts';

/**
 * Which palette a configuration has pinned.
 *
 * The one place that question is answered, so this is where the answer is held to account. Three
 * readers act on it — the compiled prompt, the quantiser and the studio's own budget control — and
 * each of their suites asserts what it then does; what is asserted here is that they are all asking
 * the same question.
 */

const CUSTOM = { name: 'Dusk Harbour', entries: ['#102030', '#405060'] };

describe('pinnedPalette', () => {
  it.each(PALETTE_IDS)('resolves %s the way the library declares it', (palette) => {
    // Completeness across the union, which is what keeps a new machine from resolving to nothing:
    // every id but the two machineless ones has a definition, and this returns exactly it.
    expect(pinnedPalette({ palette, customPalette: null })).toBe(PALETTES[palette]);
  });

  it('pins nothing for FREE, whatever colours are loaded', () => {
    // The colours survive a trip through the machines and back, so a reader who tries PICO-8 and
    // returns to their own palette has not lost it — but while FREE is chosen, nothing is pinned.
    expect(pinnedPalette({ palette: 'FREE', customPalette: CUSTOM })).toBeNull();
  });

  it('pins nothing for CUSTOM until something is loaded', () => {
    // Choosing the option is not pinning a palette. Answering it here is what makes the prompt keep
    // its budget line and the studio keep the budget control, with no second rule in either.
    expect(pinnedPalette({ palette: 'CUSTOM', customPalette: null })).toBeNull();
  });

  it('hands the reader’s colours over as the fixed list they are', () => {
    const palette = pinnedPalette({ palette: 'CUSTOM', customPalette: CUSTOM });

    expect(palette?.id).toBe('CUSTOM');
    expect(palette?.name).toBe('Dusk Harbour');
    expect(palette?.space).toEqual({ kind: 'FIXED', entries: CUSTOM.entries, approximates: null });
  });

  it('invents none of the three things only hardware can state', () => {
    // A machine's palette carries what its hardware imposed: a rendering caveat, an on-screen count,
    // a per-sprite count, and a sentence about how the palette was divided up. A file states none of
    // them, and a plausible figure here would reach the prompt as a constraint nobody asked for.
    const palette = pinnedPalette({ palette: 'CUSTOM', customPalette: CUSTOM });

    expect(palette?.onScreenColors).toBeNull();
    expect(palette?.colorsPerComponent).toBeNull();
    expect(palette?.note).toBe('');
  });

  it('names a palette the reader left nameless, for the sentence that needs one', () => {
    // Section 2 says "one of the 24 colours of", and that sentence has to end somewhere. The stored
    // value stays empty; the default is applied where it is read.
    const palette = pinnedPalette({ palette: 'CUSTOM', customPalette: { name: '  ', entries: ['#102030'] } });

    expect(palette?.name).toBe(DEFAULT_CUSTOM_PALETTE_NAME);
  });
});
