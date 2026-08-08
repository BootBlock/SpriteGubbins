import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { detectPixelGrid } from '../../utils/pixelGrid.ts';
import { quantiseImage } from '../../utils/quantiseImage.ts';
import { parseTargetSize, targetSizeGrid } from '../../utils/targetSize.ts';
import { GridControls } from '../quantise/GridControls.tsx';
import { ImageComparison } from '../quantise/ImageComparison.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';
import { KeyingControls } from '../quantise/KeyingControls.tsx';

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
 * comes out and from how far. Everything else below is a pure function of those recomputed in a
 * `useMemo`, never mirrored into a `useState` and refreshed by an effect.
 */
export function QuantiseTab() {
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const palette = useOutputStore((state) => state.output.palette);
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

  const acceptFile = useImageFile(setSource);
  // Claimed for the whole page, which is right here and nowhere else: this tab's only input is an
  // image, so a paste anywhere in it is unambiguously meant for the drop zone.
  useImagePaste(acceptFile);

  const detected = useMemo(() => (source === null ? null : detectPixelGrid(source.image)), [source]);
  // The user's answer wins where they gave one; clearing the box falls back to detection, which may
  // itself have found nothing — in which case there is no result to show, and the panel says so.
  const grid = gridOverride ?? detected;

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

  // `null` on either count — the user has not asked, or the studio's key names no colour to match —
  // and the pipeline skips the pass entirely rather than keying against a default nobody chose.
  const keyColor = BACKGROUND_KEY_COLORS[backgroundKey];
  const keying = useMemo(
    () => (!keyingEnabled || keyColor === null ? null : { color: keyColor, tolerance: keyTolerance }),
    [keyingEnabled, keyColor, keyTolerance],
  );

  // The studio's two colour settings resolved to one instruction *and* one description of it — a
  // pinned palette supersedes the budget, and `colorPlanFor` is the single place that rule is
  // applied. The panel below is handed the same answer the pipeline is, for the same reason
  // `KeyingControls` is handed the keying: two readings of one setting can disagree, and did.
  const colorPlan = useMemo(() => colorPlanFor(palette, paletteLimit), [palette, paletteLimit]);

  const result = useMemo(
    () =>
      source === null || grid === null
        ? null
        : quantiseImage(source.image, { grid, key: keying, reduction: colorPlan.reduction }),
    [source, grid, keying, colorPlan],
  );

  return (
    <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Quantise a returned sheet</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Snap the image back to the pixel scale it was meant to be drawn at, bring its colours down to what
          the prompt asked for, and turn the background key into transparency. With no palette pinned in the
          studio, every colour that survives is one the image already contained; pin one and each pixel moves
          to its nearest entry instead. Nothing is averaged into existence and no dithering is applied either
          way.
        </p>
      </header>

      <ImageDropZone acceptFile={acceptFile} currentName={source?.name ?? null} />

      {source !== null && (
        <>
          <GridControls
            detected={detected}
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
          <KeyingControls keying={keying} keyedShare={result === null ? null : result.keyedShare} />
          <ImageComparison
            sourceName={source.name}
            source={source.image}
            // The two travel together or not at all: `result` is computed from `grid` above, so it is
            // non-null exactly when `grid` is, and the pair is what the comparison needs to scale by.
            quantised={result === null || grid === null ? null : { result, grid }}
          />
        </>
      )}
    </div>
  );
}
