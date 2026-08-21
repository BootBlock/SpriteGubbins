import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_DIFFERENCE_SCALE, DEFAULT_WIPE, PREVIEW_ZOOMS } from '../../constants/quantiser.ts';
import { useLinkedPanes } from '../../hooks/useLinkedPanes.ts';
import type { PixelGrid, PreviewMode, Quantised, SheetScale } from '../../types/quantiser.ts';
import { heatmapImage } from '../../utils/heatmapImage.ts';
import { outlineSprites } from '../../utils/spriteOutline.ts';
import type { ComparisonPaneProps } from './ComparisonPane.tsx';
import { ComparisonPane } from './ComparisonPane.tsx';
import { ComparisonToolbar } from './ComparisonToolbar.tsx';
import { emptyReason, secondCaption, sourceCaption } from './paneCaptions.tsx';
import { WipePanes } from './WipePanes.tsx';

interface ImageComparisonProps {
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  readonly source: ImageData;
  /** Distinct colours the sheet arrived with, or `null` while they are still being counted. */
  readonly sourceColors: number | null;
  /**
   * What the sheet itself was read as, which is half of why this pane may be empty.
   *
   * Needed because "no result yet" has causes that call for opposite instructions: no scale was
   * found at all, so one has to be typed — or one was **estimated** and deliberately not adopted, so
   * it is waiting to be clicked. Telling a reader to type a number the panel above is already
   * offering them is how a working feature reads as a broken one.
   */
  readonly scale: SheetScale | null;
  /**
   * The scale actually in force, which is the other half.
   *
   * Without it the pane cannot tell "nothing has been chosen yet" from "something was chosen and
   * the transform failed", and the second is the case where every instruction about choosing a
   * scale is wrong: the reader has chosen one. `quantised.grid` cannot answer this — it is the
   * scale the *last successful result* was computed at, which in this state does not exist.
   */
  readonly grid: PixelGrid | null;
  /** `null` until a grid is settled, which is the one thing the transform cannot guess. */
  readonly quantised: Quantised | null;
  /** Whether a newer result is on its way, which is what {@link quantised} may be lagging behind. */
  readonly busy: boolean;
}

/**
 * The sheet as it arrived beside what became of it, in whichever of three ways the reader asked for.
 *
 * **Both previews stand at the same magnification of the same artwork, and move together.** They did
 * neither before: the result is one pixel per grid cell, so drawing it at `zoom` showed it `grid`
 * times smaller than its neighbour — at a grid of 8, an eighth — and the same scroll offset in each
 * pointed at a completely different part of the sheet. Drawing it at `zoom * grid` is what makes one
 * screen pixel mean the same amount of original artwork in both, and `useLinkedPanes` then holds them
 * to the same region of it, converting through source pixels rather than copying offsets across.
 * Linking is unconditional and has no toggle: a comparison view whose halves show different places is
 * not comparing anything, so the alternative is not a preference, it is the defect.
 *
 * **The grid's offset is the second half of that placement.** The lattice sits where the art put it,
 * so the result can open with a *leading partial cell* — one pixel standing for only `offset` source
 * pixels — and a uniformly magnified canvas draws it a full cell wide, pushing everything after it
 * out of register by the deficit. Each pane therefore hands `PaneWindow` a clipping window sized
 * to the source's extent and, for the result, the deficit to pull the canvas back by, so every cell
 * lands on the source pixels it covers and both panes measure as the same content. The reasoning
 * lives on `PaneContent`.
 *
 * **The four modes are two layouts and three second images**, which is why there is no third pane and
 * no third canvas. `SIDE_BY_SIDE`, `DIFFERENCE` and `SPRITES` are the same pair of frames — the
 * second one showing the result, a heatmap of what the result cost, or the result with the sprite
 * bounds marked — so the sheet stays on the left across a mode switch and the linked pan position
 * survives it. `WIPE` is the same two frames laid over one another; every value they are drawn from
 * is the one the pair already uses.
 *
 * All three second images are one pixel per mesh cell, which is what lets them share every scrap of
 * the placement below: the magnification, the leading-cell inset and the clipping window are
 * computed once and none of them asks which picture it is placing.
 */
export function ImageComparison({
  sourceName,
  source,
  sourceColors,
  scale,
  grid,
  quantised,
  busy,
}: ImageComparisonProps) {
  const [zoom, setZoom] = useState<number>(PREVIEW_ZOOMS[0]);
  // Beside `zoom` rather than in the store, for the same reason `zoom` is: every one of these is a
  // preference about how this panel presents a result, not part of what the result is.
  const [downloadScale, setDownloadScale] = useState<number>(PREVIEW_ZOOMS[0]);
  const [mode, setMode] = useState<PreviewMode>('SIDE_BY_SIDE');
  const [differenceScale, setDifferenceScale] = useState<number>(DEFAULT_DIFFERENCE_SCALE);
  const [wipeAt, setWipeAt] = useState(DEFAULT_WIPE);
  // The four elements as **state**, not as refs, because choosing a layout replaces every one of
  // them: the pair and the wipe are different trees, so React unmounts one and mounts the other.
  // A ref object survives that with its identity intact, so the two effects below — which are the
  // only things that put pixels on a canvas and hold the panes together — could not tell that what
  // they were holding had been thrown away. Both symptoms were silent and total: a preview of two
  // blank frames, and a pair that stopped moving as one. The setters are stable, so they are ref
  // callbacks as they stand.
  const [sourceView, setSourceView] = useState<HTMLDivElement | null>(null);
  const [resultView, setResultView] = useState<HTMLDivElement | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);

  // With nothing to compare against there is nothing to wipe and nothing to have cost anything, so
  // both of those modes would draw a placeholder over the sheet and call it a comparison. Derived
  // rather than corrected in state, which is the call `DownloadControls` makes about a download
  // magnification the result has outgrown: what the pills show is what the panel is actually doing.
  const shown: PreviewMode = quantised === null ? 'SIDE_BY_SIDE' : mode;

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
  const marked = useMemo(
    () =>
      resultImage === undefined || sprites === undefined || shown !== 'SPRITES'
        ? null
        : outlineSprites(resultImage, sprites.kind === 'SEGMENTED' ? sprites.boxes : []),
    [resultImage, sprites, shown],
  );

  // `zoom` is the scale for *both* panes, because it is measured per source pixel: the second canvas
  // is drawn `grid` times larger to arrive at the same number. See `src/utils/panGeometry.ts`.
  useLinkedPanes({
    first: sourceView,
    second: resultView,
    scale: zoom,
    grid: quantised?.grid ?? null,
    sourceWidth: source.width,
    sourceHeight: source.height,
  });

  // React writes the `width`/`height` attributes first, which blanks the backing store, so the paint
  // has to follow the commit rather than sit in the render. Zoom is absent from the dependencies on
  // purpose: it changes the CSS box, never the pixels.
  //
  // **The pixels, and the canvas they go on — nothing else.** The `ImageData` is what changes when
  // there is something new to draw, and the canvas takes its size from that same value, so nothing
  // can resize without this re-running; depending on `quantised` instead would mean two
  // `putImageData` calls of up to 67 megabytes each, on the main thread, for every render of the
  // panel. The two elements are dependencies for the opposite reason: a canvas that has just been
  // mounted is blank, and the image it wants may not have changed at all.
  const secondImage = heatmap ?? marked ?? resultImage;
  useEffect(() => {
    paint(sourceCanvas, source);
    paint(resultCanvas, secondImage);
  }, [sourceCanvas, resultCanvas, source, secondImage]);

  const first: ComparisonPaneProps = {
    caption: sourceCaption(source, sourceColors),
    label: 'Pan the sheet as it arrived',
    viewportRef: setSourceView,
    canvasRef: setSourceCanvas,
    content: {
      image: source,
      magnification: zoom,
      window: { width: source.width * zoom, height: source.height * zoom },
      inset: { x: 0, y: 0 },
    },
    alt: 'The sheet as it arrived',
    placeholder: null,
  };

  const second: ComparisonPaneProps = {
    caption: secondCaption(shown, quantised, busy),
    label: SECOND_PANE_LABELS[shown],
    viewportRef: setResultView,
    canvasRef: setResultCanvas,
    // One full-cell result pixel covers `grid` source pixels, so `zoom * grid` is what puts the two
    // panes at the same scale — and a leading partial cell covers only `offset` of them, which is
    // what the inset corrects for. Everything comes from the same value, so no half of the placement
    // can go missing on its own, and the heatmap inherits all of it by being the same size.
    content:
      quantised === null || secondImage === undefined
        ? null
        : {
            image: secondImage,
            magnification: zoom * quantised.grid,
            window: { width: source.width * zoom, height: source.height * zoom },
            inset: {
              x: quantised.result.offset.x > 0 ? (quantised.grid - quantised.result.offset.x) * zoom : 0,
              y: quantised.result.offset.y > 0 ? (quantised.grid - quantised.result.offset.y) * zoom : 0,
            },
          },
    alt: SECOND_PANE_ALT[shown],
    placeholder: (
      // Its own padding, because `PanViewport` carries none — see the note on its geometry.
      <p className="p-3 text-xs leading-relaxed text-ink-muted">{emptyReason(busy, grid, scale)}</p>
    ),
  };

  return (
    <section className="animate-fade-in glass-panel space-y-4 rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <ComparisonToolbar
        mode={shown}
        onModeChange={setMode}
        zoom={zoom}
        onZoomChange={setZoom}
        differenceScale={differenceScale}
        onDifferenceScaleChange={setDifferenceScale}
        downloadScale={downloadScale}
        onDownloadScaleChange={setDownloadScale}
        sourceName={sourceName}
        resultImage={quantised?.result.image ?? null}
      />

      {shown === 'WIPE' ? (
        <WipePanes first={first} second={second} busy={busy} at={wipeAt} onMove={setWipeAt} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ComparisonPane {...first} />
          <ComparisonPane {...second} busy={busy} />
        </div>
      )}
    </section>
  );
}

/**
 * What the second frame is called, and what it is described as, per mode.
 *
 * Records keyed by the union rather than a chain of ternaries at the two call sites, so a fifth mode
 * fails to compile until both halves have been written — which is the same property
 * `PREVIEW_MODE_LABELS` is a separate file to keep. `WIPE` names the result because that is what the
 * second frame holds there; the layout is what differs, not the picture.
 */
const SECOND_PANE_LABELS: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'Pan the quantised sheet',
  WIPE: 'Pan the quantised sheet',
  DIFFERENCE: 'Pan the difference heatmap',
  SPRITES: 'Pan the quantised sheet with its sprite bounds marked',
};

const SECOND_PANE_ALT: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'The sheet after grid alignment and palette reduction',
  WIPE: 'The sheet after grid alignment and palette reduction',
  DIFFERENCE: 'How far each drawn pixel sits from the patch of the sheet it stands for',
  SPRITES: 'The quantised sheet, with a box drawn around each separate sprite found on it',
};

/** Put the pixels on the canvas verbatim. A missing canvas is the pane that is showing its `<p>`. */
function paint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  if (canvas === null || image === undefined) return;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
}
