import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS, OBJECT_YAW } from '../constants/promptText/index.ts';
import { coreFacingChunks } from '../constants/sheetPlans/directionalViews.ts';
import { turntableSequence } from './turntableSequence.ts';

/**
 * The chain that relates one cell to the next, against the yaw list it is derived from.
 *
 * What is actually being checked is that the steps *compose*: start at the first yaw, add every step
 * in turn, and land on each facing's own printed yaw. A sequence whose steps did not add up would be
 * a specification asking for a turn and a destination that disagree — and a generator resolving that
 * by ignoring one of them is exactly the failure the block was written against.
 */

/**
 * Every facing list a sheet can actually cover: each set, and each half of a split core.
 *
 * Paired with its own name so `it.each` does not spread the tuple across its arguments — a facing
 * list is one case, not a case per facing.
 */
const COVERED_LISTS = Object.values(DIRECTION_LISTS)
  .flatMap((facings) => coreFacingChunks(facings))
  .map((facings) => [facings.join(', '), facings] as const);

/** `- Turn it a further 90° for **north-west**, object yaw 135°.` → `['north-west', 90, 135]`. */
function parse(line: string): readonly [string, number, number] | null {
  const match = /\*\*([a-z -]+)\*\*, object yaw (\d+)°/.exec(line);
  if (match === null) return null;
  const step = /a further (\d+)°/.exec(line);
  return [match[1] ?? '', step === null ? 0 : Number(step[1]), Number(match[2])];
}

describe('the turntable sequence', () => {
  it.each(COVERED_LISTS)('adds its steps up to the printed yaws of %s', (_name, covered) => {
    const parsed = turntableSequence(covered).split('\n').map(parse);

    expect(parsed).toHaveLength(covered.length);

    let turned = OBJECT_YAW[covered[0]];
    parsed.forEach((line, index) => {
      const facing = covered[index];
      expect(line, `line ${String(index)} of the sequence is not a turn`).not.toBeNull();
      if (line === null || facing === undefined) return;

      const [name, step, yaw] = line;
      expect(name).toBe(facing);
      expect(yaw).toBe(OBJECT_YAW[facing]);
      // The first line is the starting orientation and states no step, which `parse` reads as 0.
      turned = (turned + step) % 360;
      expect(turned, `${facing} is not where the turns leave the object`).toBe(OBJECT_YAW[facing]);
    });
  });

  it('opens on the facing the sheet assembles towards, and turns from there', () => {
    // The first entry of a direction list is the primary assembly direction, so a sequence that
    // started anywhere else would have the sheet turning away from the view it is built around.
    expect(turntableSequence(['south-west', 'north-west', 'north-east', 'south-east'])).toBe(
      [
        '- Start at **south-west**, object yaw 45°.',
        '- Turn that same object a further 90° for **north-west**, object yaw 135°.',
        '- Turn it a further 90° for **north-east**, object yaw 225°.',
        '- Turn it a further 90° for **south-east**, object yaw 315°.',
      ].join('\n'),
    );
  });

  it('states the starting orientation alone where the sheet covers one facing', () => {
    // Not reachable from the template, which gates the block on `MULTI_DIRECTION` — but a run sheet
    // is a single-facing coverage and this is what it would say, rather than a chain with no turns
    // in it or an empty string.
    expect(turntableSequence(['front'])).toBe('- Start at **front**, object yaw 0°.');
  });
});
