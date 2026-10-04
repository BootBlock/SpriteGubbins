import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { gridInForce } from '../utils/gridInForce.ts';
import { succeededOnScreen } from '../utils/succeededOnScreen.ts';

/** What the download needs to know about the result on screen, beyond its pixels. */
export interface ShownResult {
  /** The pixel scale the result was computed at, which decides whether a cell's fit may resize. */
  readonly grid: PixelGrid;
  /** Whether a palette step decided its colours — see `QuantiseResult.paletted`. */
  readonly paletted: boolean;
}

/**
 * The scale and the palette standing of the result the Quantise tab is showing, or `null` with none.
 *
 * Read from the stores rather than handed down, because the one control that needs them sits four
 * components below the tab that holds the result, and every component between would carry two props
 * it never reads. Each value is its own primitive selector, so a new result at the same scale does not
 * render the download again, and the gate is `succeededOnScreen`'s — the one `useQuantiseWork` applies
 * to the result itself — so this can never describe a result the pane is not showing.
 */
export function useShownResult(): ShownResult | null {
  const hasSource = useQuantiseStore((state) => state.source !== null);
  const gridOverride = useQuantiseStore((state) => state.gridOverride);
  const facts = useQuantiseAnswerStore((state) =>
    state.survey?.kind === 'facts' ? state.survey.facts : null,
  );
  const grid = useQuantiseAnswerStore((state) => state.succeeded?.settings.grid ?? null);
  const paletted = useQuantiseAnswerStore((state) => state.succeeded?.result.paletted ?? false);
  const shownGrid = succeededOnScreen(hasSource, gridInForce(gridOverride, facts), grid);
  return shownGrid === null ? null : { grid: shownGrid, paletted };
}
