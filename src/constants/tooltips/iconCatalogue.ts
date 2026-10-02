import { ICON_ROSTER_CAPACITY, ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * Guidance for the icon catalogue's actions: the studio button that opens it, the dialog's buttons that
 * tick, untick and clear, and the buttons that add, save, change and remove an icon of the reader's own.
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
    'Unticks every icon on your set, including any the search is hiding, and removes the icons you wrote yourself, as one step Undo can take back. The series goes back to the overlay sheet alone, and the prompt follows.',

  addOwn:
    'Opens a form for an icon the catalogue does not hold, such as a quest relic or a spell only your game has. You name its role, its kind and what it looks like, and it joins your set as a named slot like any ticked icon.',

  submitNew:
    'Puts the icon you have written on your set, at the end of its kind’s shelves, as one step Undo can take back. The compiled prompt draws it at once. A field the form cannot accept says why beside it, and nothing is added until it can.',

  submitChange:
    'Saves your changes to this icon, as one step Undo can take back. The icon keeps its place on the set unless you changed its kind, and its line on the sheet and its slot name follow your new words.',

  cancelOwn: 'Closes the form without changing your set. Whatever you typed into it is discarded.',

  editOwn:
    'Opens this icon in the form above the shelves, so you can change its role, kind, look or states. Nothing changes on your set until you save.',

  removeOwn:
    'Takes this icon off your set, as one step Undo can take back. Its slot leaves the sheet, and the icons after it move up to fill the gap.',
} as const;
