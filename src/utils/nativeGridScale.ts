import { NOMINAL_SHEET_SIZE, SHEET_CELL_PITCH } from '../constants/sheetCanvas.ts';
import type { AspectRatio, ResolutionProfile, TargetSize } from '../types/output.ts';
import type { RenderStyle } from '../types/rendering.ts';
import { componentGridScale } from './componentGridScale.ts';

/**
 * The whole-number enlargement the sheet presents its native pixel grid at, where it has one.
 *
 * **The defect this answers is that the prompt never said which of two things a target component
 * size was**, and asked for both. Section 0 forbids composing at one resolution and resizing to
 * another; section 2 then states a size like *16 × 32 px* on a canvas over a thousand pixels wide.
 * Twelve components at 16 × 32 *delivered* pixels there are specks; twelve legible ones have been
 * enlarged from a smaller grid, which section 0 appeared to forbid outright. Nothing said which, so
 * a generator read the size as a mood and returned artwork with far more interior detail than the
 * grid it named could hold.
 *
 * The app already had an opinion: `targetSizeGrid` reads a *returned* sheet as a native grid drawn
 * at an integer scale, and the whole pixel-grid apparatus downstream of it assumes as much. This
 * states that opinion in the prompt, and derives the figure from the same arithmetic rather than
 * leaving it to be inferred.
 */

/**
 * The scale, or `null` where this configuration has no native grid to present.
 *
 * Four things have to hold, and each `null` is a case where the prompt is better off saying nothing:
 *
 * - **The style has to be pixel art.** A native pixel grid is that style's own unit; a painted or
 *   rendered sheet has no grid to enlarge, and section 0's rule wants to stand there unqualified.
 * - **The profile has to be `CUSTOM`**, which is the gate `minFeatureSize` and `smallScaleDiscipline`
 *   already apply to this same field and for the same reason: the other three profiles *are* a scale
 *   and state their own figure, so a second derived figure beside one of them is two answers to one
 *   question.
 * - **There has to be a per-component size.** The field is free prose, so it may hold no `W × H`
 *   pair at all — and on a sheet whose components are the parts one subject is cut into, the pair it
 *   holds is the *assembled* size, as the shipped preset *"48 × 96 px assembled (2 metres tall at 48
 *   px per metre)"* says outright.
 *   `componentTargetSize` answers both, and the caller resolves it: the search below seats one cell
 *   per component, so an assembled figure fed into it prices a canvas of fifteen whole characters
 *   and returns a scale for a sheet nobody asked for.
 * - **The enlargement has to be an enlargement.** A component already large enough to fill its share
 *   of the canvas comes back as 1, and a sheet whose components cannot be seated at 1:1 at all comes
 *   back as `null` from the search. Neither is a scale worth stating, and at 1 the delivered pixels
 *   *are* the native ones — exactly what section 0 says without any help from here.
 *
 * **It is a floor, and the prompt states it as one.** The canvas is nominal ({@link
 * NOMINAL_SHEET_SIZE}), so a target returning a larger sheet can honour a larger multiple, and
 * pinning an exact figure would put the instruction at odds with the canvas the generator actually
 * has — which it would resolve by resampling, the one thing being ruled out. Derived from the
 * smallest sheet in the range, the floor fits everywhere.
 */
export function nativeGridScale(
  renderStyle: RenderStyle,
  profile: ResolutionProfile,
  target: TargetSize | null,
  aspectRatio: AspectRatio,
  components: number,
): number | null {
  if (renderStyle !== 'PIXEL_ART' && renderStyle !== 'RETRO_PIXEL_ART') return null;
  if (profile !== 'CUSTOM') return null;
  if (target === null) return null;

  const scale = componentGridScale(
    NOMINAL_SHEET_SIZE[aspectRatio],
    { width: target.width * SHEET_CELL_PITCH, height: target.height * SHEET_CELL_PITCH },
    components,
  );

  return scale === null || scale < 2 ? null : scale;
}
