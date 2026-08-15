import { describe, expect, it } from 'vitest';
import type { Direction } from '../../types/rendering.ts';
import { leadingSide, signedObjectYaw } from './chirality.ts';
import { FACING_TEXT, OBJECT_YAW } from './rotation.ts';

/**
 * The arithmetic that decides which side leads, held against the thirteen sentences that say so in
 * prose.
 *
 * Both halves reach the same prompt: `FACING_TEXT` states the leading side inside each facing's own
 * paragraph, and the chirality ledger states it again as a lookup beside the rules that depend on
 * it. Two statements of one fact is exactly what this project's prompt rules forbid hand-writing, so
 * the ledger is computed from {@link leadingSide} and this is what stops the *prose* drifting from
 * it. A sheet whose yaw list said one side and whose ledger said the other would be unusable in the
 * worst way — it would still read as a coherent specification.
 *
 * The prose is parsed rather than restated here, for the reason `rotation.test.ts` gives about the
 * plan-view register: a hand-copied expectation is a third statement of the same fact.
 */

/** Every facing, taken off the exhaustive record rather than a list that could fall behind it. */
const ALL_FACINGS = Object.keys(FACING_TEXT) as Direction[];

/**
 * The first side `FACING_TEXT` puts in bold, or `null` where it bolds none.
 *
 * Bold is the record's own convention for the leading side and it is used for nothing else there —
 * the sentences go on to name the far side in plain text ("the left side is largely hidden"), which
 * is why this reads the emphasis rather than the first mention.
 */
function boldedSide(text: string): string | null {
  return /\*\*(left|right)\*\*/.exec(text)?.[1] ?? null;
}

describe('the side a yaw leads with', () => {
  it.each(ALL_FACINGS)('agrees with what %s’s own sentence puts in bold', (direction) => {
    expect(boldedSide(FACING_TEXT[direction]), FACING_TEXT[direction]).toBe(leadingSide(direction));
  });

  it('leads with neither side square on, and with one at every other yaw', () => {
    // The two square-on yaws are the whole of the `null` case: both flanks edge-on, neither nearer.
    // Asserted as a partition so a facing added at 0° or 180° cannot quietly acquire a leading side,
    // and one added anywhere else cannot quietly lose one.
    const squareOn = ALL_FACINGS.filter((direction) => leadingSide(direction) === null);
    expect(squareOn.every((direction) => OBJECT_YAW[direction] % 180 === 0)).toBe(true);
    expect(ALL_FACINGS.filter((direction) => OBJECT_YAW[direction] % 180 === 0)).toEqual(squareOn);
  });

  it('turns the two sets opposite ways at the same printed yaw', () => {
    // The reason the sense cannot be read off `OBJECT_YAW`: both facings print 90°, and they present
    // opposite sides of the subject. A signed yaw that had lost this would make every classic sheet
    // state the wrong side in a ledger the reader has no way to check.
    expect(OBJECT_YAW.west).toBe(OBJECT_YAW['right side']);
    expect(signedObjectYaw('west')).toBe(-signedObjectYaw('right side'));
    expect(leadingSide('west')).toBe('left');
    expect(leadingSide('right side')).toBe('right');
  });
});
