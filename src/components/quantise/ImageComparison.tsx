import { useEffect, useRef, useState } from 'react';
import { PREVIEW_ZOOMS, QUANTISE_RESULT_PLACEHOLDER } from '../../constants/quantiser.ts';
import { useLinkedPanes } from '../../hooks/useLinkedPanes.ts';
import type { PixelGrid, Quantised, SheetScale } from '../../types/quantiser.ts';
import { ComparisonPane } from './ComparisonPane.tsx';
import { ComparisonToolbar } from './ComparisonToolbar.tsx';

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
 * The sheet as it arrived beside the sheet as it will ship, and the way to take the second one away.
 *
 * **Both panes stand at the same magnification of the same artwork, and move together.** They did
 * neither before: the result is `⌈w / grid⌉` pixels wide, so drawing it at `zoom` showed it `grid`
 * times smaller than its neighbour — at a grid of 8, an eighth — and the same scroll offset in each
 * pointed at a completely different part of the sheet. Drawing it at `zoom * grid` is what makes one
 * screen pixel mean the same amount of original artwork in both, and `useLinkedPanes` then holds them
 * to the same region of it, converting through source pixels rather than copying offsets across.
 *
 * Linking is unconditional and has no toggle: a comparison view whose halves show different places is
 * not comparing anything, so the alternative is not a preference, it is the defect.
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
  // Beside `zoom` rather than in the store, for the same reason `zoom` is: both are preferences
  // about how this panel presents a result, not part of what the result is.
  const [downloadScale, setDownloadScale] = useState<number>(PREVIEW_ZOOMS[0]);
  const sourceView = useRef<HTMLDivElement>(null);
  const resultView = useRef<HTMLDivElement>(null);
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  const resultCanvas = useRef<HTMLCanvasElement>(null);

  // `zoom` is the scale for *both* panes, because it is measured per source pixel: the result canvas
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
  // **The pixels, not the wrapper around them.** `quantised` is built fresh on every render of the
  // hook above, so depending on it meant repainting both canvases on every render of this panel —
  // two `putImageData` calls of up to 67 megabytes each, on the main thread, for a keystroke in the
  // grid box or a zoom the paint deliberately ignores. The `ImageData` is the thing that actually
  // changes when there is something new to draw, and the canvas takes its size from that same value,
  // so nothing can resize without this re-running.
  const resultImage = quantised?.result.image;
  useEffect(() => {
    paint(sourceCanvas.current, source);
    paint(resultCanvas.current, resultImage);
  }, [source, resultImage]);

  return (
    <section className="animate-fade-in glass-panel space-y-4 rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <ComparisonToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        downloadScale={downloadScale}
        onDownloadScaleChange={setDownloadScale}
        sourceName={sourceName}
        resultImage={quantised?.result.image ?? null}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComparisonPane
          caption={
            <>
              As it arrived · {source.width} × {source.height}
              {sourceColors !== null && ` · ${colourCount(sourceColors)}`}
            </>
          }
          label="Pan the sheet as it arrived"
          viewportRef={sourceView}
          canvasRef={sourceCanvas}
          content={{ image: source, magnification: zoom }}
          alt="The sheet as it arrived"
          placeholder={null}
        />

        <ComparisonPane
          caption={
            quantised === null ? (
              <span className={busy ? 'text-neon' : 'text-gold'}>
                {busy ? 'Quantised · working…' : 'Quantised · set a pixel grid above'}
              </span>
            ) : (
              `Quantised · ${String(quantised.result.image.width)} × ${String(quantised.result.image.height)} · ${colourCount(quantised.result.colors)}${busy ? ' · updating…' : ''}`
            )
          }
          label="Pan the quantised sheet"
          viewportRef={resultView}
          canvasRef={resultCanvas}
          busy={busy}
          // One result pixel covers `grid` source pixels, so this is what puts the two panes at the
          // same scale. Both halves come from the same value, so neither can go missing on its own.
          content={
            quantised === null
              ? null
              : { image: quantised.result.image, magnification: zoom * quantised.grid }
          }
          alt="The sheet after grid alignment and palette reduction"
          placeholder={
            // Its own padding, because `PanViewport` carries none — see the note on its geometry.
            <p className="p-3 text-xs leading-relaxed text-ink-muted">{emptyReason(busy, grid, scale)}</p>
          }
        />
      </div>
    </section>
  );
}

/**
 * `1 colour`, `32 colours` — the figure and its noun, agreeing.
 *
 * A count of one used to be unreachable in practice: before the key field could be removed, its own
 * colours were counted, so no real sheet reduced to a single one. Keying makes it the ordinary outcome
 * for a simple sheet — the screenshot that caught this read "1 colours" — so the agreement is now
 * load-bearing rather than pedantry. `IdentityPaletteCapture`'s toast already spells it this way.
 */
function colourCount(colors: number): string {
  return `${String(colors)} ${colors === 1 ? 'colour' : 'colours'}`;
}

/**
 * Why the result pane is empty, which decides what the reader is asked to do about it.
 *
 * Ordered by how much is settled. Something is still coming; then a scale **is** in force and
 * produced nothing anyway, which only a failure explains and which no instruction about choosing a
 * scale fits; then the two ways of having no scale — one estimated and waiting to be taken, or none
 * found at all.
 */
function emptyReason(busy: boolean, grid: PixelGrid | null, scale: SheetScale | null): string {
  if (busy) return QUANTISE_RESULT_PLACEHOLDER.reading;
  if (grid !== null) return QUANTISE_RESULT_PLACEHOLDER.failed;
  if (scale?.measurement === 'ESTIMATED') return QUANTISE_RESULT_PLACEHOLDER.estimated;
  return QUANTISE_RESULT_PLACEHOLDER.none;
}

/** Put the pixels on the canvas verbatim. A missing canvas is the pane that is showing its `<p>`. */
function paint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  if (canvas === null || image === undefined) return;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
}
