import type { TuneReading, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { upscaleOverMesh } from './gridAlignment.ts';
import { colorHistogram } from './imageData.ts';
import { quantiseRegions } from './quantiseImage.ts';
import { ssimAgainst } from './ssim.ts';
import type { TuneCrop } from './tuneCrop.ts';

/**
 * How one set of dial positions does across the crops: how faithfully it reproduces them, and what
 * it spends doing it.
 *
 * The sweep's inner loop, in its own file because it is a second responsibility rather than a helper
 * — `autoTune` decides *which* positions to try, and this decides what one position is worth.
 *
 * **It is handed each crop already measured rather than the crop**, which is one value doing both of
 * the jobs this function has. The keying, the hardening and the mesh are the same for every
 * candidate — none of their three settings is in {@link TunedDials} — so measuring them per
 * candidate was measuring each crop's one answer once for every position tried: 710 calls to answer
 * five meshes, over a sweep of `test_sprites/armour.png` at a grid of 6. The image they produce is
 * *also* what a candidate is scored against, because a result has been keyed and hardened and a
 * reference that had not been would score every candidate against a field and a fringe none of them
 * produces. Those used to be two values built from the same three settings in two places; the
 * prologue is the one that remains, so the pair cannot come apart, and the likeness score's side of
 * that image is measured once beside it — see {@link TuneCrop}.
 *
 * **Fidelity is measured on the result painted back over the crop's own mesh**, which is what
 * makes a downscale comparable with the artwork it came from at all: the pipeline's output is one
 * pixel per cell, and the crop is one pixel per source pixel. Each output pixel stands for the mesh
 * cell it was read from, so it goes back over exactly that cell — see `upscaleOverMesh`. Magnifying
 * it by the grid instead put cell `i` at `i × grid`, which is where the mesh puts it only on a
 * lattice that starts at the corner and never drifts. A crop whose lattice is phased, or a sheet
 * whose pitch drifts, then scored every candidate against art a cell or more away from it: an exact
 * sheet at a phase of 2 in a grid of 4, reduced with no loss, scored 0.19 rather than 1. The paint
 * invents no colour and moves no edge, so the comparison is against what the reader would see at 1:1
 * in the preview, and it is the same size as the crop by construction.
 *
 * **The crops are quantised together, as regions of one sheet**, rather than one at a time as five
 * sheets of their own — see `quantiseRegions`. Under a colour budget each crop used to get its own
 * palette and its own colour merge, where the sheet gets one of each across all its art, so every
 * candidate was ranked against palettes the reader would never get — 73 colours between the five
 * crops of `test_sprites/armour.png` under a budget of 16.
 *
 * **Fidelity is averaged over the crops rather than taken from the best of them**, because the dials
 * are being chosen for the whole sheet: a position that is excellent on one window and poor on the
 * other two is the wrong answer, and a maximum would pick it. **The colours are counted across all
 * the crops at once**, because a colour is spent once per sheet rather than once per crop: two crops
 * that each hold 16 colours cost the sheet 16 if they are the same 16 and 32 if they share none, and
 * a mean would call both 16.
 *
 * Pure, like everything else here. The caller passes the same `settings` to every candidate and
 * varies only the swept dials, so the grid, the keying and the colour reduction are constant across
 * a comparison — which is what makes two candidates' readings comparable at all.
 */
export function readCandidate(
  dials: TunedDials,
  crops: readonly TuneCrop[],
  settings: QuantiseSettings,
): TuneReading {
  // **The anti-aliasing pass runs exactly as the reader pointed it**, which is the one setting on
  // this line that is neither held fixed nor swept. Its four *shaping* dials are in `dials` and are
  // swept like any other; its mode is in `settings` and the sweep may not touch it — see
  // `TUNE_ALIAS_STAGES` for why that line falls there.
  //
  // **It used to be forced off here**, on the argument that the pass corrupts both figures a
  // candidate is ranked by: it moves the result back toward the smooth source `fidelity` is
  // measured against, and every coverage it writes is another entry in `colors`. Both halves of
  // that are true and neither is a reason to hide the pass from the score. A reader with the pass
  // on is going to *get* that fringe, so the two badges the panel reported were figures about a
  // sheet nobody was looking at. Measured on `test_sprites/armour.png` at a grid of 6, unkeyed,
  // with a budget of 16 and every other dial where it opens, the sweep reports 16 → 16 colours with
  // the control at `OFF` and the same 16 → 16 with it at `BOTH`, where it settles the pass
  // at a strength of 10% over only the hardest contours, runs of twelve and longer — a coverage is
  // an alpha and `SNAP` bounds the hues rather than the count, so every one it writes is a colour
  // the trade has to pay for, and the sweep pays for as few as it can: at that position the pass
  // changes 83 of the whole sheet's 43,681 pixels and adds no colour, to the crops or to the whole
  // sheet. Ranking the candidates on what they actually produce is what puts badge and
  // preview back in agreement, and the price of a colour is what stops the fringe being bought at
  // any price.
  const images = quantiseRegions(
    crops.map(({ prologue }) => prologue),
    { ...settings, ...dials },
  );

  let fidelity = 0;
  const colors = new Set<number>();
  crops.forEach(({ prologue, reference }, index) => {
    const image = images[index];
    if (image === undefined) return;
    const { source, mesh } = prologue;
    fidelity += ssimAgainst(reference, upscaleOverMesh(image, mesh, source.width, source.height));
    for (const color of colorHistogram(image).keys()) colors.add(color);
  });

  return { fidelity: fidelity / crops.length, colors: colors.size };
}
