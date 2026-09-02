import { useMemo } from 'react';
import type { PreviewMode, Quantised } from '../types/quantiser.ts';
import { heatmapImage } from '../utils/heatmapImage.ts';
import { onionSkin } from '../utils/onionSkin.ts';
import { outlineSprites } from '../utils/spriteOutline.ts';

/** What the second frame draws, and what that picture actually is. */
export interface SecondPaneImage {
  /** The pixels to put on the canvas, or `undefined` while there is no result to draw. */
  readonly image: ImageData | undefined;
  /**
   * The mode the picture *is*, which is not always the mode chosen — see the note at `pictured`.
   * The frame's label and its alt text are both keyed by this.
   */
  readonly pictured: PreviewMode;
}

/**
 * The second preview frame's picture, built from whichever mode is showing.
 *
 * Split out of `ImageComparison`, which is a panel: two panes, a toolbar, the detached window and
 * the state behind all of them. This is the one question that is not about any of that — given a
 * result and a mode, what pixels does the right-hand canvas hold — and it was a third of the file.
 *
 * A hook with one call site for the reason `useQuantiseTuning` gives: it needs React, so
 * `src/utils/` is closed to it, and it is not a component. The three memos are what it exists for.
 */
export function useSecondPaneImage(
  quantised: Quantised | null,
  shown: PreviewMode,
  differenceScale: number,
): SecondPaneImage {
  // Keyed on the map rather than on `quantised`, which the hook above rebuilds on every render —
  // depending on that would repaint a full-size heatmap for a keystroke in the grid box.
  const difference = quantised?.result.difference;
  const heatmap = useMemo(
    () =>
      difference === undefined || shown !== 'DIFFERENCE' ? null : heatmapImage(difference, differenceScale),
    [difference, shown, differenceScale],
  );

  // The same arrangement one mode over, and keyed the same way: on the values the drawing depends
  // on, never on `quantised`. A **scattered** sheet is marked with no boxes rather than falling back
  // to the plain result — the frame then says "here is the result, and nothing on it was read as a
  // sprite", which is what the panel beside it is explaining. Falling back would instead show a
  // picture the pane's own description no longer fits.
  const resultImage = quantised?.result.image;
  const sprites = quantised?.result.sprites;
  // Drawn in the same pass as the boxes, so the result is copied once rather than twice. They are
  // **not** the same reading, though, and `SpriteSymmetry` says why: under a snap the segmentation
  // here is re-taken from the settled sheet while the axes describe the sheet the snap acted on, so
  // the two box sets need not agree. That is why each axis carries its own box and this passes them
  // whole rather than pairing them up by position. `null` is the pass being off — boxes, no marks.
  const symmetry = quantised?.result.symmetry;
  const marked = useMemo(
    () =>
      resultImage === undefined || sprites === undefined || shown !== 'SPRITES'
        ? null
        : outlineSprites(resultImage, sprites.kind === 'SEGMENTED' ? sprites.boxes : [], symmetry ?? []),
    [resultImage, sprites, symmetry, shown],
  );

  // The same arrangement again, one mode further on, and keyed the same way. `null` where the
  // alignment pass is off is deliberate rather than a fallback to the plain result: the stack is
  // made *of* that reading, so with the pass off there is nothing to stack, and the caption says so
  // rather than the pane quietly showing an ordinary result under a mode that promises a comparison.
  const strips = quantised?.result.strips;
  const stacked = useMemo(
    () =>
      resultImage === undefined || strips === undefined || strips === null || shown !== 'ONION'
        ? null
        : onionSkin(resultImage, strips),
    [resultImage, strips, shown],
  );

  const secondImage = heatmap ?? marked ?? stacked ?? resultImage;
  // **What the frame is *called* follows the picture, not the pill.** Every other mode always draws
  // its own second image while it is shown, so naming the frame after the mode says the same thing
  // as naming it after the picture. The onion is the first that can be shown with nothing to stack —
  // the alignment pass is off, which is how the mode is most often first reached — and there the
  // canvas is holding the ordinary result. Announcing it as a stack of frames would tell a
  // screen-reader user the image contains something it does not, and would contradict the caption
  // beside it, which already says the pass is off.
  const pictured: PreviewMode = shown === 'ONION' && stacked === null ? 'SIDE_BY_SIDE' : shown;

  return { image: secondImage, pictured };
}
