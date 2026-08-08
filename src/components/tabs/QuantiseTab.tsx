import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { PALETTE_COLOR_COUNTS } from '../../constants/quantiser.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useQuantiseWorker } from '../../hooks/useQuantiseWorker.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { Quantised, SheetFacts } from '../../types/quantiser.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { parseTargetSize, targetSizeGrid } from '../../utils/targetSize.ts';
import { GridControls } from '../quantise/GridControls.tsx';
import { ImageComparison } from '../quantise/ImageComparison.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';
import { KeyingControls } from '../quantise/KeyingControls.tsx';
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
 * `useQuantiseWorker`, and the measurements behind that decision in `src/workers/quantiseWorker.ts`.
 * What the tab keeps here is the two studio-derived candidates, which are arithmetic on a handful of
 * numbers rather than passes over sixteen megapixels.
 */
export function QuantiseTab() {
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
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

  const { facts, grid, quantised, busy, error } = useQuantiseWorker(
    source,
    gridOverride,
    keying,
    PALETTE_COLOR_COUNTS[paletteLimit],
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
            componentCountFor(category, directionalMode, parseAdditionalAnatomy(additionalAnatomy)),
          ),
    [source, target, category, directionalMode, additionalAnatomy],
  );

  return (
    <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Quantise a returned sheet</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Snap the image back to the pixel scale it was meant to be drawn at, reduce it to the colour budget
          the prompt asked for, and turn the background key into transparency.
        </p>
      </header>

      {/* The one place the tab's state is *spoken*. Three separate chips say it visually — the
          measured-scale badge, the keyed share, and the pulsing chip over the result — and none of
          them is announced, so without this the tab goes silent for the debounce plus a job that can
          run for seconds and then swaps the result underneath a screen-reader user. One region rather
          than three, because three would talk over each other; rendered unconditionally, because a
          live region has to be in the document *before* its content changes to be announced at all. */}
      <p role="status" className="sr-only">
        {statusOf(busy, facts, quantised)}
      </p>

      <QuantiseGuide />

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
            onGridChange={setGridOverride}
          />
          {/* The panel is handed the same `keying` the pipeline was, rather than working it out again
              from the two settings behind it — one rule, one place. The share is the transform's own
              answer, so it is `null` until there is a transform, which is the same condition the
              comparison below shows its placeholder for. */}
          <KeyingControls keying={keying} keyedShare={quantised?.result.keyedShare ?? null} busy={busy} />
          <ImageComparison
            sourceName={source.name}
            source={source.image}
            sourceColors={facts?.colors ?? null}
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
 */
function statusOf(busy: boolean, facts: SheetFacts | null, quantised: Quantised | null): string {
  if (busy) return facts === null ? 'Measuring the sheet.' : 'Quantising the sheet.';
  if (quantised === null) return '';
  const { image, colors } = quantised.result;
  return `Quantised to ${String(image.width)} by ${String(image.height)} pixels, ${String(colors)} ${colors === 1 ? 'colour' : 'colours'}.`;
}
