import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { KEY_OFFER_BORDER_SHARE } from '../../constants/keyOffer.ts';
import { estimatedScaleStatus } from '../../constants/quantiser.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useQuantiseWork } from '../../hooks/useQuantiseWork.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { PixelGrid, Quantised, SheetFacts } from '../../types/quantiser.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { borderKeyShare } from '../../utils/borderKeyShare.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { keyingInForce } from '../../utils/keyingInForce.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { componentTargetSize } from '../../utils/componentTargetSize.ts';
import { targetSizeGrid } from '../../utils/targetSizeGrid.ts';
import { AntiAliasControls } from '../quantise/AntiAliasControls.tsx';
import { AutoTuneControls } from '../quantise/AutoTuneControls.tsx';
import { DialHistoryControls } from '../quantise/DialHistoryControls.tsx';
import { DuplicateControls } from '../quantise/DuplicateControls.tsx';
import { FrameAlignmentControls } from '../quantise/FrameAlignmentControls.tsx';
import { GridControls } from '../quantise/GridControls.tsx';
import { ImageComparison } from '../quantise/ImageComparison.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';
import { KeyingControls } from '../quantise/KeyingControls.tsx';
import { PaletteExportControls } from '../quantise/PaletteExportControls.tsx';
import { PaletteLockControls } from '../quantise/PaletteLockControls.tsx';
import { QuantiseGuide } from '../quantise/QuantiseGuide.tsx';
import { QuantisePresetControls } from '../quantise/QuantisePresetControls.tsx';
import { SheetIdentityControls } from '../quantise/SheetIdentityControls.tsx';
import { SpriteControls } from '../quantise/SpriteControls.tsx';
import { SymmetryControls } from '../quantise/SymmetryControls.tsx';

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
 * has to clear the label budget, whereas here all three selects are on the left. Splitting the page
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
  const silhouetteThreshold = useQuantiseStore((state) => state.silhouetteThreshold);
  const vote = useQuantiseStore((state) => state.vote);
  const outlineExpansion = useQuantiseStore((state) => state.outlineExpansion);
  const lineStrength = useQuantiseStore((state) => state.lineStrength);
  const trimStrength = useQuantiseStore((state) => state.trimStrength);
  const inkThreshold = useQuantiseStore((state) => state.inkThreshold);
  const fillCleanup = useQuantiseStore((state) => state.fillCleanup);
  const cleanupPasses = useQuantiseStore((state) => state.cleanupPasses);
  const dither = useQuantiseStore((state) => state.dither);
  const colorMerge = useQuantiseStore((state) => state.colorMerge);
  const lockedPalette = useQuantiseStore((state) => state.lockedPalette);
  const paletteSnap = useQuantiseStore((state) => state.paletteSnap);
  const spriteGap = useQuantiseStore((state) => state.spriteGap);
  const symmetry = useQuantiseStore((state) => state.symmetry);
  const symmetryTolerance = useQuantiseStore((state) => state.symmetryTolerance);
  const symmetryConfidence = useQuantiseStore((state) => state.symmetryConfidence);
  const duplicateTolerance = useQuantiseStore((state) => state.duplicateTolerance);
  const duplicateSnap = useQuantiseStore((state) => state.duplicateSnap);
  const frameAlignment = useQuantiseStore((state) => state.frameAlignment);
  const frameDriftTolerance = useQuantiseStore((state) => state.frameDriftTolerance);
  const antiAlias = useQuantiseStore((state) => state.antiAlias);
  const antiAliasThreshold = useQuantiseStore((state) => state.antiAliasThreshold);
  const antiAliasStrength = useQuantiseStore((state) => state.antiAliasStrength);
  const antiAliasRun = useQuantiseStore((state) => state.antiAliasRun);
  const antiAliasPalette = useQuantiseStore((state) => state.antiAliasPalette);
  // One memoised object, because the hook keys its debounce on the tuning's identity — atomic
  // selectors above, so an unrelated store change does not rebuild it.
  const tuning = useMemo(
    () => ({
      silhouetteThreshold,
      vote,
      outlineExpansion,
      lineStrength,
      trimStrength,
      inkThreshold,
      colorMerge,
      fillCleanup,
      cleanupPasses,
      dither,
      spriteGap,
      symmetry,
      symmetryTolerance,
      symmetryConfidence,
      duplicateTolerance,
      duplicateSnap,
      frameAlignment,
      frameDriftTolerance,
      antiAlias,
      antiAliasThreshold,
      antiAliasStrength,
      antiAliasRun,
      antiAliasPalette,
    }),
    [
      silhouetteThreshold,
      vote,
      outlineExpansion,
      lineStrength,
      trimStrength,
      inkThreshold,
      colorMerge,
      fillCleanup,
      cleanupPasses,
      dither,
      spriteGap,
      symmetry,
      symmetryTolerance,
      symmetryConfidence,
      duplicateTolerance,
      duplicateSnap,
      frameAlignment,
      frameDriftTolerance,
      antiAlias,
      antiAliasThreshold,
      antiAliasStrength,
      antiAliasRun,
      antiAliasPalette,
    ],
  );
  const setSource = useQuantiseStore((state) => state.setSource);
  const setGridOverride = useQuantiseStore((state) => state.setGridOverride);
  const clear = useQuantiseStore((state) => state.clear);

  const acceptFile = useImageFile(setSource);
  // Claimed for the whole page, which is right here and nowhere else: this tab's only input is an
  // image, so a paste anywhere in it is unambiguously meant for the drop zone.
  useImagePaste(acceptFile);

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
    <div className="animate-view-fade-in space-y-6">
      <header className="space-y-1">
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Quantise a returned sheet</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Snap the image back to the pixel scale it was meant to be drawn at, bring its colours down to what
          the prompt asked for, and turn the background key into transparency.
        </p>
      </header>

      {/* The one place the tab's state is *spoken*. Three separate chips say it visually — the
          scale badge, the keyed share, and the pulsing chip over the result — and none of
          them is announced, so without this the tab goes silent for the debounce plus a job that can
          run for seconds and then swaps the result underneath a screen-reader user. One region rather
          than three, because three would talk over each other; rendered unconditionally, because a
          live region has to be in the document *before* its content changes to be announced at all. */}
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
        /*
          The split, and it is inside the sheet guard on purpose: with no image loaded the tab is a
          paragraph and a drop zone, and a 5/12 column holding the drop zone beside seven columns of
          nothing is a worse layout than the one it replaced.

          `items-start` is what makes the sticky column possible at all — without it the grid
          stretches both columns to the taller one's height, and an element already as tall as its
          container has nowhere to stick to.
        */
        <div className="grid grid-cols-1 items-start gap-6 quantise:grid-cols-12">
          <div className="space-y-6 quantise:col-span-5">
            {error !== null && (
              <p
                role="alert"
                className="rounded-2xl border border-rose/40 bg-rose/10 p-4 text-xs leading-relaxed text-rose"
              >
                {error}
              </p>
            )}

            {/* Above every panel it governs, and inside the sheet guard with them: it steps the dials
                back through the positions they have been in, and with no sheet loaded there are no
                dials on screen for a step to be about. */}
            <DialHistoryControls />

            <GridControls
              facts={facts}
              target={target}
              suggested={suggested}
              grid={grid}
              colorPlan={colorPlan}
              onGridChange={setGridOverride}
            />
            {/* Under the grid it depends on and above every dial it moves — see `AutoTuneControls`,
                which says why both halves of that placement matter. */}
            <AutoTuneControls image={source.image} settings={settings} />
            {/* The panel is handed the same `keying` the pipeline was, rather than working it out again
                from the two settings behind it — one rule, one place. The share is the transform's own
                answer, so it is `null` until there is a transform, which is the same condition the
                comparison beside it shows its placeholder for. */}
            <KeyingControls
              keying={keying}
              keyedShare={quantised?.result.keyedShare ?? null}
              busy={busy}
              offered={keyOffered}
            />
            <PaletteLockControls
              resultImage={quantised?.result.image ?? null}
              sheetName={source.name}
              studioSetting={colorPlan.studioSetting}
              superseded={colorPlan.superseded}
              busy={busy}
            />
            {/* Directly under the lock, because one of the two palettes it offers is that lock —
                and separate from it because a download does nothing to the next sheet, which is
                what the panel above is entirely about. The colours are the transform's own answer
                rather than a reading taken here; see `QuantiseResult.paletteEntries`. */}
            <PaletteExportControls
              resultPalette={quantised?.result.paletteEntries ?? null}
              sheetName={source.name}
            />
            {/* Directly above the sprite panel, because the two are the two readings of one sheet:
                this states what the studio's prompt asked for and what a download is about to record,
                and the panel below states what actually came back. It changes no pixel and no dial —
                its buttons move the *studio* — so it sits with the readings rather than among the
                passes above it. */}
            <SheetIdentityControls />
            <SpriteControls
              sprites={quantised?.result.sprites ?? null}
              target={target}
              expected={expected}
              busy={busy}
            />
            {/* Directly under the sprite panel, because it is a reading *of* that reading: an axis is
                scored inside a sprite's own bounds, so what this panel can say is decided by what the
                one above found. It is inside the same sheet guard for the same reason as the rest. */}
            <SymmetryControls
              symmetry={quantised?.result.symmetry ?? null}
              sprites={quantised?.result.sprites ?? null}
              busy={busy}
            />
            {/* Beside the symmetry panel and for the same reason: it has nothing to say until sprites
                have been separated, and its guidance sends a reader back up to the panel above when
                they have not been. */}
            <DuplicateControls
              sprites={quantised?.result.sprites ?? null}
              duplicates={quantised?.result.duplicates ?? null}
              snapped={quantised?.result.snapped ?? false}
              busy={busy}
            />
            {/* Third of the readings taken over the segmentation, and last because it is the only one
                whose subject is a *row* rather than a sprite: what it can say is decided by what the
                three panels above found, and by the sheet those panels may already have rewritten. */}
            <FrameAlignmentControls
              sprites={quantised?.result.sprites ?? null}
              strips={quantised?.result.strips ?? null}
              busy={busy}
            />
            {/* Last of the dial panels, because its pass is last in the pipeline — see
                `quantiseImage`, which says why nothing may run after it. It is also the only pass on
                this tab that puts smooth colour back, so it belongs after every panel whose dials
                work toward the flat result it softens. */}
            <AntiAliasControls constrained={colorPlan.reduction !== null} />
            {/* Last of the panels, and below the dials rather than above them: it is the only one
                whose subject is the reader's own way of working rather than this sheet, so it reads as
                a place to *put* what the controls above arrived at. Inside the sheet guard with the
                rest — a collection of dial positions is nothing to offer someone who has not dropped
                an image yet, and there would be no dials on screen for Save to be about. */}
            <QuantisePresetControls />
          </div>

          {/*
            The previews, pinned. Everything the reader turns is in the column beside this one, and
            before the split they were all above it: ten panels of dials, and then the two canvases
            those dials change, a screen and a half further down. Tuning meant scrolling away from
            the only thing that says whether the tuning helped.

            The offsets are the studio's, and they name no height: `--sticky-column-top` and
            `--sticky-column-height` are derived from what `Header` measures, so the top clears the
            chrome and the cap gives it back at whatever height the bar happens to be. Both used to
            be written down here in two pairs, the second of each on `xl` to approximate the width at
            which the bar stops wrapping — which left the toolbar tucked under the header or a hole
            above it either side of that guess. See the two properties in `index.css`.

            `overflow-y-auto` is what makes the cap safe rather than tidy. A sticky element taller
            than its cap keeps its top pinned, so whatever hangs past the bottom cannot be scrolled
            to at all — on a short window that would be the second pane and the caption under it.
            The column scrolls instead. The pan viewports inside keep their own scrolling, and the
            lifted tooltip surfaces re-pin against this column the way they already do the studio's:
            `useAnchoredSurface` listens for `scroll` on the document in the capture phase precisely
            because an anchor may sit inside a scrolling panel.
            */}
          <div className="quantise:sticky quantise:top-[var(--sticky-column-top)] quantise:col-span-7 quantise:max-h-[var(--sticky-column-height)] quantise:overflow-y-auto">
            <ImageComparison
              sourceName={source.name}
              source={source.image}
              sourceColors={facts?.colors ?? null}
              scale={facts?.scale ?? null}
              grid={grid}
              quantised={quantised}
              target={target}
              busy={busy}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The tab's state as one sentence, for the live region above.
 *
 * Announces the **outcome** as well as the wait, because the outcome is the half a screen-reader user
 * cannot otherwise get: the two previews say everything visually and nothing else does. An empty
 * string while there is no sheet, so the region exists from the first render with nothing to say.
 *
 * **The sentence names the reading that answered**, as the badge and the panel do, and it takes its
 * wording from the same record they take theirs from — three readings produce an estimate here, and
 * for a long time every one of them was announced as the spacing of the sheet's edges.
 *
 * **An estimated scale is announced too, and it is the state that most needs it.** Nothing is
 * running and nothing has been produced — the tab is waiting on the reader — so without this the
 * region falls silent for good at the exact moment a sighted reader is being shown a badge, a
 * button and a paragraph all asking them to act. Saying "nothing is happening" by saying nothing is
 * indistinguishable from the tab having finished.
 *
 * **That announcement turns on `grid`, not on there being no result**, for the same reason the
 * result pane's placeholder does: with the estimate applied and the transform then failing, there
 * is still no result, and "it has not been applied" would be telling the reader to do the thing
 * they have just done — while the pane beside it says the transform failed. The two read the same
 * state and have to say the same thing about it.
 */
function statusOf(
  busy: boolean,
  facts: SheetFacts | null,
  grid: PixelGrid | null,
  quantised: Quantised | null,
): string {
  if (busy) return facts === null ? 'Measuring the sheet.' : 'Quantising the sheet.';
  const scale = facts?.scale ?? null;
  if (scale !== null && scale.measurement !== 'EXACT' && grid === null) {
    return estimatedScaleStatus(scale.grid, scale.measurement);
  }
  if (quantised === null) return '';
  const { image, colors } = quantised.result;
  return `Quantised to ${String(image.width)} by ${String(image.height)} pixels, ${String(colors)} ${colors === 1 ? 'colour' : 'colours'}.`;
}
