import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DIFFERENCE_SCALE, DEFAULT_WIPE, PREVIEW_ZOOMS } from '../../constants/quantiser.ts';
import { useDetachedWindow } from '../../hooks/useDetachedWindow.ts';
import { useLinkedPanes } from '../../hooks/useLinkedPanes.ts';
import type { PixelGrid, PreviewMode, Quantised, SheetScale } from '../../types/quantiser.ts';
import { SHEET_FORMATS } from '../../types/sheetFormat.ts';
import type { SheetFormat } from '../../types/sheetFormat.ts';
import { heatmapImage } from '../../utils/heatmapImage.ts';
import { onionSkin } from '../../utils/onionSkin.ts';
import { outlineSprites } from '../../utils/spriteOutline.ts';
import type { ComparisonPaneProps } from './ComparisonPane.tsx';
import { ComparisonPane } from './ComparisonPane.tsx';
import { ComparisonToolbar } from './ComparisonToolbar.tsx';
import { DetachedNotice } from './DetachedNotice.tsx';
import { DetachedPreview } from './DetachedPreview.tsx';
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
   * it is waiting to be clicked. Telling a reader to type a number the grid panel is already
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
 * The sheet as it arrived beside what became of it, in whichever of five ways the reader asked for.
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
 * **The five modes are two layouts and four second images**, which is why there is no third pane and
 * no third canvas. `SIDE_BY_SIDE`, `DIFFERENCE`, `SPRITES` and `ONION` are the same pair of frames —
 * the second one showing the result, a heatmap of what the result cost, the result with the sprite
 * bounds marked, or the result with each strip's frames stacked on one slot — so the sheet stays on
 * the left across a mode switch and the linked pan position survives it. `WIPE` is the same two
 * frames laid over one another; every value they are drawn from is the one the pair already uses.
 *
 * All four second images are one pixel per mesh cell, which is what lets them share every scrap of
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
  const [downloadFormat, setDownloadFormat] = useState<SheetFormat>(SHEET_FORMATS[0]);
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
  // The panel's own box, read only at the moment it is given up: the detached window opens at the
  // size the preview already had, which is what makes the move read as one panel in two places.
  const panel = useRef<HTMLElement>(null);
  const detached = useDetachedWindow(`Sprite Gubbins — ${sourceName}`);

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
  const secondImage = heatmap ?? marked ?? stacked ?? resultImage;
  // **What the frame is *called* follows the picture, not the pill.** Every other mode always draws
  // its own second image while it is shown, so naming the frame after the mode says the same thing
  // as naming it after the picture. The onion is the first that can be shown with nothing to stack —
  // the alignment pass is off, which is how the mode is most often first reached — and there the
  // canvas is holding the ordinary result. Announcing it as a stack of frames would tell a
  // screen-reader user the image contains something it does not, and would contradict the caption
  // beside it, which already says the pass is off.
  const pictured: PreviewMode = shown === 'ONION' && stacked === null ? 'SIDE_BY_SIDE' : shown;
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
    label: SECOND_PANE_LABELS[pictured],
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
    alt: SECOND_PANE_ALT[pictured],
    placeholder: (
      // Its own padding, because `PanViewport` carries none — see the note on its geometry.
      <p className="p-3 text-xs leading-relaxed text-ink-muted">{emptyReason(busy, grid, scale)}</p>
    ),
  };

  const isDetached = detached.target !== null;
  const surface = (
    <section
      ref={panel}
      className="animate-fade-in glass-panel space-y-4 rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40"
    >
      {/* A blocked popup is the one failure that otherwise leaves a control appearing to do nothing,
          so it is said out loud rather than logged. It stands until an attempt succeeds, because
          what refused it is a browser setting rather than a passing condition. */}
      {detached.refused && (
        <p
          role="alert"
          className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed text-gold"
        >
          The browser would not open a window for the preview. Allow popups for this site, or leave the
          preview here — everything on this panel works either way.
        </p>
      )}

      <ComparisonToolbar
        mode={shown}
        onModeChange={setMode}
        zoom={zoom}
        onZoomChange={setZoom}
        differenceScale={differenceScale}
        onDifferenceScaleChange={setDifferenceScale}
        downloadScale={downloadScale}
        onDownloadScaleChange={setDownloadScale}
        downloadFormat={downloadFormat}
        onDownloadFormatChange={setDownloadFormat}
        sourceName={sourceName}
        resultImage={quantised?.result.image ?? null}
        sprites={sprites ?? null}
        duplicates={quantised?.result.duplicates ?? []}
        isDetached={isDetached}
        onDetachToggle={() => {
          if (isDetached) detached.reattach();
          else detached.detach(panel.current);
        }}
      />

      {shown === 'WIPE' ? (
        <WipePanes first={first} second={second} busy={busy} at={wipeAt} onMove={setWipeAt} />
      ) : (
        /*
          The query container: `@[38rem]` below measures this box, not the viewport — and that
          distinction is what the two panes now turn on. This panel used to span the whole page, so a
          viewport breakpoint described its width closely enough; it is now a column of a split, and
          `lg:` was reporting a page 1400px wide while the box it governed was 674px. Nothing looked
          broken, because 1400 and 674 fall the same side of it — the class had simply stopped
          measuring the thing it decides.

          38rem is bounded rather than chosen: the narrowest this box ever gets in the split is the
          preview column at `--breakpoint-quantise` itself, which is 642px, and side by side is the
          whole point of the split. `tests/quantise-column-width.test.ts` re-derives that 642 from the
          grid and fails if the threshold ever rises past it.
        */
        <div className="@container">
          <div className="grid grid-cols-1 gap-4 @[38rem]:grid-cols-2">
            <ComparisonPane {...first} />
            <ComparisonPane {...second} busy={busy} />
          </div>
        </div>
      )}
    </section>
  );

  // Detached, the page keeps the panel's place and says where it went — see `DetachedNotice`, which
  // is the only route back for a reader whose window opened behind this one or on a display they are
  // not looking at. `surface` itself is one subtree either way, so nothing about the preview is
  // rebuilt by the move except the elements.
  if (detached.target === null) return surface;
  return (
    <>
      <DetachedNotice onReturn={detached.reattach} />
      <DetachedPreview target={detached.target}>{surface}</DetachedPreview>
    </>
  );
}

/**
 * What the second frame is called, and what it is described as, per mode.
 *
 * **Keyed by what the frame is showing rather than by the mode chosen**, which are the same thing in
 * four of the five cases and are not in the fifth — see `pictured`, above, for the onion mode that
 * can be selected with nothing to stack.
 *
 * Records keyed by the union rather than a chain of ternaries at the two call sites, so a sixth mode
 * fails to compile until both halves have been written — which is the same property
 * `PREVIEW_MODE_LABELS` is a separate file to keep. `WIPE` names the result because that is what the
 * second frame holds there; the layout is what differs, not the picture.
 */
const SECOND_PANE_LABELS: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'Pan the quantised sheet',
  WIPE: 'Pan the quantised sheet',
  DIFFERENCE: 'Pan the difference heatmap',
  SPRITES: 'Pan the quantised sheet with its sprite bounds marked',
  ONION: 'Pan the quantised sheet with each strip’s frames stacked on its first slot',
};

const SECOND_PANE_ALT: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'The sheet after grid alignment and palette reduction',
  WIPE: 'The sheet after grid alignment and palette reduction',
  DIFFERENCE: 'How far each drawn pixel sits from the patch of the sheet it stands for',
  SPRITES: 'The quantised sheet, with a box drawn around each separate sprite found on it',
  ONION: 'The quantised sheet, with every frame of each row of sprites laid over the first frame of that row',
};

/** Put the pixels on the canvas verbatim. A missing canvas is the pane that is showing its `<p>`. */
function paint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  if (canvas === null || image === undefined) return;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
}
