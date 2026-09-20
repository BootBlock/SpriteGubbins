import { describe, expect, it } from 'vitest';

import { UNSUNG_SAVIOUR_HUMANOID_RIG } from '../constants/presets/unsungSaviourRig.ts';
import { isShippedRigContract } from './isShippedRigContract.ts';
import { parseRigContract } from './parseRigContract.ts';

/**
 * Telling the shipped copy from a reader's own export, which is a claim about storage as much as
 * about values.
 *
 * The answer decides one sentence on screen, and that sentence is the only thing standing between a
 * reader and a transcription they cannot date. A false negative is the harmful direction: it says
 * “this is your export” about a copy, which is exactly the belief the line exists to prevent.
 */
describe('recognising the shipped rig contract', () => {
  it('holds after the round trip through storage, where identity does not', () => {
    // The case the field-by-field comparison is for. A history row and a saved preset both come back
    // through `parseRigContract`, which builds new objects — so `===` answers false for the same
    // document, and the line would call a shipped contract the reader's own the moment they restored
    // a prompt.
    const restored = parseRigContract(JSON.parse(JSON.stringify(UNSUNG_SAVIOUR_HUMANOID_RIG)));

    expect(restored.contract).not.toBe(UNSUNG_SAVIOUR_HUMANOID_RIG);
    expect(restored.contract).not.toBeNull();
    expect(isShippedRigContract(restored.contract!)).toBe(true);
  });

  it('says no to an export that differs by one piece', () => {
    // A rig that moved is the whole reason a reader is asked to export again, and the smallest real
    // move is one slot: a pivot nudged, a limb lengthened. If a single changed field did not flip
    // this, the line would go on claiming the shipped copy for every rig that ever diverged from it.
    const [first, ...rest] = UNSUNG_SAVIOUR_HUMANOID_RIG.slots;
    const lengthened = {
      ...UNSUNG_SAVIOUR_HUMANOID_RIG,
      slots: [
        { ...first!, piece_size: { ...first!.piece_size, height: first!.piece_size.height + 1 } },
        ...rest,
      ],
    };

    expect(isShippedRigContract(lengthened)).toBe(false);
  });

  it('says no to a rig of another name or another size of frame', () => {
    // The two cheap discriminators, checked because they are the ones that short-circuit: a creature
    // rig with fifteen slots of its own would reach the slot loop otherwise, and a frame retuned
    // without any slot moving is a real change this must not miss.
    expect(isShippedRigContract({ ...UNSUNG_SAVIOUR_HUMANOID_RIG, skeleton_name: 'Quadruped' })).toBe(false);
    expect(
      isShippedRigContract({
        ...UNSUNG_SAVIOUR_HUMANOID_RIG,
        frame_size: { width: 48, height: 112 },
      }),
    ).toBe(false);
  });
});
