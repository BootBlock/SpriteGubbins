import { describe, expect, it } from 'vitest';
import { FLAT_PACK_LAYOUT, packLayout } from './packLayout.ts';

describe('packLayout', () => {
  // A facing, and an ordinal: the directional cores of an eight-compass batch draw four facings
  // each, so `sheetToken` names them by position, and they collide with each other on all three
  // names unless the word reaches here too.
  it.each(['south-west', 'sheet-2'])('names all three entry kinds after the word %s', (word) => {
    expect(packLayout(word)).toStrictEqual({
      sheetFile: `${word}-sheet.png`,
      manifestFile: `${word}-manifest.json`,
      spriteDirectory: word,
    });
  });

  it('keeps the sprite directory to itself, so an importer reading it meets only pieces', () => {
    // Why the word prefixes the two root files rather than the pack being rooted at `south/`: an
    // importer keyed by facing reads that directory as the sheet's pieces, so the sheet picture
    // would arrive there as a piece the rig never declared.
    const { sheetFile, manifestFile, spriteDirectory } = packLayout('south');

    expect(sheetFile.startsWith(`${spriteDirectory}/`)).toBe(false);
    expect(manifestFile.startsWith(`${spriteDirectory}/`)).toBe(false);
  });

  it('gives two sheets of one batch three distinct names each', () => {
    // The defect this exists to stop: several packs extracted into one root, all but one sheet and
    // all but one manifest overwritten. Compared as whole layouts, so fixing one of the three is not
    // enough — and across both kinds of word, since a batch mixes them.
    for (const [a, b] of [
      ['south', 'north'],
      ['sheet-1', 'sheet-2'],
      ['sheet-1', 'south'],
    ]) {
      const first = Object.values(packLayout(a ?? null));
      const second = Object.values(packLayout(b ?? null));

      expect(first.filter((name) => second.includes(name))).toStrictEqual([]);
    }
  });

  it('keeps the flat layout where nothing tells the sheet apart', () => {
    // A batch of one — a tileset, or a studio composing a single sheet. See `sheetToken`.
    expect(packLayout(null)).toBe(FLAT_PACK_LAYOUT);
    expect(FLAT_PACK_LAYOUT).toStrictEqual({
      sheetFile: 'sheet.png',
      manifestFile: 'manifest.json',
      spriteDirectory: 'sprites',
    });
  });
});
