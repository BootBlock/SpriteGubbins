import { describe, expect, it } from 'vitest';

import { parseRigContract, RIG_CONTRACT_FORMAT, RIG_CONTRACT_VERSION } from '../../utils/parseRigContract.ts';
import { sheetSeriesFor } from '../sheetPlans/index.ts';
import { UNSUNG_SAVIOUR_PRESETS } from './unsungSaviour.ts';
import { UNSUNG_SAVIOUR_HUMANOID_RIG } from './unsungSaviourRig.ts';

/**
 * Holding a transcribed rig against everything that can be checked without the rig.
 *
 * `unsungSaviourRig.ts` is a copy of a document another repository writes, and nothing here can
 * open the original — so the values themselves are unheld, and these checks are aimed at the ways a
 * copy goes wrong that do not need it: a document the app's own reader would refuse (which covers a
 * joint end that disagrees with its pivot, and a parent chain with a loop or a second root), a piece
 * the sheet never asks for, a parent naming nothing, and a preset that quietly stops carrying any of
 * it.
 */
describe('the shipped Unsung Saviour rig', () => {
  it('is a document this app’s own reader accepts, and reads back unchanged', () => {
    // The reader is the one that runs on a file the user drops in and on a stored row, so a copy it
    // would refuse is a copy that is *only* reachable through the preset — the one path where a
    // malformed contract never announces itself. Reading it back whole also pins every field: a
    // dropped `joint_edge` or a size of nought is a refusal rather than a quietly shorter rig.
    const reading = parseRigContract(UNSUNG_SAVIOUR_HUMANOID_RIG);

    expect(reading.problems).toEqual([]);
    expect(reading.contract).toEqual(UNSUNG_SAVIOUR_HUMANOID_RIG);
  });

  it('claims the format and version this app was built against', () => {
    // Written out in the constant rather than borrowed from these two, so that a stale copy cannot
    // re-label itself the day the app is taught a version 2. This is the alarm that arrangement
    // exists for: it fails when the reader moves and the copy has not been exported again.
    expect(UNSUNG_SAVIOUR_HUMANOID_RIG.format).toBe(RIG_CONTRACT_FORMAT);
    expect(UNSUNG_SAVIOUR_HUMANOID_RIG.version).toBe(RIG_CONTRACT_VERSION);
  });

  it('names exactly the pieces the character rig sheet asks for', () => {
    // The contract replaces the plan's inventory wholesale, so the two agreeing is not something the
    // compiled prompt can report: a contract missing `left-hand` simply produces a fourteen-piece
    // sheet that looks deliberate. This is the one cross-check the repository can make, because both
    // lists are here — and a mismatch means the copy and the app disagree about what a humanoid is.
    // The rig sheet of the preset that carries the contract, read for that preset's own base, so the
    // check follows the body its *Anatomy Base* draws rather than assuming the standard one.
    const preset = UNSUNG_SAVIOUR_PRESETS.find((candidate) => candidate.id === 'us-character-rig');
    if (preset === undefined) throw new Error('The character rig preset is missing.');
    const [rig] = sheetSeriesFor(
      preset.category,
      preset.subject,
      'CUTOUT_RIG_SINGLE_DIRECTION',
      preset.output.directions,
    );
    const asked = rig.groups.flatMap((group) => group.entries).flatMap((entry) => entry.parts);
    const carried = UNSUNG_SAVIOUR_HUMANOID_RIG.slots.map((slot) => slot.pack_piece_name);

    expect([...carried].sort()).toEqual([...asked].sort());
  });

  it('hangs every piece off a piece it declares', () => {
    // The reader refuses a loop and a second root, but takes a parent naming no declared slot, and
    // section 5 then says nothing about that parent — so in this copy a mistyped one would silently
    // drop the clause that says what carries the limb.
    const ids = new Set(UNSUNG_SAVIOUR_HUMANOID_RIG.slots.map((slot) => slot.slot_id));
    const orphans = UNSUNG_SAVIOUR_HUMANOID_RIG.slots.filter(
      (slot) => slot.parent_slot !== '' && !ids.has(slot.parent_slot),
    );

    expect(orphans.map((slot) => `${slot.slot_id} → ${slot.parent_slot}`)).toEqual([]);
  });

  it('is carried by the character preset and by no other', () => {
    // A preset applies a whole configuration, `rigContract` included, so a character preset that
    // stopped carrying the rig would *clear* one the reader had loaded — and the creature and
    // tileset presets carrying it would hand a quadruped or a wall tile a human skeleton.
    const carrying = UNSUNG_SAVIOUR_PRESETS.filter(
      (preset) => preset.output.rigContract === UNSUNG_SAVIOUR_HUMANOID_RIG,
    );
    const others = UNSUNG_SAVIOUR_PRESETS.filter((preset) => preset.id !== 'us-character-rig');

    expect(carrying.map((preset) => preset.id)).toEqual(['us-character-rig']);
    expect(others.map((preset) => preset.output.rigContract)).toEqual(others.map(() => null));
  });
});
