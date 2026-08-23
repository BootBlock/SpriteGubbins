import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { gplText, hexListText } from './paletteText.ts';

const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };

describe('gplText', () => {
  it('opens with the magic line every reader of the format looks for', () => {
    expect(gplText('armour', [GREEN]).split('\n')[0]).toBe('GIMP Palette');
  });

  it('records the palette’s own name and leaves the layout to the reading application', () => {
    const lines = gplText('Locked from armour', [GREEN]).split('\n');

    expect(lines[1]).toBe('Name: Locked from armour');
    expect(lines[2]).toBe('Columns: 0');
    expect(lines[3]).toBe('#');
  });

  it('writes three padded channels, a tab, and the entry’s own hex', () => {
    const lines = gplText('armour', [GREEN, BLACK]).split('\n');

    expect(lines[4]).toBe(' 40 160  60\t#28A03C');
    expect(lines[5]).toBe('  0   0   0\t#000000');
  });

  it('ends with a newline, so the last entry is a whole line', () => {
    expect(gplText('armour', [GREEN]).endsWith('#28A03C\n')).toBe(true);
  });

  it('writes a header and nothing else for a palette with no entries', () => {
    expect(gplText('armour', [])).toBe('GIMP Palette\nName: armour\nColumns: 0\n#\n');
  });
});

describe('hexListText', () => {
  it('writes one hex value per line and nothing else', () => {
    expect(hexListText([GREEN, BLACK])).toBe('#28A03C\n#000000\n');
  });

  it('writes nothing at all for a palette with no entries', () => {
    expect(hexListText([])).toBe('');
  });
});
