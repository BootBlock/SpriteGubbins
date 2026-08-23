import { describe, expect, it } from 'vitest';
import { paletteFileName } from './paletteFileName.ts';

describe('paletteFileName', () => {
  it('names the file after the palette and marks it as a palette', () => {
    expect(paletteFileName('the Game Boy', 'png')).toBe('the-game-boy-palette.png');
  });

  it('strips the extension of a palette named after a file', () => {
    expect(paletteFileName('armour.png', 'gpl')).toBe('armour-palette.gpl');
  });

  it('keeps a dot that is part of the name rather than an extension', () => {
    expect(paletteFileName('armour v1.2 final.webp', 'txt')).toBe('armour-v1-2-final-palette.txt');
  });

  it('drops the suffix rather than the stem when the name slugs to nothing', () => {
    expect(paletteFileName('!!!', 'png')).toBe('palette.png');
  });
});
