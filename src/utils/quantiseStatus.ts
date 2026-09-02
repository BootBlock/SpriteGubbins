import { estimatedScaleStatus } from '../constants/quantiser.ts';
import type { PixelGrid, Quantised, SheetFacts } from '../types/quantiser.ts';

/**
 * The tab's state as one sentence, for the live region above.
 *
 * Announces the **outcome** as well as the wait, because the outcome is the half a screen-reader user
 * cannot otherwise get: the two previews say everything visually and nothing else does. An empty
 * string while there is no sheet, so the region exists from the first render with nothing to say.
 *
 * **The sentence names the reading that answered**, as the badge and the panel do, and it takes its
 * wording from the same record they take theirs from — three readings produce an estimate here, and
 * for a long time every one of them was announced as the spacing of the sheet's edges.
 *
 * **An estimated scale is announced too, and it is the state that most needs it.** Nothing is
 * running and nothing has been produced — the tab is waiting on the reader — so without this the
 * region falls silent for good at the exact moment a sighted reader is being shown a badge, a
 * button and a paragraph all asking them to act. Saying "nothing is happening" by saying nothing is
 * indistinguishable from the tab having finished.
 *
 * **That announcement turns on `grid`, not on there being no result**, for the same reason the
 * result pane's placeholder does: with the estimate applied and the transform then failing, there
 * is still no result, and "it has not been applied" would be telling the reader to do the thing
 * they have just done — while the pane beside it says the transform failed. The two read the same
 * state and have to say the same thing about it.
 */
export function statusOf(
  busy: boolean,
  facts: SheetFacts | null,
  grid: PixelGrid | null,
  quantised: Quantised | null,
): string {
  if (busy) return facts === null ? 'Measuring the sheet.' : 'Quantising the sheet.';
  const scale = facts?.scale ?? null;
  if (scale !== null && scale.measurement !== 'EXACT' && grid === null) {
    return estimatedScaleStatus(scale.grid, scale.measurement);
  }
  if (quantised === null) return '';
  const { image, colors } = quantised.result;
  return `Quantised to ${String(image.width)} by ${String(image.height)} pixels, ${String(colors)} ${colors === 1 ? 'colour' : 'colours'}.`;
}
