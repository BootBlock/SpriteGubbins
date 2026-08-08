import { describe, expect, it } from 'vitest';
import { withPaletteSegment, withSegments } from './identityDigest.ts';

const PALETTE = ['#1E1E24', '#334155', '#F59E0B'];

describe('withPaletteSegment', () => {
  it('adds the palette to an empty digest without a leading separator', () => {
    expect(withPaletteSegment('', PALETTE)).toBe('Palette: #1E1E24, #334155, #F59E0B');
  });

  it('keeps the prose the user wrote', () => {
    // The digest is theirs. The palette is derived from the sheet, so only it is written.
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

  it('leaves the palette where the user put it, prose and all', () => {
    // Replacement is in place. A fold that re-appended would reshuffle the line on every press, so
    // the same content would take a different shape depending on which control was pressed last.
    expect(withPaletteSegment('Palette: #ABCDEF; Bare hands', PALETTE)).toBe(
      'Palette: #1E1E24, #334155, #F59E0B; Bare hands',
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

describe('withSegments', () => {
  const FORM = { label: 'Form', value: 'Human, Athletic & Slender' };
  const COLOUR = { label: 'Colour', value: 'Crimson Red & Black' };

  it('appends several segments in the order they are given', () => {
    expect(withSegments('Bare hands', [FORM, COLOUR])).toBe(
      'Bare hands; Form: Human, Athletic & Slender; Colour: Crimson Red & Black',
    );
  });

  it('is idempotent — the second press produces exactly the first press', () => {
    // The property the whole mechanism rests on: a control that is safe to press twice.
    const once = withSegments('Bare hands', [FORM, COLOUR]);
    expect(withSegments(once, [FORM, COLOUR])).toBe(once);
  });

  it('leaves the other control’s segments where they are, which is what in-place buys', () => {
    // Per-control idempotence would hold under a fold that re-appended too. What position stability
    // adds is that pressing *this* control does not shuffle what the *other* one wrote: re-describing
    // the subject must not push the palette to the end of a line the user has been editing.
    const both = withPaletteSegment(withSegments('Bare hands', [FORM, COLOUR]), PALETTE);
    expect(withSegments(both, [FORM, COLOUR])).toBe(both);
    expect(withPaletteSegment(both, PALETTE)).toBe(both);
  });

  it('demotes a separator inside a value rather than letting it split the segment', () => {
    // Subject fields are unfiltered free text, and `;` is the character the identity lock's own
    // placeholder joins clauses with. Written through raw, the tail comes back as a segment of its
    // own and every press re-emits the whole value beside it — the digest grows without bound.
    const worn = { label: 'Features', value: 'Holstered sidearm; utility pouch' };
    const once = withSegments('', [worn]);

    expect(once).toBe('Features: Holstered sidearm, utility pouch');
    expect(withSegments(once, [worn])).toBe(once);
  });

  it('removes a segment whose value was nothing but separators', () => {
    // Emptiness is judged after the demotion above, so a value with no content left cannot write a
    // labelled segment stating nothing.
    expect(withSegments('Bare hands; Form: Orc Warrior', [{ label: 'Form', value: ' ; ; ' }])).toBe(
      'Bare hands',
    );
  });

  it('rewrites each segment in place, leaving the ones it does not own alone', () => {
    const digest = 'Form: Orc Warrior; Bare hands; Palette: #ABCDEF; Colour: Emerald Green';
    expect(withSegments(digest, [FORM, COLOUR])).toBe(
      'Form: Human, Athletic & Slender; Bare hands; Palette: #ABCDEF; Colour: Crimson Red & Black',
    );
  });

  it('survives being folded either way round', () => {
    // Either control may be pressed first, and whichever it is must keep everything the other wrote.
    // The *order* does depend on which came first — that is what appending a genuinely new segment
    // means — and each of the two shapes is then stable, which the case above is what pins.
    const proseFirst = withPaletteSegment(withSegments('', [FORM, COLOUR]), PALETTE);
    expect(withSegments(withPaletteSegment('', PALETTE), [FORM, COLOUR])).toBe(
      'Palette: #1E1E24, #334155, #F59E0B; Form: Human, Athletic & Slender; Colour: Crimson Red & Black',
    );
    expect(proseFirst).toBe(
      'Form: Human, Athletic & Slender; Colour: Crimson Red & Black; Palette: #1E1E24, #334155, #F59E0B',
    );
  });

  it('removes only the segments whose value has emptied', () => {
    const digest = 'Form: Orc Warrior; Bare hands; Colour: Emerald Green';
    expect(withSegments(digest, [{ ...FORM, value: '' }, COLOUR])).toBe(
      'Bare hands; Colour: Crimson Red & Black',
    );
  });

  it('collapses a label the digest carries twice into one segment', () => {
    // Hand-editing and pasting are how a digest ends up with two `Form:` segments, and writing the
    // new value into both would put the same claim in "reproduce exactly" twice.
    expect(withSegments('Form: Orc Warrior; Bare hands; Form: High Elf', [FORM])).toBe(
      'Form: Human, Athletic & Slender; Bare hands',
    );
  });

  it('matches a label whatever case and spacing the user left it in', () => {
    expect(withSegments('  form:   Orc Warrior  ', [FORM])).toBe('Form: Human, Athletic & Slender');
  });

  it('does not mistake a segment that merely starts with the label for that label', () => {
    // The colon is what makes the match a label rather than a prefix, and prose is free to open with
    // any word at all.
    expect(withSegments('Formidable shoulder plating', [FORM])).toBe(
      'Formidable shoulder plating; Form: Human, Athletic & Slender',
    );
  });
});
