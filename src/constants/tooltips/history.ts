/**
 * Guidance for the prompt-history drawer's controls.
 *
 * The history is the one collection in this app that cannot be rebuilt from what is on screen, so
 * every entry that removes something says so plainly, and the two that destroy the lot say it twice.
 */
export const HISTORY_ACTION_TOOLTIPS = {
  search:
    'Narrows the list to entries matching what you type. It looks through the whole prompt text as well as the category and the generator each one was written for, so a phrase you remember from a sheet finds the entry even when you no longer remember what it was called. Nothing is deleted by filtering — the count at the foot of the drawer says how many are recorded against how many are showing.',

  copyEntry:
    'Puts this recorded prompt back on the clipboard exactly as it was copied, without touching the studio. Use it to run the same sheet again through a generator; use Restore instead when you want to change something first.',

  restoreEntry:
    'Puts the studio state this prompt was compiled from back into the studio — the category, every subject field and every output setting — so you can change something and recompile rather than editing prompt text by hand. Whatever is in the studio now is replaced, and recorded in the Subject history panel on that tab first, so one Undo brings it back. An entry recorded before the app kept that state restores to its category’s defaults instead.',

  deleteEntry:
    'Removes this one entry from the history, after asking once. The prompt itself is not lost if you have already used it — this is the app’s record of it, not the sheet — but nothing here is recoverable, and the studio state stored alongside it goes with it.',

  confirmDeleteEntry:
    'Removes this entry for good. There is no undo, and the studio configuration recorded with it goes too.',

  cancelDeleteEntry: 'Leaves the entry in the history and puts the button back to its ordinary state.',

  exportHistory:
    'Downloads the whole history as a JSON file — every entry, not just the ones the search is showing. It is the only way this collection leaves the app, and the only copy of it that survives clearing the browser’s storage, so it is worth doing before anything drastic. The file holds the prompt text and the studio state behind each entry.',

  clearHistory:
    'Deletes every recorded prompt, after asking once. The history is the one thing in this app that cannot be rebuilt from what is on screen, so export it first if there is anything in it you would miss. Presets and the current studio configuration are not touched.',

  confirmClearHistory:
    'Deletes every recorded prompt and the studio state stored with each one. There is no undo and no other copy unless you exported the history first.',

  cancelClearHistory:
    'Leaves every recorded prompt where it is and puts the footer back to its ordinary buttons.',
} as const;
