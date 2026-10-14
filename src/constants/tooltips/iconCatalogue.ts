import { ICON_ROSTER_CAPACITY, ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * Guidance for the icon catalogue's actions: the studio button that opens it, the dialog's buttons that
 * tick, untick and clear, and the buttons that add, save, change, keep and delete an icon of the reader's
 * own.
 *
 * Each says what moves — the roster, and with it the series and the compiled prompt — and that Undo
 * takes it back, because a group of icons ticked by one press is the kind of change a reader wants to
 * know is reversible before pressing. Each that touches an icon of the reader's own says what happens
 * to the project's library too, which keeps its own copy and which Undo does not reach.
 */
export const ICON_CATALOGUE_ACTION_TOOLTIPS = {
  openCatalogue: `Opens the icon catalogue, where you tick the icons this set draws. Each icon you tick becomes a named slot on an icon sheet, at most ${String(ICONS_PER_SHEET)} components to a sheet before the overlay sheets, and the compiled prompt follows at once.\n\nEvery tick is a step Undo can take back.`,

  tickGroup: `Ticks every icon this group is showing under the current search and filters, as one step Undo can take back. An icon that would take the set past its ${String(ICON_ROSTER_CAPACITY)} components is left unticked, and a notice says how many.`,

  untickGroup:
    'Unticks every icon this group is showing under the current search and filters, as one step Undo can take back. The icon sheets are cut again as evenly as the set allows, so icons can move to other sheets.',

  clearAll:
    'Unticks every icon on your set, including any the search is hiding and the icons you wrote yourself, as one step Undo can take back. Your own icons stay in your library to tick again. The series goes back to the overlay sheets alone, and the prompt follows.',

  addOwn:
    'Opens a form for an icon the catalogue does not hold, such as a quest relic or a spell only your game has. You name its role, its kind and what it looks like. It joins your set as a named slot like any ticked icon, and the library of the project chosen beside this keeps it for later sets.',

  submitNew:
    'Puts the icon you have written on your set, at the end of its kind’s shelves, and saves it to the chosen project’s library. The compiled prompt draws it at once.\n\n' +
    'Undo takes it off your set, and the library keeps it until you delete it there. A field the form cannot accept says why beside it, and nothing is added until it can.',

  submitChange:
    'Saves your changes to this icon in the chosen project’s library and, where it is ticked, on your set, as one step Undo can take back there. Its line on the sheet and its slot name follow your new words, and it keeps its place unless you changed its kind.\n\n' +
    'A preset or history entry saved earlier keeps the copy it was saved with, so no prompt you kept changes.',

  cancelOwn:
    'Closes the form without changing your set or your library. Whatever you typed into it is discarded.',

  editOwn:
    'Opens this icon in the form above the shelves, so you can change its role, kind, look or states. Saving changes your library’s copy and, where it is ticked, your set’s together. Nothing changes until you save.',

  deleteOwn:
    'Deletes this icon from the chosen project’s library, after asking once. A ticked copy stays on your set, and every preset and history entry holding one keeps it, so no prompt you kept changes.',

  confirmDeleteOwn:
    'Deletes the icon from this project’s library for good. **There is no undo** for the library. A ticked copy stays on your set, and Save to library puts it back.',

  cancelDeleteOwn: 'Keeps the icon in your library, and puts the row back to its ordinary buttons.',

  keepOwn:
    'Saves this icon into the chosen project’s library, so a later set can tick it without it being typed again. Your set does not change. It is refused if that library already holds an icon answering to one of its slot names.',
} as const;
