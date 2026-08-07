import { useMemo } from 'react';
import { PALETTE_COLOR_COUNTS } from '../../constants/quantiser.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useImagePaste } from '../../hooks/useImagePaste.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { detectPixelGrid } from '../../utils/pixelGrid.ts';
import { quantiseImage } from '../../utils/quantiseImage.ts';
import { parseTargetSize, targetSizeGrid } from '../../utils/targetSize.ts';
import { GridControls } from '../quantise/GridControls.tsx';
import { ImageComparison } from '../quantise/ImageComparison.tsx';
import { ImageDropZone } from '../quantise/ImageDropZone.tsx';

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
 * The state is the two things that cannot be derived: which image, and which grid. Everything else
 * below is a pure function of them recomputed in a `useMemo`, never mirrored into a `useState` and
 * refreshed by an effect.
 */
export function QuantiseTab() {
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  // In a store rather than here, because the workflow crosses tabs: the colour budget and the target
  // size are studio settings, and `App` unmounts this view when the user goes to change one.
  const source = useQuantiseStore((state) => state.source);
  const gridOverride = useQuantiseStore((state) => state.gridOverride);
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
            componentCountFor(directionalMode, parseAdditionalAnatomy(additionalAnatomy)),
          ),
    [source, target, directionalMode, additionalAnatomy],
  );

  const result = useMemo(
    () =>
      source === null || grid === null
        ? null
        : quantiseImage(source.image, { grid, maxColors: PALETTE_COLOR_COUNTS[paletteLimit] }),
    [source, grid, paletteLimit],
  );

  return (
    <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-ink">Quantise a returned sheet</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Snap the image back to the pixel scale it was meant to be drawn at, and reduce it to the colour
          budget the prompt asked for. Every colour in the result is one the image already contained — nothing
          is averaged into existence, and no dithering is applied.
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
            onGridChange={setGridOverride}
          />
          <ImageComparison sourceName={source.name} source={source.image} result={result} />
        </>
      )}
    </div>
  );
}
