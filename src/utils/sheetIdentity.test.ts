import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { DIRECTION_SETS } from '../types/rendering.ts';
import type { RigContract } from '../types/rigContract.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { sheetBatch } from './sheetBatch.ts';
import { sheetIdentity } from './sheetIdentity.ts';
import { assemblyBaseSubjectsOf } from '../test/assemblyBaseSubjects.ts';
import { standardSubject } from '../test/sheetSubject.ts';

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

/** Two slots of the engine's humanoid rig, which is a whole contract for everything asked here. */
const CONTRACT: RigContract = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'pelvis',
      pack_piece_name: 'pelvis',
      parent_slot: '',
      piece_size: { width: 20, height: 12 },
      piece_pivot: { x: 10, y: 6 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -48 },
    },
    {
      slot_id: 'upper_arm_l',
      pack_piece_name: 'left-upper-arm',
      parent_slot: 'torso',
      piece_size: { width: 8, height: 22 },
      piece_pivot: { x: 4, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -78 },
    },
  ],
};

/** Every sheet of the ten-generation character, as the configuration that composes each of them. */
function eightCompassCharacter(): readonly OutputConfig[] {
  const batch = config({ directions: 'EIGHT_COMPASS' });
  return sheetBatch('CHARACTER', standardSubject(), batch).sheets.map((sheet) => ({
    ...batch,
    ...sheet.output,
  }));
}

describe('sheetIdentity', () => {
  it('names the sheet the studio is composing, and its place in the batch', () => {
    const { sheet } = sheetIdentity(
      'CHARACTER',
      standardSubject(),
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }),
      '',
    );

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
      standardSubject(),
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
      standardSubject(),
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 1 }),
      '',
    );

    expect(sheet).toMatchObject({ ordinal: 2, components: 12 });
    // The diagonal half of the core, which is the sheet the studio is now on.
    expect(names.slice(0, 1)).toStrictEqual(['heads-south-west']);
  });

  it('records the rig the sheet itself demands, not the field beside it', () => {
    // A rig-pieces sheet fixes its own rig, and it is the sheet whose bottom-centre pivots are all
    // the wrong end — so the manifest has to say `CUTOUT_RIG` here however `rigMode` was stored.
    const { sheet } = sheetIdentity(
      'CHARACTER',
      standardSubject(),
      config({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', rigMode: 'POSE_LIBRARY' }),
      '',
    );

    expect(sheet?.rigMode).toBe('CUTOUT_RIG');
  });

  it('degrades a rig the category cannot honour, as every other digest does', () => {
    // A stored pairing from an older build, a preset or a hand-edited export: TERRAIN articulates
    // about nothing, so a manifest claiming a rig for it would be a claim the prompt never made.
    const { sheet } = sheetIdentity('TERRAIN', standardSubject(), config({ rigMode: 'CUTOUT_RIG' }), '');

    expect(sheet?.rigMode).toBe('NONE');
  });

  describe('the rig contract the sheet was drawn against', () => {
    it('records the whole contract on the sheet whose inventory is the rig', () => {
      // Every field, because the version is the *format's*: it does not move when a slot's size or
      // pivot does, so a pack drawn against a superseded revision of one rig is otherwise
      // indistinguishable from a current one. The slots are what tell the two apart.
      const { names, sheet } = sheetIdentity(
        'CHARACTER',
        standardSubject(),
        config({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', rigContract: CONTRACT }),
        '',
      );

      expect(sheet?.rigContract).toStrictEqual(CONTRACT);
      // The same contract the inventory came from, which is what makes the record a statement about
      // this sheet rather than about the configuration it was composed under.
      expect(names).toStrictEqual(['pelvis', 'left-upper-arm']);
    });

    it('states none where a rig sheet was drawn without one', () => {
      // The pack this field exists for: the shipped inventory names its pieces as the engine's
      // sockets do, so it imports `named` and complete, in the model's proportions.
      const { sheet } = sheetIdentity(
        'CHARACTER',
        standardSubject(),
        config({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }),
        '',
      );

      expect(sheet?.rigMode).toBe('CUTOUT_RIG');
      expect(sheet?.rigContract).toBeNull();
    });

    it('withholds it from a sheet of the same deliverable that does not draw the pieces', () => {
      // A contract is loaded for the whole configuration and reaches exactly the rig sheet, so a
      // core sheet's manifest would otherwise claim a geometry its own prompt never stated.
      const { sheet } = sheetIdentity(
        'CHARACTER',
        standardSubject(),
        config({ directions: 'EIGHT_COMPASS', sheetIndex: 0, rigContract: CONTRACT }),
        '',
      );

      expect(sheet?.plan).toBe('Directional core — cardinal facings');
      expect(sheet?.rigContract).toBeNull();
    });
  });

  describe('the facing a download is named by', () => {
    it('gives each run of an eight-compass rig its own facing', () => {
      // The batch this whole feature is measured against: two core sheets, then one run per facing.
      // The runs are what a reader downloads eight of, and until this they were eight archives of
      // fifteen identically-named files.
      const facings = eightCompassCharacter().map(
        (output) => sheetIdentity('CHARACTER', standardSubject(), output, '').facing,
      );

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
      // A sheet covering four facings is not any one of them, so the download falls back to the
      // ordinal rather than claiming the first. An OBJECT's eight-compass views, because that batch
      // is two such sheets and no run: on the character above, each core sheet's first facing is also
      // a run's, so the shared-facing rule withholds the name there whether or not this one holds.
      const sheets = [0, 1].map((sheetIndex) =>
        sheetIdentity('OBJECT', standardSubject(), config({ directions: 'EIGHT_COMPASS', sheetIndex }), ''),
      );

      expect(sheets.map((entry) => entry.sheet?.total)).toStrictEqual([2, 2]);
      expect(sheets.map((entry) => entry.sheet?.facings?.length)).toStrictEqual([4, 4]);
      expect(sheets.map((entry) => entry.facing)).toStrictEqual([null, null]);
    });

    it('withholds it where the batch is one sheet, which has nothing to be told apart from', () => {
      // A ground tile narrows every stored set to a single direction and produces one sheet, so a
      // per-facing tree would always hold exactly one directory.
      const { sheet, facing } = sheetIdentity(
        'TERRAIN',
        standardSubject(),
        config({ directions: 'EIGHT_COMPASS' }),
        '',
      );

      expect(sheet?.total).toBe(1);
      expect(facing).toBeNull();
    });

    it('withholds it where two sheets of a batch draw the same lone facing', () => {
      // FONT is four sheets of glyphs, every one of them at `front`: the facing is real and names
      // none of them. Naming the files by it would give four downloads one name.
      const sheets = [0, 1, 2, 3].map((sheetIndex) =>
        sheetIdentity('FONT', standardSubject(), config({ sheetIndex }), ''),
      );

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
      // nobody had in mind here. Every category, assembly base, mode and direction set, which is
      // every batch the studio can compose — the base because a declared one draws sheets of its own.
      for (const category of SUBJECT_CATEGORIES) {
        for (const subject of assemblyBaseSubjectsOf(category)) {
          for (const directionalMode of DIRECTIONAL_MODES) {
            for (const directions of DIRECTION_SETS) {
              const batch = config({ directionalMode, directions });
              const named = sheetBatch(category, subject, batch)
                .sheets.map(
                  (sheet) => sheetIdentity(category, subject, { ...batch, ...sheet.output }, '').facing,
                )
                .filter((facing): facing is string => facing !== null);

              expect(
                new Set(named).size,
                `${category} / ${subject.anatomy} / ${directionalMode} / ${directions}`,
              ).toBe(named.length);
            }
          }
        }
      }
    });
  });

  it('counts the subject’s own anatomy, which the sheet contracts for too', () => {
    const { names, sheet } = sheetIdentity(
      'CREATURE',
      standardSubject(),
      config({ directions: 'FOUR_CARDINAL', sheetIndex: 0 }),
      'Tail ×1',
    );

    expect(names).toContain('tail-south');
    expect(names).toHaveLength(sheet?.components ?? -1);
  });
});
