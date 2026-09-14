import { NOMINAL_SHEET_SIZE, SHEET_CELL_PITCH } from '../constants/sheetCanvas.ts';
import type { AspectRatio, ResolutionProfile, TargetSize } from '../types/output.ts';
import type { RenderStyle } from '../types/rendering.ts';
import type { RigContract } from '../types/rigContract.ts';
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
 * Four things have to hold **where the figure comes from the studio's own fields**, and each `null`
 * is a case where the prompt is better off saying nothing. Where an engine's rig contract is loaded
 * the answer comes from that instead, and only the first and the last of the four still apply — see
 * {@link fromRig}:
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
  rig: RigContract | null,
): number | null {
  if (renderStyle !== 'PIXEL_ART' && renderStyle !== 'RETRO_PIXEL_ART') return null;

  const seated = rig === null ? fromTarget(profile, target, components) : fromRig(rig, components);
  if (seated === null) return null;

  const scale = componentGridScale(
    NOMINAL_SHEET_SIZE[aspectRatio],
    { width: seated.cell.width * SHEET_CELL_PITCH, height: seated.cell.height * SHEET_CELL_PITCH },
    seated.components,
  );

  return scale === null || scale < 2 ? null : scale;
}

/** The cell and the count to seat, from the studio's own fields. */
function fromTarget(
  profile: ResolutionProfile,
  target: TargetSize | null,
  components: number,
): { cell: TargetSize; components: number } | null {
  if (profile !== 'CUSTOM') return null;
  return target === null ? null : { cell: target, components };
}

/**
 * The cell from the engine's rig — where **two of the four `null`s above do not apply**.
 *
 * The profile gate is there because the field is free prose and only the reader knows which quantity
 * it names; a contract states the frame, every piece's size and how many pieces there are, so
 * nothing is being inferred and `HIGH_RESOLUTION` no longer means "no answer". That gate is why the
 * shipped rig preset carried no native-grid block at all, and why the pipeline it was written for
 * documents editing the size by hand to work at 4×.
 *
 * **The largest piece is the cell**, because the canvas has to seat every piece at one scale — the
 * engine's importer picks a single scale for the whole actor, so a multiple that fits the small
 * pieces and not the large one is a multiple the rig cannot use.
 *
 * **The count is the caller's, not the rig's.** A sheet draws the rig's pieces *and* whatever
 * additional anatomy the subject named, and the canvas has to seat all of them: seating the slot
 * count alone prices a multiple the sheet cannot hold, which the generator resolves by resampling —
 * the one thing the block this figure appears in forbids.
 */
function fromRig(rig: RigContract, components: number): { cell: TargetSize; components: number } | null {
  if (rig.slots.length === 0) return null;
  const cell = rig.slots.reduce<TargetSize>(
    (widest, slot) => ({
      width: Math.max(widest.width, slot.piece_size.width),
      height: Math.max(widest.height, slot.piece_size.height),
    }),
    { width: 0, height: 0 },
  );
  return { cell, components };
}
