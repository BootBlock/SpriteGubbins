import { capitalised } from '../../utils/capitalised.ts';
import type { LimbSegment } from './creatureBody.ts';
import type { PartDrawing } from './partDrawing.ts';

/**
 * How a segment of a body that bends along its length is drawn: once for each curve it has to sit in.
 *
 * **Named for the curve it fits, never drawn curved**, as a limb's are named for the flexion they
 * suit: section 5 has every articulated part a rigid component and forbids a pre-bent segment, so a
 * `curved` segment would be ordered in section 4 and forbidden in section 5 of one prompt. The body
 * bends by turning rigid segments about their joins.
 *
 * A serpent's and a centipede's body segments, an octopus's tentacle and a hydra's necks all bend this
 * way, which is why it is kept beside the builder rather than with any one of those bodies.
 */
export const CURVES: readonly [PartDrawing, ...PartDrawing[]] = [
  { text: 'extension-compatible', slug: 'extension' },
  { text: 'moderate-curve-compatible', slug: 'moderate-curve' },
  { text: 'tight-coil-compatible', slug: 'tight-coil' },
];

/** A segment whose plural is its name with an `s`, drawn in the given positions. */
export function bodySegment(
  name: string,
  slug: string,
  positions: readonly [PartDrawing, ...PartDrawing[]],
): LimbSegment {
  return {
    name,
    slug,
    plural: `${capitalised(name)}s`,
    pluralSlug: `${slug}s`,
    positions,
  };
}
