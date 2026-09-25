/**
 * Guidance for the prompt-history drawer's controls.
 *
 * The history is the one collection in this app that cannot be rebuilt from what is on screen, so
 * every entry that removes something says so plainly, and the two that destroy the lot say it twice.
 */
export const HISTORY_ACTION_TOOLTIPS = {
  search:
    'Narrows the list to entries matching what you type, searching the whole prompt text as well as each entry’s category and generator. Filtering deletes nothing: the count at the foot of the drawer shows how many entries are recorded and how many are showing.',

  copyEntry:
    'Copies this recorded prompt to the clipboard exactly as it was, without touching the studio. Use it to run the same sheet through a generator again; use Restore when you want to change something first.',

  restoreEntry:
    'Loads the studio state this prompt was compiled from, including the category, every subject field and every output setting, so you can change something and recompile rather than edit prompt text by hand.\n\n' +
    '**Whatever is in the studio now is replaced.** It is recorded in the Subject history panel first, so one Undo brings it back. An entry whose stored state can no longer be read restores its category’s defaults instead.',

  deleteEntry:
    'Removes this one entry from the history, after asking once. A prompt you have already used is not lost, but this record of it and the studio state stored with it cannot be recovered.',

  confirmDeleteEntry:
    'Removes this entry for good. **There is no undo**, and the studio configuration recorded with it goes too.',

  cancelDeleteEntry: 'Leaves the entry in the history and puts the button back to its ordinary state.',

  exportHistory:
    'Downloads the whole history as a JSON file: every entry’s prompt text and studio state, not only the entries the search is showing. It is the only copy that survives clearing the browser’s storage, so export it before anything drastic.',

  clearHistory:
    'Deletes every recorded prompt, after asking once. The history cannot be rebuilt from anything on screen, so export it first if there is anything in it you would miss. Presets and the current studio configuration are untouched.',

  confirmClearHistory:
    'Deletes every recorded prompt and the studio state stored with each one. **There is no undo**, and no other copy exists unless you exported the history first.',

  cancelClearHistory:
    'Leaves every recorded prompt where it is and puts the footer back to its ordinary buttons.',
} as const;
