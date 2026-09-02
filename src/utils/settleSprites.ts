import type { QuantiseResult, QuantiseSettings } from '../types/quantiser.ts';
import { antiAlias } from './antiAlias.ts';
import { duplicateSprites } from './duplicateSprites.ts';
import { sheetStrips } from './frameAlignment.ts';
import { snapFrames } from './frameSnap.ts';
import { snapDuplicates } from './snapDuplicates.ts';
import { spriteSegments } from './spriteSegments.ts';
import { sheetSymmetry } from './symmetryAxis.ts';
import { snapSymmetric } from './symmetrySnap.ts';

/** What the passes taken over the segmentation left, and everything they found on the way. */
export interface SettledSheet extends Pick<
  QuantiseResult,
  'sprites' | 'symmetry' | 'duplicates' | 'snapped' | 'strips'
> {
  /** The sheet after all four passes - what a reader downloads. */
  readonly image: ImageData;
}

/**
 * The tail of the pipeline: the passes taken **over a reading** of the sheet, and the readings they
 * force.
 *
 * Split out of `quantiseImage`, which is the raster pipeline proper — key, harden, measure the mesh,
 * resolve the cells, reduce, clean and dither. **Three of the four passes here need the sheet to
 * have been *segmented* first**, and none of the passes above them does: the symmetry settle scores
 * an axis inside a sprite's own bounds, the duplicate fold compares one sprite with another, and the
 * frame alignment fits a lattice to a row of them. That is the same line the pipeline's own docblock
 * already drew.
 *
 * **The anti-aliasing is the fourth and needs no reading at all** — it takes an image and four dial
 * values. It is here because of where it has to *sit*: nothing may run after it, since it is the one
 * pass that deliberately puts colour back between the palette's, and the three readings above
 * compare colours a softened contour would have moved. Its own output then forces the last
 * re-segmentation, which is the other half of what this file owns. Its comment at the call site
 * carries the full argument.
 *
 * Every re-segmentation the four pay for is therefore here too, and each is a linear pass paid only
 * by the reader who asked for the edit that made it necessary. Keeping them together is what lets
 * the conditions be read against one another: each says which sheet its answer is about, and a box
 * moved by one pass is at the position it left until the sheet is read again.
 */
export function settleSprites(reduced: ImageData, settings: QuantiseSettings): SettledSheet {
  // **The last passes of all, and the two of them run *over a reading* rather than over the sheet.**
  // Both ask a question about the sprites the sheet holds — is this one symmetric, is this one a
  // repeat of that one — so both need the segmentation to exist before they can ask anything, and
  // both are taken here rather than earlier for that reason.
  //
  // The order between them is stated rather than incidental: **the symmetry settle runs first, and
  // the duplicate reading is then taken over what it produced.** A settle can bring two sprites that
  // differed only in their drift into agreement, so reading duplicates first would be reading a
  // sheet the reader is not going to get — and the fold copies whole blocks, so it should copy the
  // finished sprite rather than one that is about to be settled again in place.
  //
  // Each reading therefore describes the sheet as it stood immediately before *its own* edit, which
  // is the only state in which either means anything: a sprite that has just been made symmetric
  // reports perfect confidence whatever it arrived as, and a member that has just been overwritten
  // with its canonical is an exact duplicate of it by construction.
  const segmented = spriteSegments(reduced, settings.spriteGap);

  // `OFF` skips the sweep outright rather than scoring and discarding, which is how the outline
  // expansion and the reductions are guarded: it converts every pixel of every sprite to OKLab, and
  // that is not a cost to pay for a reader who never turns the control on. A sheet that did not
  // segment is skipped for a different reason — there are no bounds to score inside — and the empty
  // array says so, where `null` would say the reader had left the pass off.
  const symmetry =
    settings.symmetry === 'OFF'
      ? null
      : sheetSymmetry(
          reduced,
          segmented.kind === 'SEGMENTED' ? segmented.boxes : [],
          settings.symmetryTolerance,
          // A percentage on the dial and a share here, because the dial is a figure a reader reads
          // and this is a figure a confidence is compared with. `CHECK` passes `null`, which is the
          // one thing that means "settle nothing" — a floor of 100 still settles a sprite that is
          // already exact.
          settings.symmetry === 'SNAP' ? settings.symmetryConfidence / 100 : null,
        );
  const settled = symmetry === null ? reduced : snapSymmetric(reduced, symmetry);
  // Re-read where the settle moved a pixel, and reused where it did not. A settle can clear a pixel
  // whose partner was clear, and a pixel cleared out of a one-pixel bridge parts the region that ran
  // through it — so the boxes the duplicate reading is taken over have to come from the sheet that
  // reading is about. `snapSymmetric` hands back its argument by reference wherever nothing moved,
  // which is what makes the comparison the cheap way to ask.
  const settledSprites = settled === reduced ? segmented : spriteSegments(settled, settings.spriteGap);

  // **The reading runs whether or not the fold does**, because it is a fact the result carries
  // either way, and because the fold has nothing to act on until it exists. It is skipped where the
  // segmentation found no sprites to compare: `SOLID` and `SCATTERED` carry no boxes at all, which
  // is the honest answer rather than a shape a duplicate reading could be taken over — see
  // `SpriteSegmentation`.
  const boxes = settledSprites.kind === 'SEGMENTED' ? settledSprites.boxes : [];
  const duplicates = duplicateSprites(settled, boxes, settings.duplicateTolerance);
  // The fold is skipped where it has nothing to fold, rather than called and returning a copy: the
  // copy alone is 67MB at the ceiling this app admits, and `reduceColors` and the outline expansion
  // are both guarded the same way and for the same reason.
  //
  // **`snapped` is what the fold actually did**, not that it was asked for. A dial switched on over
  // a sheet with no repeats folds nothing, and so does one whose every member sits too close to a
  // neighbour to be redrawn — see `snapDuplicates`. Reporting either as a fold would have the panel
  // announcing an edit that did not happen, and would pay a second segmentation for it.
  const fold =
    settings.duplicateSnap && duplicates.length > 0 ? snapDuplicates(settled, duplicates, boxes) : null;
  const snapped = fold !== null && fold.folded > 0;
  const folded = fold !== null && snapped ? fold.image : settled;
  const foldedSprites = snapped ? spriteSegments(folded, settings.spriteGap) : settledSprites;

  // **The last reading of all, and the only pass that *moves* artwork rather than editing it.** It
  // asks a question about the rows the sprites are laid out in — does this run hold still — so it
  // needs the segmentation, and it needs the one taken over the sheet as it will actually be
  // downloaded: every pass above may have changed a silhouette, and a strip is fitted to where the
  // silhouettes are. That is also why it goes after the fold rather than before it. The fold copies
  // whole sprites between positions, so reading strips first would fit a lattice to a layout the
  // fold is about to change.
  //
  // `OFF` skips it outright rather than reading and discarding, which is how the outline expansion,
  // the reductions and the symmetry sweep are all guarded: it registers every frame of every row
  // against that row's first frame, and that is not a cost to pay for a reader who never turns the
  // control on.
  const strips =
    settings.frameAlignment === 'OFF'
      ? null
      : sheetStrips(
          folded,
          foldedSprites.kind === 'SEGMENTED' ? foldedSprites.boxes : [],
          // `null` is the one thing that means "move nothing" — a tolerance of 0 still moves every
          // frame that is off its slot, which is the strictest position rather than an off one.
          settings.frameAlignment === 'SNAP' ? settings.frameDriftTolerance : null,
        );
  // `snapFrames` reports how many frames it carried, and `realigned` is that count as a question —
  // the shape the fold above takes rather than the settle's, which asks by identity. The reason for
  // asking at all is the one all three share: a re-segmentation is a linear pass nobody should pay
  // for a sheet that did not change. The pass also hands back its argument by reference wherever no
  // frame was marked, so a caller may ask either way; this one takes the count because the sheet it
  // is about is compared with `output` at `sprites:` below, and one expression cannot answer for two
  // passes — which is precisely what that field used to try. **This pass changes no silhouette, but
  // it changes where one *is***, so every box a moved frame owns is at the position it left until
  // the sheet is read again.
  const realignment = strips === null ? null : snapFrames(folded, strips);
  const realigned = realignment !== null && realignment.moved > 0;
  const aligned = realignment !== null && realigned ? realignment.image : folded;

  // **The last pass of all, and the only one that puts smooth colour back.** Everything above takes
  // a resampled render apart into flat cells, which is what turns a returned sheet into pixel art
  // and what leaves every contour a staircase of axis-aligned steps; this reads those steps back
  // into the sub-pixel coverage they imply and writes it. See `antiAlias` for the geometry and its
  // grounding.
  //
  // **Nothing may run after it, and the order is not interchangeable.** It is the one pass that
  // deliberately creates colours between the palette's, so every pass that assumes flat colour has
  // to be behind it — the fill cleanup most of all, which is built to remove exactly the lone
  // intermediate pixel this writes. The three readings taken over the segmentation compare
  // *colours*, so two frames that are exact duplicates before it differ afterwards wherever their
  // contours sit differently against the mesh. And the frame alignment moves whole frames, so a
  // fringe computed against a neighbour a frame no longer has is a fringe against nothing.
  //
  // The strength is a percentage on the dial and a fraction here, as the symmetry confidence is:
  // one is a figure a reader reads, the other is a figure a coverage is multiplied by. The snap is
  // gated on a reduction being in force for the reason `AntiAliasPalette` gives — with no palette
  // stated there is nothing for a blend to be kept to — which is the same gate the dither keeps.
  const output = antiAlias(aligned, {
    mode: settings.antiAlias,
    threshold: settings.antiAliasThreshold,
    strength: settings.antiAliasStrength / 100,
    shortestRun: settings.antiAliasRun,
    snap: settings.antiAliasPalette === 'SNAP' && settings.reduction !== null,
  });

  // **`INTERIOR` is exempted, and provably rather than by assumption.** `inScope` in `edgeClaims`
  // reads that position as `!silhouette`, so what it refuses is the boundary with one clear pixel
  // and one drawn one — and both of the pairs it admits are safe. Where the two are drawn,
  // `coverageBlend` interpolates the two alphas, so the result is a convex combination of two
  // values at or above one and cannot round to zero. Where both are clear, the same interpolation
  // is zero throughout and takes that function's `alpha <= 0` return, which writes a fully
  // transparent pixel. No pixel is cleared and no pixel stops being clear either way, so no box
  // can move however many interior pixels changed. Without this the pass would pay a full linear
  // re-segmentation for an answer identical to the one it already has.
  //
  // **The exemption is asked of `aligned`, and that is the whole of why the arms are nested.**
  // Written against the fold's sheet it also short-circuited the frame alignment's answer, which
  // the proof above says nothing about — that pass moves whole frames, which is a box moving — so
  // a snapped frame was reported at the position it left and cut there by the `.aseprite`, pack
  // and manifest writers. The inner arm is that answer: the sheet the alignment left, read afresh
  // where a frame moved and taken from the fold's reading where none did.
  const finalSprites =
    output === aligned || settings.antiAlias === 'INTERIOR'
      ? realigned
        ? spriteSegments(aligned, settings.spriteGap)
        : foldedSprites
      : spriteSegments(output, settings.spriteGap);

  return {
    image: output,
    sprites: finalSprites,
    symmetry,
    duplicates,
    snapped,
    strips,
  };
}
