import { useEffect, useRef, useState } from 'react';
import { PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { useImageDownload } from '../../hooks/useImageDownload.ts';
import type { QuantiseResult } from '../../types/quantiser.ts';
import { Tooltip } from '../common/Tooltip.tsx';
import { PanViewport } from './PanViewport.tsx';

interface ImageComparisonProps {
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  readonly source: ImageData;
  /** `null` until a grid is settled, which is the one thing the transform cannot guess. */
  readonly result: QuantiseResult | null;
}

/**
 * The sheet as it arrived beside the sheet as it will ship, and the way to take the second one away.
 *
 * Both canvases render `pixelated`. A smoothed preview of a nearest-neighbour result would blur exactly
 * the edges the user is here to judge, and would make a failed transform look like a successful one.
 *
 * The zoom is applied as a CSS size over a backing store that stays at the image's own dimensions, so
 * magnifying costs nothing and never resamples: one drawn pixel becomes a square of screen pixels
 * rather than an interpolation of its neighbours. Magnified past its box, each preview is then looked
 * at through a `PanViewport`, which is what makes the part worth judging reachable by dragging it.
 */
export function ImageComparison({ sourceName, source, result }: ImageComparisonProps) {
  const [zoom, setZoom] = useState<number>(PREVIEW_ZOOMS[0]);
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  const resultCanvas = useRef<HTMLCanvasElement>(null);
  const download = useImageDownload();

  // React writes the `width`/`height` attributes first, which blanks the backing store, so the paint
  // has to follow the commit rather than sit in the render. Zoom is absent from the dependencies on
  // purpose: it changes the CSS box, never the pixels.
  useEffect(() => {
    paint(sourceCanvas.current, source);
    paint(resultCanvas.current, result?.image);
  }, [source, result]);

  return (
    <section className="animate-fade-in glass-panel space-y-4 rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-300 hover:border-tab/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {/* Grouped and set apart from the levels, so the ⓘ reads as belonging to the label rather
              than sitting among the zoom levels as though it were one of them. */}
          <span className="mr-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Zoom</span>
            {/* Where the pan gesture is named. A cursor that only appears once the pointer is
                already over the image teaches nobody working from the keyboard that it is there. */}
            <Tooltip text={QUANTISE_TOOLTIPS.zoom} hint="Zoom" />
          </span>
          {PREVIEW_ZOOMS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={level === zoom}
              onClick={() => {
                setZoom(level);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                level === zoom
                  ? 'bg-accent-strong text-ink'
                  : 'bg-foundry-700 text-ink-faint hover:bg-foundry-600 hover:text-ink'
              }`}
            >
              {level}×
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={result === null}
          onClick={() => {
            if (result !== null) download(sourceName, result.image);
          }}
          className="rounded-lg bg-accent-strong px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-foundry-700 disabled:text-ink-faint"
        >
          <span aria-hidden="true">⬇</span> Download PNG
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <figure className="space-y-2">
          <figcaption className="font-mono text-[10px] text-ink-faint">
            As it arrived · {source.width} × {source.height}
            {result !== null && ` · ${String(result.colorsBefore)} colours`}
          </figcaption>
          {/* The label names the *control*, not the picture: the canvas already carries the picture's
              name, and repeating it would have a screen reader say the same words twice while
              explaining neither the tab stop nor what it is for. It stops at naming — an instruction
              belongs in the tooltip above, which the sighted keyboard user can actually reach. */}
          <PanViewport label="Pan the sheet as it arrived">
            <canvas
              ref={sourceCanvas}
              width={source.width}
              height={source.height}
              role="img"
              aria-label="The sheet as it arrived"
              style={{
                width: source.width * zoom,
                height: source.height * zoom,
                imageRendering: 'pixelated',
              }}
            />
          </PanViewport>
        </figure>

        <figure className="space-y-2">
          <figcaption className="font-mono text-[10px] text-ink-faint">
            {result === null ? (
              <span className="text-gold">Quantised · set a pixel grid above</span>
            ) : (
              `Quantised · ${String(result.image.width)} × ${String(result.image.height)} · ${String(result.colorsAfter)} colours`
            )}
          </figcaption>
          <PanViewport label="Pan the quantised sheet">
            {result === null ? (
              <p className="text-xs leading-relaxed text-ink-muted">
                Detection found no pixel scale in this image, so there is nothing to align it to yet.
              </p>
            ) : (
              <canvas
                ref={resultCanvas}
                width={result.image.width}
                height={result.image.height}
                role="img"
                aria-label="The sheet after grid alignment and palette reduction"
                style={{
                  width: result.image.width * zoom,
                  height: result.image.height * zoom,
                  imageRendering: 'pixelated',
                }}
              />
            )}
          </PanViewport>
        </figure>
      </div>
    </section>
  );
}

/** Put the pixels on the canvas verbatim. A missing canvas is the panel that is not rendered. */
function paint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  if (canvas === null || image === undefined) return;
  canvas.getContext('2d')?.putImageData(image, 0, 0);
}
