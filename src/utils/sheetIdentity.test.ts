import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { DIRECTION_SETS } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { sheetBatch } from './sheetBatch.ts';
import { sheetIdentity } from './sheetIdentity.ts';

/**
 * What a downloaded manifest says the sheet is.
 *
 * The two halves are pinned separately — `componentSlots.test.ts` for the names, `sheetBatch.test.ts`
 * for the batch — and what can only be checked here is that they are read off the *same* sheet: a
 * manifest whose names came from one position in the batch and whose ordinal came from another would
 * be wrong in a way nothing on screen shows.
 */

const config = (overrides: Partial<OutputConfig> = {}): OutputConfig => ({
  ...DEFAULT_OUTPUT_CONFIG,
  ...overrides,
});

/** Every sheet of the ten-generation character, as the configuration that composes each of them. */
function eightCompassCharacter(): readonly OutputConfig[] {
  const batch = config({ directions: 'EIGHT_COMPASS' });
  return sheetBatch('CHARACTER', batch).sheets.map((sheet) => ({ ...batch, ...sheet.output }));
}

describe('sheetIdentity', () => {
  it('names the sheet the studio is composing, and its place in the batch', () => {
    const { sheet } = sheetIdentity('CHARACTER', config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }), '');

    expect(sheet).toMatchObject({
      category: 'CHARACTER',
      plan: 'Directional core — cardinal facings',
      ordinal: 1,
      // Two core sheets and one articulation run per facing: the eight-compass character is the
      // batch this whole feature is measured against.
      total: 10,
      components: 12,
    });
    expect(sheet?.facings).toStrictEqual(['south', 'west', 'north', 'east']);
  });

  it('gives one name per component, in the inventory’s own order', () => {
    const { names, sheet } = sheetIdentity(
      'CHARACTER',
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }),
      '',
    );

    // The property a manifest's naming rests on: as many names as the prompt asked for components.
    expect(names).toHaveLength(sheet?.components ?? -1);
    expect(names.slice(0, 2)).toStrictEqual(['heads-south', 'heads-west']);
  });

  it('follows the studio to the next sheet of the batch', () => {
    const { names, sheet } = sheetIdentity(
      'CHARACTER',
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 1 }),
      '',
    );

    expect(sheet).toMatchObject({ ordinal: 2, components: 12 });
    // The diagonal half of the core, which is the sheet the studio is now on.
    expect(names.slice(0, 1)).toStrictEqual(['heads-south-west']);
  });

  describe('the facing a download is named by', () => {
    it('gives each run of an eight-compass rig its own facing', () => {
      // The batch this whole feature is measured against: two core sheets, then one run per facing.
      // The runs are what a reader downloads eight of, and until this they were eight archives of
      // fifteen identically-named files.
      const facings = eightCompassCharacter().map((output) => sheetIdentity('CHARACTER', output, '').facing);

      expect(facings).toStrictEqual([
        null,
        null,
        'south',
        'south-west',
        'west',
        'north-west',
        'north',
        'north-east',
        'east',
        'south-east',
      ]);
    });

    it('withholds it from a sheet that draws several facings', () => {
      // The two core sheets above. A sheet covering four facings is not any one of them, so the
      // download falls back to the ordinal rather than claiming the first.
      const { facing, sheet } = sheetIdentity(
        'CHARACTER',
        config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }),
        '',
      );

      expect(sheet?.facings).toHaveLength(4);
      expect(facing).toBeNull();
    });

    it('withholds it where the batch is one sheet, which has nothing to be told apart from', () => {
      // A ground tile narrows every stored set to a single direction and produces one sheet, so a
      // per-facing tree would always hold exactly one directory.
      const { sheet, facing } = sheetIdentity('TERRAIN', config({ directions: 'EIGHT_COMPASS' }), '');

      expect(sheet?.total).toBe(1);
      expect(facing).toBeNull();
    });

    it('withholds it where two sheets of a batch draw the same lone facing', () => {
      // FONT is four sheets of glyphs, every one of them at `front`: the facing is real and names
      // none of them. Naming the files by it would give four downloads one name.
      const sheets = [0, 1, 2, 3].map((sheetIndex) => sheetIdentity('FONT', config({ sheetIndex }), ''));

      expect(sheets.map((entry) => entry.sheet?.facings)).toStrictEqual([
        ['front'],
        ['front'],
        ['front'],
        ['front'],
      ]);
      expect(sheets.map((entry) => entry.facing)).toStrictEqual([null, null, null, null]);
    });

    it('never gives two sheets of one batch the same facing, over every pairing there is', () => {
      // The property the whole change rests on, swept rather than argued: a name two downloads share
      // is the failure this replaced, so it may not be reintroduced by a plan, a mode or a set that
      // nobody had in mind here. Every category, mode and direction set, which is every batch the
      // studio can compose.
      for (const category of SUBJECT_CATEGORIES) {
        for (const directionalMode of DIRECTIONAL_MODES) {
          for (const directions of DIRECTION_SETS) {
            const batch = config({ directionalMode, directions });
            const named = sheetBatch(category, batch)
              .sheets.map((sheet) => sheetIdentity(category, { ...batch, ...sheet.output }, '').facing)
              .filter((facing): facing is string => facing !== null);

            expect(new Set(named).size, `${category} / ${directionalMode} / ${directions}`).toBe(
              named.length,
            );
          }
        }
      }
    });
  });

  it('counts the subject’s own anatomy, which the sheet contracts for too', () => {
    const { names, sheet } = sheetIdentity(
      'CREATURE',
      config({ directions: 'FOUR_CARDINAL', sheetIndex: 0 }),
      'Tail ×1',
    );

    expect(names).toContain('tail-south');
    expect(names).toHaveLength(sheet?.components ?? -1);
  });
});
