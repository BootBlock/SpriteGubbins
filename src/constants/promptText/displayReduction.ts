import type { TargetSize } from '../../types/output.ts';
import type { DisplayReduction } from '../../utils/displayReduction.ts';

/**
 * Section 2's *Smallest display size* line: how far each component is reduced to reach the size the game
 * shows it at, and the narrowest stroke, gap and outline that survive the reduction (audit finding P6).
 *
 * **Geometry rather than an adjective.** "Readable at small sizes" is a wish; a stroke two displayed
 * pixels wide is the narrowest a reduction keeps as a mark rather than averaging it into its
 * neighbours, and an outline one displayed pixel wide is the thinnest that survives as a line. So the
 * floors are stated in the drawing's own units — pixels where section 2 states the drawn size, and a
 * fraction of the square each component is drawn to where it does not, which a share profile never does.
 * A display-size field is declared only by ICON, whose plans each draw every component to one square
 * (`SheetPlan.fit`), so "the square it is drawn to" always names something the prompt has stated.
 *
 * **The outline clause overrules the outline line's width, and says so.** A pixel style's contour is
 * "single-pixel" and a painted one's "thin", and either drawn at four times its display size vanishes
 * when reduced. The two lines would otherwise disagree about the outline, so this one states which
 * width wins. It is left out where the sheet draws no outline (`outlined`).
 *
 * `nativeGrid` is the compiler's `NATIVE_GRID` answer: where the stated size is a native pixel grid,
 * the drawn size and the floors are counted in native pixels, as the pixel-discipline floor is.
 */
export function describeDisplayReduction(
  reduction: DisplayReduction,
  nativeGrid: boolean,
  outlined: boolean,
): string {
  const { display, drawn } = reduction;
  const shown = `Every component is shown as small as ${size(display)} px`;
  const shownEdge = Math.min(display.width, display.height);

  if (drawn === null) {
    const outline = outlined
      ? `, and the outline this section states is never thinner than ${fraction(1, shownEdge)} of it, one displayed pixel, whatever width it names`
      : '';
    return `${shown}, so one displayed pixel is ${fraction(1, shownEdge)} of the width of the square it is drawn to. No stroke, gap or accent is narrower than ${fraction(2, shownEdge)} of that width, so each keeps at least two displayed pixels once reduced${outline}.`;
  }

  const drawnEdge = Math.min(drawn.width, drawn.height);
  const unit = nativeGrid ? 'native pixels' : 'delivered pixels';
  const outline = outlined
    ? `, and the outline this section states is never thinner than ${String(Math.ceil(drawnEdge / shownEdge))} ${unit}, one displayed pixel, whatever width it names`
    : '';
  return `${shown}, ${fraction(shownEdge, drawnEdge)} of the ${size(drawn)} ${nativeGrid ? 'native pixels' : 'px'} it is drawn at. No stroke, gap or accent is narrower than ${String(Math.ceil((2 * drawnEdge) / shownEdge))} ${unit}, so each keeps at least two displayed pixels once reduced${outline}.`;
}

/** `W × H`, as section 2 writes every size. */
function size({ width, height }: TargetSize): string {
  return `${String(width)} × ${String(height)}`;
}

/** `part/whole` in lowest terms — `1/4`, `3/8`, `1/12`. */
function fraction(part: number, whole: number): string {
  const divisor = greatestCommonDivisor(part, whole);
  return `${String(part / divisor)}/${String(whole / divisor)}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
