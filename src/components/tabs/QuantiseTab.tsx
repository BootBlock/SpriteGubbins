import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { KEY_OFFER_BORDER_SHARE } from '../../constants/keyOffer.ts';
import { useImageDrop } from '../../hooks/useImageDrop.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useQuantiseTuning } from '../../hooks/useQuantiseTuning.ts';
import { useQuantiseWork } from '../../hooks/useQuantiseWork.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { borderKeyShare } from '../../utils/borderKeyShare.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { keyingInForce } from '../../utils/keyingInForce.ts';
import { statusOf } from '../../utils/quantiseStatus.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { componentTargetSize } from '../../utils/componentTargetSize.ts';
import { targetSizeGrid } from '../../utils/targetSizeGrid.ts';
import { ImageDropVeil } from '../quantise/ImageDropVeil.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';
import { QuantiseGuide } from '../quantise/QuantiseGuide.tsx';
import { QuantiseWorkspace } from '../quantise/QuantiseWorkspace.tsx';

/**
 * Turning a returned sheet into genuine pixel art, after the fact.
 *
 * The one follow-up on the prompt template's list that **no wording can close**. The template
 * already says "do not produce smooth artwork that has been downscaled" and "no anti-aliased
 * silhouette edges", and models return exactly that anyway. Grid alignment and palette reduction on
 * the returned image are the only guarantee, because they are the only step that does not depend on
 * a model complying.
 *
 * A tab rather than a modal: this is a workspace — an image, two previews at four zoom levels, a
 * grid control and a download — and the app's densest dialog is already a third of that surface.
 *
 * **The controls scroll and the previews stay**, once a sheet is loaded and the viewport is wide
 * enough for the split. The tab grew from four panels to ten, and every one of them stood above the
 * comparison it changes — so by the time a reader reached the frame-alignment dial, the canvases
 * that would tell them whether moving it helped were a screen and a half above. The controls take
 * five columns of twelve and the previews the other seven, which is the studio's arrangement with
 * the width shared differently: there, both columns hold a `SelectField` and the even split is what
 * has to clear the label budget, whereas here every select is on the left. Splitting the page
 * costs the canvases width whatever the ratio is, and 5/7 is how much of that is bought back — an
 * even split would have spent 68px of it on a column with no select to spend it on.
 * `--breakpoint-quantise` derives the 1224px that leaves, and states the arithmetic; below it the
 * tab stacks as it always did.
 *
 * The guide and the drop zone stay full width above the split, and the split itself is inside the
 * sheet guard, because a 5/12 column holding a drop zone beside seven columns of nothing would be a
 * worse layout than the one this replaced.
 *
 * The state is only what cannot be derived: which image, which grid, and whether the background key
 * comes out and from how far. Everything the transform says about them lives on a **worker** — see
 * `useQuantiseWork`, and the measurements behind that decision in `src/workers/quantiseWorker.ts`.
 * Neither the thread nor its answers belong to this component, which is what lets the user go to the
 * studio to change the colour budget and come back to the sheet they left rather than to a pipeline
 * starting again from nothing. What the tab keeps here is the two studio-derived candidates, which
 * are arithmetic on a handful of numbers rather than passes over sixteen megapixels.
 */
export function QuantiseTab() {
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const palette = useOutputStore((state) => state.output.palette);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const directions = useOutputStore((state) => state.output.directions);
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const category = useSubjectStore((state) => state.category);
  // In a store rather than here, because the workflow crosses tabs: the colour budget, the target
  // size and the background key are studio settings, and `App` unmounts this view when the user goes
  // to change one.
  const source = useQuantiseStore((state) => state.source);
  const gridOverride = useQuantiseStore((state) => state.gridOverride);
  const keyingEnabled = useQuantiseStore((state) => state.keyingEnabled);
  const keyTolerance = useQuantiseStore((state) => state.keyTolerance);
  const dither = useQuantiseStore((state) => state.dither);
  const lockedPalette = useQuantiseStore((state) => state.lockedPalette);
  const paletteSnap = useQuantiseStore((state) => state.paletteSnap);
  // Every dial the pipeline is tuned by, as one object with a stable identity — see
  // `useQuantiseTuning`, which says why that identity is load-bearing.
  const tuning = useQuantiseTuning();
  const setSource = useQuantiseStore((state) => state.setSource);
  const setGridOverride = useQuantiseStore((state) => state.setGridOverride);
  const clear = useQuantiseStore((state) => state.clear);

  const acceptFile = useImageFile(setSource);
  // Both claimed for the whole page, which is right here and nowhere else: this tab's only input is
  // an image, so a paste or a drop anywhere in it is unambiguously meant for the drop zone. The two
  // hooks stay apart because the gestures are not alike — a drop has to say where it will land while
  // the file is still in the air, and a paste has nothing to say until it has happened.
  useImagePaste(acceptFile);
  const isFileOver = useImageDrop(acceptFile);

  // `null` on either count — the user has not asked, or the studio's key names no colour to match —
  // and the pipeline skips the pass entirely rather than keying against a default nobody chose. The
  // memo is load-bearing rather than an optimisation: a fresh object each render would restart the
  // worker's debounce each render, and the transform would never be asked for.
  const keyColor = BACKGROUND_KEY_COLORS[backgroundKey];
  const keying = useMemo(
    () => keyingInForce(keyingEnabled, keyColor, keyTolerance),
    [keyingEnabled, keyColor, keyTolerance],
  );

  // Whether this sheet arrived with its field still on it, which is what the keying panel offers to
  // take out. Measured here beside the keying it is about, on the *source* rather than the result:
  // it is a fact about what was dropped, and it must not move as the dials do. It costs a walk of
  // the border alone — a few thousand pixels — so it stays on this thread rather than joining the
  // worker's answers, and it is skipped entirely once keying is on, where the offer has nothing to
  // add. The tolerance is the one the pass would run at, so the share is measured at the setting the
  // press would actually use.
  const keyOffered = useMemo(
    () =>
      source === null || keyColor === null || keyingEnabled
        ? false
        : borderKeyShare(source.image, keyColor, keyTolerance) >= KEY_OFFER_BORDER_SHARE,
    [source, keyColor, keyingEnabled, keyTolerance],
  );

  // The studio's two colour settings resolved to one instruction *and* one description of it — a
  // pinned palette supersedes the budget, and `colorPlanFor` is the single place that rule is
  // applied. The panel below is handed the same answer the pipeline is, for the same reason
  // `KeyingControls` is handed the keying: two readings of one setting can disagree, and did.
  // A palette locked off an earlier result supersedes both studio settings while it is held, and
  // this is where that rule is applied — one branch, as the pinned-over-budget rule already is.
  const colorPlan = useMemo(
    () => colorPlanFor(palette, paletteLimit, lockedPalette, paletteSnap),
    [palette, paletteLimit, lockedPalette, paletteSnap],
  );

  const { facts, grid, settings, quantised, busy, error } = useQuantiseWork(
    source,
    gridOverride,
    keying,
    colorPlan.reduction,
    tuning,
  );

  // The studio's own target size, read as a second candidate. Deliberately **not** folded into
  // `grid`: it is an upper bound derived from how many components the sheet has to seat, not a
  // measurement of this image, so it is offered to click and never silently preferred.
  //
  // Read through `componentTargetSize` rather than parsed here, because both things downstream of it
  // are per-component and a sheet of parts states the assembled subject instead. Fed the raw field
  // there, the grid candidate seats fifteen cells of a whole character rather than of a torso, and
  // the Sprites panel compares the largest piece against a size no piece on the sheet has — so its
  // *within the target* carries whatever slack separates a torso from a whole body, which is a
  // number nothing here knows. `null` withdraws both, and the app holds no per-piece size to put in
  // their place.
  const target = useMemo(
    () => componentTargetSize(category, directionalMode, directions, sheetIndex, spriteTargetSize),
    [category, directionalMode, directions, sheetIndex, spriteTargetSize],
  );
  // How many components this sheet's own prompt contracts for — the figure the sprite panel holds
  // the segmentation against, and the ceiling the grid suggestion seats. One derivation for both,
  // because two would be two answers to "what did the prompt ask for" on one screen.
  const expected = useMemo(
    () =>
      componentCountFor(
        category,
        directionalMode,
        directions,
        sheetIndex,
        parseAdditionalAnatomy(additionalAnatomy),
      ),
    [category, directionalMode, directions, sheetIndex, additionalAnatomy],
  );
  const suggested = useMemo(
    () => (source === null || target === null ? null : targetSizeGrid(source.image, target, expected)),
    [source, target, expected],
  );

  return (
    /*
      The veil is outside the tab's own column, not the last panel in it. `space-y-6` puts a
      `margin-bottom` on every child but the last, and a `position: fixed` box still carries the
      margin it was given — so inside the column the veil measured 24px short of the viewport
      whenever a sheet was loaded, leaving a strip of the page uncovered along the bottom edge.
    */
    <>
      <div className="animate-view-fade-in space-y-6">
        <header className="space-y-1">
          <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">
            Quantise a returned sheet
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
            Snap the image back to the pixel scale it was meant to be drawn at, bring its colours down to what
            the prompt asked for, and turn the background key into transparency.
          </p>
        </header>

        {/* The one place the tab's state is *spoken*. Three separate chips say it visually — the
            scale badge, the keyed share, and the pulsing chip over the result — and none of
            them is announced, so without this the tab goes silent for the debounce plus a job that
            can run for seconds and then swaps the result underneath a screen-reader user. One region
            rather than three, because three would talk over each other; rendered unconditionally,
            because a live region has to be in the document *before* its content changes to be
            announced at all. */}
        <p role="status" className="sr-only">
          {statusOf(busy, facts, grid, quantised)}
        </p>

        <QuantiseGuide
          facts={facts}
          hasSheet={source !== null}
          target={target}
          suggested={suggested}
          grid={grid}
          colorPlan={colorPlan}
          dithered={dither !== 'NONE' && colorPlan.reduction !== null}
        />

        <ImageDropZone acceptFile={acceptFile} currentName={source?.name ?? null} onClear={clear} />

        {source !== null && (
          <QuantiseWorkspace
            source={source}
            facts={facts}
            grid={grid}
            settings={settings}
            quantised={quantised}
            busy={busy}
            error={error}
            keying={keying}
            keyOffered={keyOffered}
            colorPlan={colorPlan}
            target={target}
            suggested={suggested}
            expected={expected}
            setGridOverride={setGridOverride}
          />
        )}
      </div>

      {/* Mounted only while a file is over the window, which is what drives the top-layer lift
          inside it — see `ImageDropVeil`, where the effect has no `isShowing` to watch. */}
      {isFileOver && <ImageDropVeil currentName={source?.name ?? null} />}
    </>
  );
}
