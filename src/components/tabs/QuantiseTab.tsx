import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useQuantiseWork } from '../../hooks/useQuantiseWork.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { PixelGrid, Quantised, SheetFacts } from '../../types/quantiser.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { targetSizeGrid } from '../../utils/targetSizeGrid.ts';
import { GridControls } from '../quantise/GridControls.tsx';
import { ImageComparison } from '../quantise/ImageComparison.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';
import { KeyingControls } from '../quantise/KeyingControls.tsx';
import { PaletteLockControls } from '../quantise/PaletteLockControls.tsx';
import { SpriteControls } from '../quantise/SpriteControls.tsx';
import { QuantiseGuide } from '../quantise/QuantiseGuide.tsx';

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
  // One memoised object, because the hook keys its debounce on the tuning's identity — atomic
  // selectors above, so an unrelated store change does not rebuild it.
  const tuning = useMemo(
    () => ({
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
    }),
    [
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
    () => (!keyingEnabled || keyColor === null ? null : { color: keyColor, tolerance: keyTolerance }),
    [keyingEnabled, keyColor, keyTolerance],
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

  const { facts, grid, quantised, busy, error } = useQuantiseWork(
    source,
    gridOverride,
    keying,
    colorPlan.reduction,
    tuning,
  );

  // The studio's own target size, read as a second candidate. Deliberately **not** folded into
  // `grid`: it is an upper bound derived from how many components the sheet has to seat, not a
  // measurement of this image, so it is offered to click and never silently preferred.
  const target = useMemo(() => parseTargetSize(spriteTargetSize), [spriteTargetSize]);
  const suggested = useMemo(
    () =>
      source === null || target === null
        ? null
        : targetSizeGrid(
            source.image,
            target,
            componentCountFor(
              category,
              directionalMode,
              directions,
              sheetIndex,
              parseAdditionalAnatomy(additionalAnatomy),
            ),
          ),
    [source, target, category, directionalMode, directions, sheetIndex, additionalAnatomy],
  );

  return (
    <div className="animate-view-fade-in mx-auto max-w-6xl space-y-6">
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
        <>
          {error !== null && (
            <p
              role="alert"
              className="rounded-2xl border border-rose/40 bg-rose/10 p-4 text-xs leading-relaxed text-rose"
            >
              {error}
            </p>
          )}

          <GridControls
            facts={facts}
            target={target}
            suggested={suggested}
            grid={grid}
            colorPlan={colorPlan}
            onGridChange={setGridOverride}
          />
          {/* The panel is handed the same `keying` the pipeline was, rather than working it out again
              from the two settings behind it — one rule, one place. The share is the transform's own
              answer, so it is `null` until there is a transform, which is the same condition the
              comparison below shows its placeholder for. */}
          <KeyingControls keying={keying} keyedShare={quantised?.result.keyedShare ?? null} busy={busy} />
          <PaletteLockControls
            resultImage={quantised?.result.image ?? null}
            sheetName={source.name}
            studioSetting={colorPlan.studioSetting}
            superseded={colorPlan.superseded}
            busy={busy}
          />
          <SpriteControls
            sprites={quantised?.result.sprites ?? null}
            keyed={keying !== null}
            target={target}
            busy={busy}
          />
          <ImageComparison
            sourceName={source.name}
            source={source.image}
            sourceColors={facts?.colors ?? null}
            scale={facts?.scale ?? null}
            grid={grid}
            quantised={quantised}
            busy={busy}
          />
        </>
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
  if (facts?.scale?.measurement === 'ESTIMATED' && grid === null) {
    return `Estimated a pixel scale of ${String(facts.scale.grid)} from the spacing of this sheet's edges. It has not been applied — choose it, or type a scale, to quantise the sheet.`;
  }
  if (quantised === null) return '';
  const { image, colors } = quantised.result;
  return `Quantised to ${String(image.width)} by ${String(image.height)} pixels, ${String(colors)} ${colors === 1 ? 'colour' : 'colours'}.`;
}
