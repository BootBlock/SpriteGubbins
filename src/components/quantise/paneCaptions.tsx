import type { ReactNode } from 'react';
import { QUANTISE_RESULT_PLACEHOLDER } from '../../constants/quantiser.ts';
import type {
  PixelGrid,
  PreviewMode,
  Quantised,
  SheetScale,
  SpriteSegmentation,
  SpriteStrip,
} from '../../types/quantiser.ts';

/**
 * What each frame says about itself, and what an empty one says instead.
 *
 * Filed apart from the panel that arranges the frames because they are different kinds of thing:
 * that file decides *geometry* — the magnification that makes one screen pixel mean the same amount
 * of sheet on both sides, the window that holds the two extents equal, the deficit a leading partial
 * cell is pulled back by — and this decides *prose*. Five captions and four reasons for an empty
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
function colourCount(colors: number): string {
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
 * rather than improves. The colour count the plain modes state is not a fact about a heatmap, so it
 * makes way rather than sitting beside them meaning nothing.
 *
 * The sprite mode does the same thing with the same reasoning: the frame shows *where* the bounds
 * were drawn and the caption says *how many*, which is the pair a reader watches as the gap dial
 * moves. The onion mode's clause is a third of the same kind, and carries one thing the others do
 * not have to: the mode draws nothing of its own while the alignment pass is off, so the caption is
 * where a reader is told that rather than being left to wonder what they are looking at.
 * `SIDE_BY_SIDE` and `WIPE` share the last form, because they show the same picture.
 */
export function secondCaption(mode: PreviewMode, quantised: Quantised | null, busy: boolean): ReactNode {
  if (quantised === null) {
    return (
      <span className={busy ? 'text-neon' : 'text-gold'}>
        {busy ? 'Quantised · working…' : 'Quantised · set a pixel grid'}
      </span>
    );
  }

  const trailing = busy ? ' · updating…' : '';
  if (mode === 'DIFFERENCE') {
    const { mean, peak } = quantised.result.difference;
    return `Difference · mean ${mean.toFixed(2)} · peak ${peak.toFixed(1)}${trailing}`;
  }
  if (mode === 'SPRITES') {
    return `Sprites · ${spritesFound(quantised.result.sprites)}${trailing}`;
  }
  if (mode === 'ONION') {
    const { strips, sprites } = quantised.result;
    return `Onion skin · ${stripsFound(strips, sprites)}${trailing}`;
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

/**
 * What the onion mode has to stack, as the clause its caption carries.
 *
 * `null` is the alignment pass switched off, which is the state this mode is most often reached in —
 * a reader opens it to see what it does before turning anything on. Saying so, and naming the
 * control, is the whole job: the frame beside it is showing the plain result, and a caption reading
 * "0 strips" would leave a reader looking for a stack that was never asked for.
 *
 * An empty array is a different statement, and it has **two** causes that must not be told apart by
 * guessing: the sheet separated into sprites and none of their rows is long enough, or the sheet did
 * not separate into sprites at all. Saying "no row holds enough frames" over a sheet that holds no
 * sprites reads as a complaint about the layout when the answer is the keying, and it disagrees with
 * the alignment panel, which does have the segmentation and does say so.
 */
function stripsFound(strips: readonly SpriteStrip[] | null, sprites: SpriteSegmentation): string {
  if (strips === null) return 'frame alignment is off';
  const { length } = strips;
  if (length > 0) return `${String(length)} ${length === 1 ? 'strip' : 'strips'} stacked`;
  return sprites.kind === 'SEGMENTED' ? 'no row holds enough frames' : 'no sprite to gather into rows';
}

/**
 * What the sprite mode found, as the clause its caption carries.
 *
 * Three outcomes rather than a count with two exceptions, because two of them are not counts of
 * sprites at all — see `SpriteSegmentation`. A solid sheet reports what it is rather than "0
 * sprites", which would read as a failed reading of a sheet that has simply not been keyed yet.
 */
function spritesFound(sprites: SpriteSegmentation): string {
  if (sprites.kind === 'SOLID') return 'nothing transparent to separate';
  if (sprites.kind === 'SCATTERED') return `${String(sprites.pieces)} pieces, none read as a sprite`;
  const { length } = sprites.boxes;
  return `${String(length)} ${length === 1 ? 'sprite' : 'sprites'}`;
}
