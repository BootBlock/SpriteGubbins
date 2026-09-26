import { describe, expect, it } from 'vitest';
import { rigPieceNameProblem } from './rigPieceNameProblem.ts';

/**
 * The names a sprite pack can write a rig piece's file under verbatim, and the ones it cannot.
 *
 * **Each refusal is a name that reached an entry name unchecked** before this existed: a nested
 * directory the facing-keyed importer never reads, an entry that climbs out of the extraction root,
 * or one Windows Explorer refuses to extract.
 */
describe('rigPieceNameProblem', () => {
  it.each(['left-upper-arm', 'upper_arm_l', 'Torso 2', 'a..b', 'façade'])(
    'accepts %j, which is one file name on every platform',
    (name) => {
      expect(rigPieceNameProblem(name, 'Slot 1')).toBeNull();
    },
  );

  it.each([
    ['hip/left', 'holds a path separator'],
    ['x/../../../../evil', 'holds a path separator'],
    ['hip\\left', 'holds a path separator'],
    ['tab\there', 'holds a control character'],
    ['bell\u007f', 'holds a control character'],
    ['a:b', 'holds a character Windows refuses'],
    ['head?', 'holds a character Windows refuses'],
    ['<arm>', 'holds a character Windows refuses'],
    ['say "hi"', 'holds a character Windows refuses'],
    ['a|b', 'holds a character Windows refuses'],
    ['star*', 'holds a character Windows refuses'],
    ['arm.', 'ends in a dot or a space'],
    ['..', 'ends in a dot or a space'],
    ['arm ', 'ends in a dot or a space'],
  ])('refuses %j, saying it %s', (name, reason) => {
    expect(rigPieceNameProblem(name, 'Slot 3')).toContain(`‘${name}’ ${reason}`);
  });

  it('names the slot and the consequence, as every other refusal of the contract does', () => {
    expect(rigPieceNameProblem('hip/left', 'Slot 3')).toBe(
      'Slot 3’s pack_piece_name ‘hip/left’ holds a path separator, and a sprite pack names the ' +
        'piece’s file after it.',
    );
  });
});
