import type { ReactNode } from 'react';
import { QUANTISE_RESULT_PLACEHOLDER } from '../../constants/quantiser.ts';
import type { PixelGrid, PreviewMode, Quantised, SheetScale } from '../../types/quantiser.ts';

/**
 * What each frame says about itself, and what an empty one says instead.
 *
 * Filed apart from the panel that arranges the frames because they are different kinds of thing:
 * that file decides *geometry* — the magnification that makes one screen pixel mean the same amount
 * of sheet on both sides, the window that holds the two extents equal, the deficit a leading partial
 * cell is pulled back by — and this decides *prose*. Three captions and four reasons for an empty
 * pane is enough of the second to be worth reading on its own.
 */

/**
 * `1 colour`, `32 colours` — the figure and its noun, agreeing.
 *
 * A count of one used to be unreachable in practice: before the key field could be removed, its own
 * colours were counted, so no real sheet reduced to a single one. Keying makes it the ordinary
 * outcome for a simple sheet — the screenshot that caught this read "1 colours" — so the agreement
 * is now load-bearing rather than pedantry. `IdentityPaletteCapture`'s toast already spells it this
 * way.
 */
export function colourCount(colors: number): string {
  return `${String(colors)} ${colors === 1 ? 'colour' : 'colours'}`;
}

/** The sheet as it arrived, which is the one frame that is never empty and never lags. */
export function sourceCaption(source: ImageData, sourceColors: number | null): ReactNode {
  return (
    <>
      As it arrived · {source.width} × {source.height}
      {sourceColors !== null && ` · ${colourCount(sourceColors)}`}
    </>
  );
}

/**
 * The line above the second frame, which says a different thing about a different picture in the
 * difference mode.
 *
 * The heatmap's two figures are the point of stating them: the map says *where* a reduction cost
 * something and these say *how much*, and the pair is what a reader compares across a change of dial
 * — a mean that has not moved while the map plainly has is the shape of a dial that redistributes
 * rather than improves. The colour count the other two modes state is not a fact about a heatmap, so
 * it makes way rather than sitting beside them meaning nothing.
 */
export function secondCaption(mode: PreviewMode, quantised: Quantised | null, busy: boolean): ReactNode {
  if (quantised === null) {
    return (
      <span className={busy ? 'text-neon' : 'text-gold'}>
        {busy ? 'Quantised · working…' : 'Quantised · set a pixel grid above'}
      </span>
    );
  }

  const trailing = busy ? ' · updating…' : '';
  if (mode === 'DIFFERENCE') {
    const { mean, peak } = quantised.result.difference;
    return `Difference · mean ${mean.toFixed(2)} · peak ${peak.toFixed(1)}${trailing}`;
  }

  const { image, colors } = quantised.result;
  return `Quantised · ${String(image.width)} × ${String(image.height)} · ${colourCount(colors)}${trailing}`;
}

/**
 * Why the result pane is empty, which decides what the reader is asked to do about it.
 *
 * Ordered by how much is settled. Something is still coming; then a scale **is** in force and
 * produced nothing anyway, which only a failure explains and which no instruction about choosing a
 * scale fits; then the two ways of having no scale — one estimated and waiting to be taken, or none
 * found at all.
 */
export function emptyReason(busy: boolean, grid: PixelGrid | null, scale: SheetScale | null): string {
  if (busy) return QUANTISE_RESULT_PLACEHOLDER.reading;
  if (grid !== null) return QUANTISE_RESULT_PLACEHOLDER.failed;
  if (scale?.measurement === 'ESTIMATED') return QUANTISE_RESULT_PLACEHOLDER.estimated;
  return QUANTISE_RESULT_PLACEHOLDER.none;
}
