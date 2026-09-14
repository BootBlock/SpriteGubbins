import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { defaultSubjectFor } from '../src/constants/categories/index.ts';
import type { OutputConfig } from '../src/types/output.ts';
import type { RigContract } from '../src/types/rigContract.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * What a loaded rig contract does to the compiled prompt, end to end.
 *
 * **The unit suites hold each half; this holds that they arrive together.** A prompt is a contract
 * with a generator, and the failure this feature exists to prevent is a sheet that states the
 * engine's own frame in one section and the reader's typed size in the next — pieces drawn to a
 * proportion nothing on the sheet agrees with. Nothing in this app can check the artwork that comes
 * back, so the prompt is the last place a disagreement is visible at all.
 */

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
      slot_id: 'torso',
      pack_piece_name: 'torso',
      parent_slot: 'pelvis',
      piece_size: { width: 26, height: 26 },
      piece_pivot: { x: 13, y: 24 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -56 },
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

const SUBJECT = defaultSubjectFor('CHARACTER');

/** The sheet a rig contract describes: the one whose inventory *is* the rig's pieces. */
const RIG_SHEET: OutputConfig = {
  ...DEFAULT_OUTPUT_CONFIG,
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  directions: 'EIGHT_COMPASS',
  rigMode: 'CUTOUT_RIG',
  renderStyle: 'PIXEL_ART',
  // The shipped rig preset's own profile, and the one that used to leave the prompt with no native
  // grid at all — see `nativeGridScale`.
  resolutionProfile: 'HIGH_RESOLUTION',
  spriteTargetSize: '64 × 128 px assembled (typed by hand)',
};

describe('a compiled prompt with a rig contract loaded', () => {
  it('lists the rig’s own pieces in section 4, under the engine’s names', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('left-upper-arm');
    // And not the inventory this app authors, which calls the same piece something else and would
    // make the pack that is cut from the sheet need renaming by hand — the copy the file ends.
    expect(prompt).not.toContain('Left arm: upper arm, lower arm, hand');
  });

  it('contracts for exactly the rig’s piece count', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('3 in total');
  });

  it('states every piece’s size, joint end and pivot in section 5', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('Piece geometry');
    expect(prompt).toContain('**torso** — 26 × 26 px, joint at the bottom edge');
    expect(prompt).toContain('56 px above the base');
  });

  it('takes the assembled size from the rig’s frame over the field somebody typed', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('48 × 96 px assembled');
    expect(prompt).not.toContain('64 × 128');
  });

  it('presents a native pixel grid where a typed size could not', () => {
    // `HIGH_RESOLUTION` states its own scale, so a *typed* size is refused a native-grid block —
    // the field is prose and only the reader knows which quantity it names. A contract states the
    // frame, every piece and how many there are, so nothing is being inferred.
    const withRig = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });
    const without = generatePrompt('CHARACTER', SUBJECT, RIG_SHEET);

    expect(withRig).toContain('native pixel grid');
    expect(without).not.toContain('native pixel grid');
  });

  it('says nothing at all on a sheet that does not draw the rig’s pieces', () => {
    // A contract is carried by the whole configuration and a deliverable is several sheets. The
    // character's core sheet draws whole figures, so a piece list and a set of piece sizes there
    // would contradict its own inventory.
    const core: OutputConfig = {
      ...RIG_SHEET,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      rigContract: CONTRACT,
    };
    const prompt = generatePrompt('CHARACTER', SUBJECT, core);

    expect(prompt).not.toContain('Piece geometry');
    expect(prompt).not.toContain('left-upper-arm');
    expect(prompt).toContain('64 × 128');
  });

  it('changes nothing at all on a sheet that is not the rig sheet', () => {
    // Byte-for-byte, which the two assertions above cannot say: a contract is carried by the whole
    // configuration, so "inert" has to mean the prompt is the one the reader would have had.
    const core: OutputConfig = { ...RIG_SHEET, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' };

    expect(generatePrompt('CHARACTER', SUBJECT, { ...core, rigContract: CONTRACT })).toBe(
      generatePrompt('CHARACTER', SUBJECT, core),
    );
  });

  it('stops telling the model that no component has a stated size', () => {
    // Section 2's own sentence, written when nothing could state a piece size. Left standing it
    // contradicts section 5 outright, and section 2 is the earlier of the two.
    const withRig = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });
    const without = generatePrompt('CHARACTER', SUBJECT, RIG_SHEET);

    expect(without).toContain('no single component is this size');
    expect(withRig).not.toContain('no single component is this size');
    // …and it does not say “assembled” twice, which the words and the label together would.
    expect(withRig).not.toContain('px assembled.');
  });

  it('says which sizes the native grid is, rather than pointing at a size that is not there', () => {
    // The block opens by naming the quantity it enlarges. On a rig sheet the size above it is the
    // assembly, so the original wording would have a model enlarge the whole 48 × 96 figure by the
    // multiple priced for a 26 × 26 piece.
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('The piece sizes in section');
    expect(prompt).not.toContain('The target component size above is a native pixel grid');
  });

  it('states the feature floor against the smallest piece, in the grid’s own unit', () => {
    // `HIGH_RESOLUTION` answers `3 × 3`, calibrated for delivered pixels. Printed as native pixels
    // against this rig's 8 × 22 arm that is a floor covering over a third of the piece — so the
    // figure comes off the rung table by the smallest piece instead.
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG_SHEET, rigContract: CONTRACT });

    expect(prompt).toContain('1 × 1 native pixels');
    expect(prompt).not.toContain('3 × 3 native pixels');
  });
});
