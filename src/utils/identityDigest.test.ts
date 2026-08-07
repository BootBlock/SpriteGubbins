import { describe, expect, it } from 'vitest';
import { withPaletteSegment } from './identityDigest.ts';

const PALETTE = ['#1E1E24', '#334155', '#F59E0B'];

describe('withPaletteSegment', () => {
  it('adds the palette to an empty digest without a leading separator', () => {
    expect(withPaletteSegment('', PALETTE)).toBe('Palette: #1E1E24, #334155, #F59E0B');
  });

  it('keeps the prose the user wrote', () => {
    // The digest is theirs. Only the palette line is derivable from the sheet, so only it is written.
    expect(withPaletteSegment('Cyan visor across upper face', PALETTE)).toBe(
      'Cyan visor across upper face; Palette: #1E1E24, #334155, #F59E0B',
    );
  });

  it('replaces an earlier palette rather than accumulating one', () => {
    // A rig is eight sheets read one after another. Two disagreeing palettes in a field that says
    // "reproduce exactly" is the failure this prevents.
    const once = withPaletteSegment('Three amber chest lights', ['#000000']);
    expect(withPaletteSegment(once, PALETTE)).toBe(
      'Three amber chest lights; Palette: #1E1E24, #334155, #F59E0B',
    );
  });

  it('recognises a palette segment the user has since edited by hand', () => {
    expect(withPaletteSegment('Bare hands;   palette:  #ABCDEF, #123456', PALETTE)).toBe(
      'Bare hands; Palette: #1E1E24, #334155, #F59E0B',
    );
  });

  it('moves the palette to the end when the user left prose after it', () => {
    expect(withPaletteSegment('Palette: #ABCDEF; Bare hands', PALETTE)).toBe(
      'Bare hands; Palette: #1E1E24, #334155, #F59E0B',
    );
  });

  it('removes the segment rather than emitting an empty one', () => {
    // An empty `Palette:` in section 1 is exactly the content-shaped token the template's
    // optional-line rule exists to keep out of the highest-weighted part of the prompt.
    expect(withPaletteSegment('Bare hands; Palette: #ABCDEF', [])).toBe('Bare hands');
    expect(withPaletteSegment('', [])).toBe('');
  });

  it('drops the empty segments a stray separator leaves behind', () => {
    expect(withPaletteSegment('Bare hands;;', PALETTE)).toBe(
      'Bare hands; Palette: #1E1E24, #334155, #F59E0B',
    );
  });
});
