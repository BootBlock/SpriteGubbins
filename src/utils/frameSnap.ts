import type { AlignedFrame, SpriteStrip } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/**
 * The sheet with every marked frame carried onto its slot — the snap half of the alignment pass.
 *
 * **It is the one rewrite on this tab that changes no artwork.** The symmetry settle writes one
 * colour across a mirrored pair and the duplicate fold overwrites a sprite with another, so both
 * delete something a reader may have wanted. This picks a frame up and puts it down `drift` pixels
 * away: every pixel of it survives, in the same order, in the same colours. What changes is where
 * the row plays from — which is the whole complaint an animation strip raises.
 *
 * **Nothing is moved that {@link AlignedFrame.snapped} does not name**, and that flag is where both
 * the tolerance and the room were already decided — see `sheetStrips`, which is the only thing
 * entitled to decide either. This function refuses nothing on its own, which is what makes the
 * panel's list and the sheet agree about what happened.
 *
 * **Every frame is cleared before any frame is written**, and both read from the original. A move
 * vacates the box it came from, so a strip where two neighbours both step toward one another would
 * otherwise have the second one's clear erase what the first one's write had just put down. The two
 * passes are separated rather than ordered carefully, because "carefully" is the state that stops
 * being true when somebody adds a third kind of move.
 *
 * Returns the image it was given, by reference, whenever no frame was marked — so `CHECK`, and a
 * `SNAP` every frame of which was inside the tolerance or refused for room, both cost nothing and
 * the caller can tell from the reference alone that the sheet did not move.
 *
 * Pure, and one copy of a result that is `grid²` times smaller than the sheet.
 */
export function snapFrames(image: ImageData, strips: readonly SpriteStrip[]): SnappedFrames {
  const moving = strips.flatMap((strip) => strip.frames.filter((frame) => frame.snapped));
  if (moving.length === 0) return { image, moved: 0 };

  const data = new Uint8ClampedArray(image.data);
  for (const frame of moving) clear(data, image.width, frame);
  for (const frame of moving) carry(image, data, frame);

  return { image: new ImageData(data, image.width, image.height), moved: moving.length };
}

/** The sheet after the move, and how many frames were actually carried. */
export interface SnappedFrames {
  readonly image: ImageData;
  /**
   * How many frames moved, which is what decides whether the sheet has to be segmented again.
   *
   * Not reported on the result: every frame carries its own {@link AlignedFrame.snapped}, and this
   * is the count of exactly those — see `QuantiseResult.strips` for why a second statement of one
   * fact is one more thing that can be wrong about it.
   */
  readonly moved: number;
}

/** Empty the box a frame is leaving, so the move does not leave a copy of it behind. */
function clear(data: Uint8ClampedArray, width: number, frame: AlignedFrame): void {
  const { box } = frame;
  for (let row = 0; row < box.height; row += 1) {
    let at = pixelOffset(width, box.left, box.top + row);
    for (let column = 0; column < box.width; column += 1) {
      data[at] = 0;
      data[at + 1] = 0;
      data[at + 2] = 0;
      data[at + 3] = FULLY_TRANSPARENT;
      at += CHANNELS_PER_PIXEL;
    }
  }
}

/**
 * Write the frame's own pixels where its slot is, reading them from the sheet as it stood.
 *
 * The whole box rather than only its opaque pixels: the box is exactly as clear of anything else as
 * `makesRoom` demanded, so what is written into its empty corners is the transparency that was
 * already there. Copying the box whole is also what keeps this a move — a pass that skipped the
 * clear pixels would be a paste, and would leave whatever the destination happened to hold showing
 * through the frame's own gaps.
 */
function carry(image: ImageData, data: Uint8ClampedArray, frame: AlignedFrame): void {
  const { box, drift } = frame;
  for (let row = 0; row < box.height; row += 1) {
    let from = pixelOffset(image.width, box.left, box.top + row);
    let to = pixelOffset(image.width, box.left - drift.x, box.top + row - drift.y);
    for (let column = 0; column < box.width; column += 1) {
      data[to] = image.data[from] ?? 0;
      data[to + 1] = image.data[from + 1] ?? 0;
      data[to + 2] = image.data[from + 2] ?? 0;
      data[to + 3] = image.data[from + 3] ?? 0;
      from += CHANNELS_PER_PIXEL;
      to += CHANNELS_PER_PIXEL;
    }
  }
}
