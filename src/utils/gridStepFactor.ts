/**
 * The factor that makes one step of a sheet's grid one cell side, or no limit where there is no step.
 *
 * A step that is not a positive, finite length is no step. `spritePitch` promises never to return one,
 * and this refuses one all the same, because a negative factor draws every sprite at 1 × 1 and a zero
 * step makes an infinite one — the two ways a mismeasured grid reached the pack unnoticed before
 * `spritePitch` read its lines from `spriteBands`. `Infinity` is no limit rather than a factor: the
 * caller takes the smallest of this and the factors that fit each sprite, so a refused step leaves
 * the sprites to decide.
 *
 * Pure, as everything in this directory is.
 */
export function gridStepFactor(side: number, pitch: number | null): number {
  return pitch !== null && pitch > 0 && Number.isFinite(pitch) ? side / pitch : Infinity;
}
