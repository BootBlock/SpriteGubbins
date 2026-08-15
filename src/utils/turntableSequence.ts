import { OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * The covered facings restated as one turntable: a starting orientation, and a turn from each cell
 * to the next.
 *
 * Section 3's yaw list already names every facing and its angle, and that list is four *independent*
 * descriptions — which is how a generator reads it, and how it drew the sheet that prompted this.
 * Each cell was designed from its own name rather than derived from the cell beside it, so the
 * asymmetries the subject was carrying were re-decided every time; the views all faced correctly and
 * none of them was the same object.
 *
 * A chain says the thing the list cannot: cell N + 1 is cell N after a turn, so there is one object
 * on the row and only its orientation is free. Same facts, related rather than enumerated.
 *
 * Pure, and a function of the covered facings alone — the yaws come from {@link OBJECT_YAW}, which is
 * where the list above them gets them, so the two cannot disagree about an angle.
 */

/**
 * `- Turn it a further 90° for **north-west**, object yaw 135°.`
 *
 * The step is the difference between the printed yaws rather than between the signed ones, so a
 * reader can check the arithmetic against the numbers on the page. The two agree in magnitude on
 * every set the app ships — a signed step differs only in sign, and the sign is already carried by
 * the facing this step arrives at.
 *
 * Every direction list is ordered by ascending yaw, which is what makes each step the short way
 * round. A list that was not would still be described truthfully, just as a longer turn: 315° rather
 * than −45°.
 */
export function turntableSequence(covered: readonly [Direction, ...Direction[]]): string {
  const [first, ...rest] = covered;
  const lines = [`- Start at **${first}**, object yaw ${String(OBJECT_YAW[first])}°.`];

  // Carried rather than indexed back out of `covered`, which under `noUncheckedIndexedAccess` would
  // hand back `Direction | undefined` and buy a fallback branch that can never be taken.
  let previous = first;
  for (const direction of rest) {
    const step = (OBJECT_YAW[direction] - OBJECT_YAW[previous] + 360) % 360;
    const verb = previous === first ? 'Turn that same object' : 'Turn it';
    lines.push(
      `- ${verb} a further ${String(step)}° for **${direction}**, object yaw ${String(OBJECT_YAW[direction])}°.`,
    );
    previous = direction;
  }

  return lines.join('\n');
}
