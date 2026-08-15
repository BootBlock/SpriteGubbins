import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { styleReferenceFor } from '../styleReferences/index.ts';
import { styleReferencePatch } from '../../utils/styleReferencePatch.ts';
import type { ImageOutputConfig } from '../../types/output.ts';
import type { StyleReferenceId } from '../../types/styleReference.ts';

/**
 * The output configuration for a preset that reproduces a published look.
 *
 * **The look's half is derived, never retyped.** A reference already states the render style, the
 * scale, the outline, the light, the camera and the colour, and a preset that wrote those out again
 * would be the same facts in two places — which is exactly the drift the prompt rules forbid, and
 * worse here than usual: the two would disagree while both looking right, and the card would promise
 * a look the sheet was no longer drawn to. So this asks the reference for them, through the same
 * function the studio's own control uses.
 *
 * What the caller supplies is the other half — the **deliverable**: which sheet mode, which facings,
 * whether the pieces articulate, what canvas. Two sheets drawn to one reference differ in every one
 * of those and in none of the above.
 *
 * `NONE` has no settings to contribute and no preset would ask for it, so an id that resolves to no
 * reference falls through to the studio's defaults with the id still recorded. That cannot happen
 * from this file — every call site names a real reference and `styleReferences.test.ts` checks the
 * whole library is spoken for — but it is what keeps this total rather than throwing at module load.
 */
export function gameLookOutput(
  styleReference: StyleReferenceId,
  deliverable: Partial<ImageOutputConfig>,
): ImageOutputConfig {
  const reference = styleReferenceFor(styleReference);

  return {
    ...DEFAULT_IMAGE_CONFIG,
    styleReference,
    ...(reference === null ? {} : styleReferencePatch(reference)),
    ...deliverable,
  };
}
