import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS, FACING_TEXT, OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';
import { oneSidedFeatureLedger } from './oneSidedFeatureLedger.ts';

/**
 * The visibility this ledger states, held against the thirteen sentences that describe the same
 * yaws in prose.
 *
 * Both reach one prompt: `FACING_TEXT` says what each yaw hides inside that facing's own paragraph,
 * and the ledger says what that leaves of one particular feature, in a subsection of its own.
 * Two statements of one fact is what this project's prompt rules forbid hand-writing, and this is
 * what stops them drifting — the ledger is computed from the signed yaw, and the prose is parsed
 * rather than restated here, for the reason `chirality.test.ts` gives about the leading side.
 *
 * A sheet whose facing paragraph said one thing and whose ledger said the other would be unusable in
 * the worst way: it would still read as a coherent specification, and the generator would resolve
 * the contradiction however it liked.
 */

/** Every facing, taken off the exhaustive record rather than a list that could fall behind it. */
const ALL_FACINGS = Object.keys(FACING_TEXT) as Direction[];

/** The ledger line for one facing, with the leading `- **facing** — ` taken off. */
function visibilityLine(direction: Direction): string {
  const rendered = oneSidedFeatureLedger(['undercut'], [direction], false);
  const line = rendered.split('\n').find((row) => row.startsWith(`- **${direction}**`)) ?? '';
  return line.slice(`- **${direction}** — `.length);
}

/**
 * Which side `FACING_TEXT` puts in bold for this facing, or `null` where it bolds neither.
 *
 * Bold is that record's own convention for the leading side and is used for nothing else there, so
 * `chirality.test.ts` already reads it this way. Taking the expectation from the *prose* is what
 * makes this check independent: the ledger computes from `signedObjectYaw`, and a sign error there
 * would flip every classic facing's answer while agreeing with itself.
 */
function boldedSide(direction: Direction): string | null {
  return /\*\*(left|right)\*\*/.exec(FACING_TEXT[direction])?.[1] ?? null;
}

/**
 * What that facing must leave of a feature on the subject's **left**, worked out from the bolded
 * side and the yaw's magnitude alone.
 *
 * `OBJECT_YAW` is a magnitude and carries no sense, and the bolded side carries the sense — so
 * together they are the two halves `signedObjectYaw` combines, arrived at without it.
 */
function expectedAt(direction: Direction): string {
  const leading = boldedSide(direction);
  if (leading === null) return 'both flanks are edge-on';
  const squareOn = OBJECT_YAW[direction] % 180 === 90;
  if (leading === 'left') return squareOn ? 'squarely faces the camera' : 'its own side leads';
  return squareOn ? 'turned completely away' : 'largely hidden';
}

describe('what a yaw leaves of a feature on the subject’s left', () => {
  it.each(ALL_FACINGS)('agrees with what %s’s own paragraph puts in bold', (direction) => {
    // Exhaustive by construction: every facing bolds a side or bolds neither, and every yaw is
    // square-on to a flank or is not, so all thirteen reach an expectation. An earlier draft matched
    // loose phrases out of the prose instead, and four facings — `back-three-quarter`, `north-west`,
    // `north` and `north-east` — matched none of them and asserted nothing at all.
    expect(visibilityLine(direction), FACING_TEXT[direction]).toContain(expectedAt(direction));
  });

  it('says the same thing as the five paragraphs that spell the left side’s fate out', () => {
    // The narrower half, and the one that is not derived from the same two records: five of the
    // thirteen sentences state in words what the yaw does to the *left* flank, and those five are a
    // second opinion on the arithmetic rather than a restatement of it.
    const spelled: readonly (readonly [string, string])[] = [
      ['both sides are edge-on', 'both flanks are edge-on'],
      ['the left side is completely hidden', 'turned completely away'],
      ['the left side is largely hidden', 'largely hidden'],
      ['subject’s **left** side squarely faces the camera', 'squarely faces the camera'],
    ];
    let matched = 0;
    for (const direction of ALL_FACINGS) {
      for (const [prose, ledger] of spelled) {
        if (!FACING_TEXT[direction].includes(prose)) continue;
        matched += 1;
        expect(visibilityLine(direction), FACING_TEXT[direction]).toContain(ledger);
      }
    }
    // Without this the loop passes by matching nothing, which is exactly how the earlier draft of
    // the check above went unnoticed.
    expect(matched).toBe(8);
  });

  it('leaves the feature fully presented at exactly one yaw of the eight-compass core', () => {
    // The property the whole enumeration rests on: a left-sided feature is at its largest in exactly
    // one view, and absent from exactly one. A ledger that put it at full prominence in two views
    // leading with opposite sides would be describing the reflection this replaced.
    const compass = DIRECTION_LISTS.EIGHT_COMPASS as readonly Direction[];
    const lines = compass.map((direction) => visibilityLine(direction));

    expect(lines.filter((line) => line.includes('squarely faces the camera'))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('turned completely away'))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('both flanks are edge-on'))).toHaveLength(2);
  });

  it('never presents it at all across the classic five, which is a fact about that set', () => {
    // Not a defect, and stated here so nobody reads it as one. The classic set turns the subject's
    // *right* towards the camera at every yaw it holds, and section 3 fixes an unstated side to the
    // left on every sheet so that a series agrees with itself. A left-sided feature is therefore
    // edge-on, hidden or largely hidden across all five — which is exactly the sheet on which a
    // generator invents a second copy on the other flank, and exactly what the ledger forbids.
    const classic = DIRECTION_LISTS.FIVE_CLASSIC as readonly Direction[];
    const lines = classic.map((direction) => visibilityLine(direction));

    expect(lines.filter((line) => line.includes('squarely faces the camera'))).toHaveLength(0);
    expect(lines.filter((line) => line.includes('turned completely away'))).toHaveLength(1);
  });
});

describe('the ledger as a block', () => {
  const CARDINALS = DIRECTION_LISTS.FOUR_CARDINAL as readonly [Direction, ...Direction[]];

  it('is empty where the subject declares nothing, so no heading is left with nothing under it', () => {
    expect(oneSidedFeatureLedger([], CARDINALS, false)).toBe('');
    expect(oneSidedFeatureLedger([], CARDINALS, true)).toBe('');
  });

  it('gives every feature its own paragraph and its own per-facing list', () => {
    // The defect the enumeration replaced, in one assertion: the prompt used to ask for *one*
    // witness, so a subject carrying two left the second unconstrained — measured, the holster held
    // the torso and the pelvis while the head went on reflecting.
    const both = oneSidedFeatureLedger(['undercut', 'holstered sidearm and pouch'], CARDINALS, false);

    for (const feature of ['undercut', 'holstered sidearm and pouch']) {
      expect(both).toContain(`**The subject carries the ${feature} on its left, and nowhere on its right.**`);
    }
    // Four facings twice over, rather than four facings and a second name with nothing under it.
    expect(both.split('\n').filter((line) => line.startsWith('- **'))).toHaveLength(8);
  });

  it('keeps the naming sentence overhead and drops the visibility, which that camera cannot vary', () => {
    const overhead = oneSidedFeatureLedger(['undercut'], CARDINALS, true);

    expect(overhead).toContain('on its left, and nowhere on its right');
    expect(overhead).not.toContain('- **south**');
  });
});
