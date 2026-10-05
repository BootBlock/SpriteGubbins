import type { TargetSize } from '../types/output.ts';
import { parseTargetSize } from './targetSize.ts';

/**
 * Reading a display size out of the text of a field declaring `DISPLAY_SIZE` — ICON's *Smallest Display
 * Size*, whose pool writes `24 × 24 Pixels`.
 *
 * **The field is an unfiltered combo box, so a reader can type anything into it**, and the parse has to
 * be safe on all of it. Section 2 states a reduction and the narrowest stroke that survives it from this
 * answer, so a size read where none was written puts a false geometry into the prompt, while a size
 * missed only leaves that line out. Every doubtful case therefore answers `null`.
 *
 * Three shapes are read, in this order:
 *
 * - **A `W × H` pair**, through `parseTargetSize`, which is how the pool writes it and how the target-size
 *   box is read. The first pair wins, for the reason it does there.
 * - **One number carrying a pixel unit** — `20 px`, `20px`, `20 pixels` — read as a square, because an
 *   icon is shown in a square and `20 px` is how a size is often typed. Two such numbers are two sizes
 *   with no rule for choosing between them, so they answer `null`.
 * - **A bare number and nothing else** — `20` — read the same way.
 *
 * Anything else answers `null`: `Tiny`, `As small as the minimap allows`, `4K`.
 */
export function parseDisplaySize(text: string): TargetSize | null {
  const pair = parseTargetSize(text);
  if (pair !== null) return pair;

  const withUnit = [...text.matchAll(/(?<![\d.])(\d{1,5})\s*(?:px|pixels?)\b/giu)];
  if (withUnit.length === 1) return square(withUnit[0]?.[1]);
  if (withUnit.length > 1) return null;

  const bare = /^\s*(\d{1,5})\s*$/u.exec(text);
  return bare === null ? null : square(bare[1]);
}

/** A square of the captured edge, or `null` for the degenerate `0`. */
function square(edge: string | undefined): TargetSize | null {
  const size = Number(edge);
  return Number.isInteger(size) && size >= 1 ? { width: size, height: size } : null;
}
