import { describe, expect, it } from 'vitest';
import { gplText, hexListText } from './paletteText.ts';
import { parsePaletteText } from './parsePaletteText.ts';
import { fromHex } from './imageData.ts';
import type { Rgba } from '../types/quantiser.ts';

/**
 * Reading a palette out of the two text forms.
 *
 * The round trip through `paletteText.ts` is the case the feature exists for — a palette exported
 * from the Quantise tab, pinned back in the studio — and it is asserted against that writer's own
 * output rather than against a copy of it, so the two cannot drift apart. The rest is what other
 * tools write, and what a reader pastes.
 */

const ENTRIES: readonly Rgba[] = ['#102030', '#405060', '#9FD3C7'].map((hex) => {
  const color = fromHex(hex);
  if (color === null) throw new Error(`${hex} should parse.`);
  return color;
});

describe('parsePaletteText — the round trip', () => {
  it('reads back a .gpl this app wrote, with the name it recorded', () => {
    const reading = parsePaletteText(gplText('Dusk Harbour', ENTRIES), 'ignored');

    expect(reading.name).toBe('Dusk Harbour');
    expect(reading.entries).toEqual(['#102030', '#405060', '#9FD3C7']);
    expect(reading.problems).toEqual([]);
  });

  it('reads back a hex list this app wrote, taking the name from the caller', () => {
    // A hex list has no header, deliberately — everything that reads one reads it by pasting — so
    // the name can only come from the file it was in.
    const reading = parsePaletteText(hexListText(ENTRIES), 'dusk-harbour');

    expect(reading.name).toBe('dusk-harbour');
    expect(reading.entries).toEqual(['#102030', '#405060', '#9FD3C7']);
  });
});

describe('parsePaletteText — what other tools write', () => {
  it('reads a .gpl entry whose name is not its hex', () => {
    // GIMP writes `255   0   0 Red`, so a reader looking for hex digits finds none on the line and
    // loses the colour. The channels are the entry; the name after them is somebody else's label.
    const reading = parsePaletteText(
      'GIMP Palette\nName: Flag\n#\n255   0   0 Red\n  0 128   0 Green\n',
      'x',
    );

    expect(reading.entries).toEqual(['#FF0000', '#008000']);
    expect(reading.problems).toEqual([]);
  });

  it('refuses a .gpl channel past 255 rather than clamping it', () => {
    // Clamping would invent a colour the file does not state, and a line this app cannot read is a
    // line the reader should be told about.
    const reading = parsePaletteText('GIMP Palette\n300 0 0 Impossible\n', 'x');

    expect(reading.entries).toEqual([]);
    expect(reading.problems).toHaveLength(1);
  });

  it('takes a pasted list however it is spaced, with or without the hash', () => {
    const reading = parsePaletteText('102030, 405060\n#9fd3c7', '');

    expect(reading.entries).toEqual(['#102030', '#405060', '#9FD3C7']);
  });

  it('keeps one entry for a colour listed twice, in the place it was first listed', () => {
    const reading = parsePaletteText('#405060\n#102030\n#405060\n', '');

    expect(reading.entries).toEqual(['#405060', '#102030']);
  });

  it('does not find a colour inside a longer run of digits', () => {
    const reading = parsePaletteText('#FF00FF00\n', '');

    expect(reading.entries).toEqual([]);
  });
});

describe('parsePaletteText — what it reports', () => {
  it('names the line that stated no colour, and leaves the rest of the palette standing', () => {
    const reading = parsePaletteText('#102030\nrust orange\n#405060\n', '');

    expect(reading.entries).toEqual(['#102030', '#405060']);
    expect(reading.problems).toEqual(['Line 2 states no colour: “rust orange”']);
  });

  it('counts the rest rather than listing a whole file of them', () => {
    const reading = parsePaletteText('nope\n'.repeat(9), '');

    expect(reading.problems).toHaveLength(6);
    expect(reading.problems.at(-1)).toBe('…and 4 further lines that state no colour.');
  });

  it('says nothing about a blank line, in either form', () => {
    expect(parsePaletteText('#102030\n\n#405060\n', '').problems).toEqual([]);
    expect(parsePaletteText('GIMP Palette\n\n255 0 0\n', 'x').problems).toEqual([]);
  });

  it('clips a long line down in the report rather than filling the panel with it', () => {
    const reading = parsePaletteText('x'.repeat(80), '');

    expect(reading.problems[0]).toContain('…”');
    expect(reading.problems[0]?.length).toBeLessThan(80);
  });
});
