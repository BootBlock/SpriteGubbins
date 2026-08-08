import { useEffect, useRef, useState } from 'react';
import { PREVIEW_ZOOMS } from '../../constants/quantiser.ts';
import { useLinkedPanes } from '../../hooks/useLinkedPanes.ts';
import type { PixelGrid, QuantiseResult } from '../../types/quantiser.ts';
import { ComparisonPane } from './ComparisonPane.tsx';
import { ComparisonToolbar } from './ComparisonToolbar.tsx';

/**
 * What the transform returned, and the pixel scale it returned it at.
 *
 * One value rather than two, because the two are only ever known together — the grid is what the
 * result was computed *from*, so there is no such thing as a result without one. Carried separately
 * they would need a fallback at the point of use, and the only fallback available is a grid of 1:
 * exactly the mis-scaling this component was changed to fix, arriving silently.
 */
interface Quantised {
  readonly result: QuantiseResult;
  readonly grid: PixelGrid;
}

interface ImageComparisonProps {
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  readonly source: ImageData;
  /** `null` until a grid is settled, which is the one thing the transform cannot guess. */
  readonly quantised: Quantised | null;
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
export function ImageComparison({ sourceName, source, quantised }: ImageComparisonProps) {
  const [zoom, setZoom] = useState<number>(PREVIEW_ZOOMS[0]);
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
  useEffect(() => {
    paint(sourceCanvas.current, source);
    paint(resultCanvas.current, quantised?.result.image);
  }, [source, quantised]);

  return (
    <section className="animate-fade-in glass-panel space-y-4 rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-450 hover:border-tab/40">
      <ComparisonToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        sourceName={sourceName}
        resultImage={quantised?.result.image ?? null}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComparisonPane
          caption={
            <>
              As it arrived · {source.width} × {source.height}
              {quantised !== null && ` · ${colourCount(quantised.result.colorsBefore)}`}
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
              <span className="text-gold">Quantised · set a pixel grid above</span>
            ) : (
              `Quantised · ${String(quantised.result.image.width)} × ${String(quantised.result.image.height)} · ${colourCount(quantised.result.colorsAfter)}`
            )
          }
          label="Pan the quantised sheet"
          viewportRef={resultView}
          canvasRef={resultCanvas}
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
            <p className="p-3 text-xs leading-relaxed text-ink-muted">
              Detection found no pixel scale in this image, so there is nothing to align it to yet.
            </p>
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

/** Put the pixels on the canvas verbatim. A missing canvas is the pane that is showing its `<p>`. */
function paint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  if (canvas === null || image === undefined) return;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
}
