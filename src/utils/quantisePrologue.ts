import type { QuantisePrologue, QuantiseSettings } from '../types/quantiser.ts';
import { boundaryMesh } from './gridMesh.ts';
import { hardenSilhouette } from './hardenSilhouette.ts';
import { keyBackground } from './keyBackground.ts';

/**
 * The three passes that run before a dial is read: key the background, harden what is left, and
 * measure the mesh the readings will walk.
 *
 * **Split out of `quantiseImage` because it is a different question with a different lifetime.**
 * Everything below it in the pipeline answers "what do these dials make of this sheet"; these three
 * answer "what is this sheet", and their only inputs are {@link QuantiseSettings.key},
 * {@link QuantiseSettings.silhouetteThreshold} and {@link QuantiseSettings.grid}. A caller that
 * holds all three fixed while it moves the dials — which is what the auto-tune sweep is — was
 * paying for the same three answers on every candidate: a sweep of `test_sprites/armour.png` at a
 * grid of 6 runs 403 positions over 5 crops, so `boundaryMesh` ran 2,015 times to answer the five
 * meshes those crops have. Keying is worse again, because the key and the hardening produce the
 * value the sweep scores against as well: `autoTune` built it once a crop and then rebuilt it
 * inside every candidate.
 *
 * **The order is the pipeline's and it is not interchangeable.** `quantiseImage` states where these
 * three sit in the whole order and why the mesh must be measured behind the key — a keyed field's
 * drifting colours are steps the profile would otherwise count. The argument between the two passes
 * here is this one:
 *
 * **The hardening goes behind the key, and the two erosions are why.** `keyBackground` admits an
 * already-transparent pixel into its field and erodes one pixel inward from it, so a hardening that
 * ran first would hand the key a wider field than the sheet has and the two erosions would compound
 * into a silhouette neither dial asked for. Behind it, the key never sees a pixel this cleared.
 * Nothing is lost by the order either: `keyBackground` writes only full transparency or the pixel it
 * was handed, so there is no partial alpha of its own for this to threshold — the coverage it reads
 * is always the sheet's own. The hardening then goes ahead of the mesh so the step profile weighs a
 * hard boundary rather than a ramp, which is the same reason the key goes ahead of it.
 *
 * **The mesh is measured here rather than by whoever wants one, and that is the point of carrying
 * it.** It is what makes every reading in `gridAlignment.ts` agree about where a cell begins — so a
 * caller that measures its own would be a second opinion about the same sheet, and a sweep whose
 * candidates each measured their own would be ranking results cut on meshes it never compared.
 *
 * **The contract on a caller is that the prologue and the settings agree.** Nothing checks it,
 * because there is nothing to check against: a `QuantisePrologue` is three values and the settings
 * that produced them are not among them. Build it from the same `key`, `silhouetteThreshold` and
 * `grid` the transform is then given, or the passes walk a mesh measured on a sheet they are not
 * looking at. `quantiseImage` is the composition that cannot get this wrong, and it is what every
 * caller but the sweep should be using.
 *
 * Pure, like the rest of this directory.
 */
export function quantisePrologue(image: ImageData, settings: QuantiseSettings): QuantisePrologue {
  // `null` skips the pass outright rather than keying against some default colour: the studio's key
  // may be `TRANSPARENT`, which names no colour at all, and the user may simply not have asked.
  const keyed = settings.key === null ? null : keyBackground(image, settings.key);
  const source = hardenSilhouette(keyed?.image ?? image, settings.silhouetteThreshold);

  return {
    source,
    mesh: boundaryMesh(source, settings.grid),
    // No zero-pixel guard: `ImageData`'s constructor throws `IndexSizeError` for a zero width or
    // height, so an image with nothing in it cannot reach this line and a division by zero has no way
    // to arise. A guard against it would be a comment claiming to protect against the impossible.
    keyedShare: keyed === null ? 0 : keyed.keyedPixels / (image.width * image.height),
  };
}
