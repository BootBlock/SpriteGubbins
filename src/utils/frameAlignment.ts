import { FRAME_DRIFT_SEARCH } from '../constants/quantiser.ts';
import type { AlignedFrame, PixelShift, SpriteBox, SpriteStrip } from '../types/quantiser.ts';
import { reachesAny } from './boxClearance.ts';
import { driftAt, fitLattice } from './frameLattice.ts';
import { registerFrame } from './frameRegister.ts';
import { spriteStrips } from './spriteStrips.ts';

/**
 * Every row of sprites on the sheet read as a strip, with how far each of its frames sits from the
 * spacing the row itself keeps to — and which of them the snap is entitled to move.
 *
 * The question a *run* raises that nothing before this asks. The segmentation counts the pieces, the
 * symmetry pass reads each piece against itself and the duplicate pass reads each against every
 * other, and none of the three knows that the pieces are laid out in rows or that a row is meant to
 * play. A generator asked for a walk cycle returns one whose third frame sits two pixels left of
 * where the other seven sit, and nothing on this tab could say so: at the magnification a whole
 * sheet fits in, two pixels is invisible, and in the animation it is a limp.
 *
 * The three steps are each somewhere else, and each says why it is what it is:
 * {@link spriteStrips} decides what a row is, `registerFrame` decides where a frame *is* — by its
 * coverage, never by its bounding box — and `fitLattice` decides which evenly spaced row of slots
 * those positions are a reading of. What is left here is the pass: run those three, subtract, and
 * decide what may be moved.
 *
 * **`snapAbove` is the tolerance and `null` is `CHECK`.** A frame is marked for the move when it
 * sits further from its slot than the tolerance admits, on either axis — either axis rather than by
 * distance, because a frame two pixels low is two pixels low whatever it is doing horizontally, and
 * a reader setting a tolerance of one is saying "one pixel, in any direction".
 *
 * **A move is refused where there is no room for it, and the refusal is decided here rather than
 * where the pixels are written.** Every frame's flag is then the truth about what happened, which is
 * what the panel lists and what the onion skin translates by — three consumers that would otherwise
 * each need to know which of the marked moves the writer had quietly declined. `snapFrames` applies
 * exactly what this marks and refuses nothing of its own.
 *
 * The room a move needs is the box it vacates *and* the box it arrives at, kept clear of every other
 * sprite on the sheet and of every move already accepted — {@link reachesAny} is the shared rule, and
 * the same one the duplicate fold is refused by. On a real sheet it never bites: frames sit in a
 * gutter and a drift is a pixel or two. On a sheet with no gutter it is what stops the pass carrying
 * one frame into the next.
 *
 * **The figures describe the sheet as it stands now, before any move.** That is the only state in
 * which they mean anything — a frame that has just been put on its slot has a drift of zero whatever
 * it arrived with — and it is the same rule the symmetry and duplicate readings are taken under.
 *
 * Pure. Linear in the sheet's sprites, and per frame a constant sweep bounded by
 * {@link FRAME_DRIFT_SEARCH} over that frame's own coverage.
 */
export function sheetStrips(
  image: ImageData,
  /** Every sprite the sheet holds, as `spriteSegments` found them, in reading order. */
  boxes: readonly SpriteBox[],
  /** How far a frame may sit from its slot and be left alone, or `null` to move nothing. */
  snapAbove: number | null,
): readonly SpriteStrip[] {
  /** The regions already spoken for, which each later move must keep clear of. */
  const claimed: SpriteBox[] = [];

  return spriteStrips(boxes).map((row) => {
    const reference = row[0];
    const shifts: PixelShift[] =
      reference === undefined
        ? []
        : row.map((frame, index) =>
            index === 0 ? ORIGIN : registerFrame(image, reference, frame, FRAME_DRIFT_SEARCH),
          );
    const lattice = fitLattice(shifts);

    const drifts = row.map((_, index) => driftAt(lattice, index, shifts[index] ?? ORIGIN));
    // Where each frame's slot sits relative to the *first frame's slot*, in whole pixels: its
    // measured position with its own drift taken out, less the same figure for frame zero. That is
    // what the onion skin stacks by, and taking it from the drifts rather than from the pitch a
    // second time is what stops the two rounding apart — see `driftAt`.
    const lead = leadOffset(shifts[0] ?? ORIGIN, drifts[0] ?? ORIGIN);

    const frames = row.map((box, index): AlignedFrame => {
      const drift = drifts[index] ?? ORIGIN;
      const measured = shifts[index] ?? ORIGIN;
      const snapped = admits(snapAbove, drift) && makesRoom(image, box, drift, boxes, claimed);
      return {
        box,
        drift,
        slot: { x: measured.x - drift.x - lead.x, y: measured.y - drift.y - lead.y },
        snapped,
      };
    });

    return { frames, pitch: lattice.pitch };
  });
}

/** No shift at all — the first frame's own position, and the fallback an unreachable index needs. */
const ORIGIN: PixelShift = { x: 0, y: 0 };

/** Where the first frame's own slot sits, which every other frame's slot is stated relative to. */
function leadOffset(measured: PixelShift, drift: PixelShift): PixelShift {
  return { x: measured.x - drift.x, y: measured.y - drift.y };
}

/** Whether the mode and the tolerance between them ask for this frame to be moved. */
function admits(snapAbove: number | null, drift: PixelShift): boolean {
  return snapAbove !== null && Math.max(Math.abs(drift.x), Math.abs(drift.y)) > snapAbove;
}

/**
 * Whether the move has somewhere to happen — and, where it has, the claim staked on that room.
 *
 * The region is the union of where the frame is and where it is going, because both are written: the
 * artwork it vacates has to be cleared or the sheet keeps a copy of the frame at the wrong place.
 * Claiming it as a side effect is deliberate — a caller that asked and then moved anyway would be
 * two statements of the same decision, and it is the second frame of a strip that needs the first
 * one's answer to already be on the list.
 */
function makesRoom(
  image: ImageData,
  box: SpriteBox,
  drift: PixelShift,
  boxes: readonly SpriteBox[],
  claimed: SpriteBox[],
): boolean {
  const left = Math.min(box.left, box.left - drift.x);
  const top = Math.min(box.top, box.top - drift.y);
  const region: SpriteBox = {
    left,
    top,
    width: Math.max(box.left + box.width, box.left + box.width - drift.x) - left,
    height: Math.max(box.top + box.height, box.top + box.height - drift.y) - top,
    pixels: 0,
  };

  if (region.left < 0 || region.top < 0) return false;
  if (region.left + region.width > image.width || region.top + region.height > image.height) return false;
  if (reachesAny(region, boxes, box) || reachesAny(region, claimed, null)) return false;

  claimed.push(region);
  return true;
}
