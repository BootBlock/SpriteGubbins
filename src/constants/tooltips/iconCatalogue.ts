import { ICON_ROSTER_CAPACITY, ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * Guidance for the icon catalogue's actions: the studio button that opens it, and the dialog's buttons
 * that tick, untick and clear.
 *
 * Each says what moves — the roster, and with it the series and the compiled prompt — and that Undo
 * takes it back, because a group of icons ticked by one press is the kind of change a reader wants to
 * know is reversible before pressing.
 */
export const ICON_CATALOGUE_ACTION_TOOLTIPS = {
  openCatalogue: `Opens the icon catalogue, where you tick the icons this set draws. Each icon you tick becomes a named slot on an icon sheet, ${String(ICONS_PER_SHEET)} components to a sheet after the overlay sheet, and the compiled prompt follows at once.\n\nEvery tick is a step Undo can take back.`,

  tickGroup: `Ticks every icon this group is showing under the current search and filters, as one step Undo can take back. An icon that would take the set past its ${String(ICON_ROSTER_CAPACITY)} components is left unticked, and a notice says how many.`,

  untickGroup:
    'Unticks every icon this group is showing under the current search and filters, as one step Undo can take back. The icon sheets close up behind them, so the icons after them move to earlier sheets.',

  clearAll:
    'Unticks every icon on your set, including any the search is hiding, as one step Undo can take back. The series goes back to the overlay sheet alone, and the prompt follows.',
} as const;
