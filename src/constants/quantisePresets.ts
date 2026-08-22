/**
 * What the quantiser's preset panel says about the collection, keyed to the state it is in.
 *
 * Here rather than inline in the component for the reason every other block of user-facing copy in
 * this app is filed under `src/constants/`: it is content, it ships in the bundle, and it is read by
 * strangers. Filed beside `paletteLock.ts` and `spriteSegmentation.ts` rather than in
 * `constants/tooltips/`, which is where a *control's* guidance lives — these describe the state of
 * the reader's own collection, and the panel's controls have their own entries in
 * `QUANTISE_TOOLTIPS` and `QUANTISE_ACTION_TOOLTIPS`.
 *
 * Neither names a count. The list under the paragraph is the count, so a second copy in prose would
 * be one more place for the two to disagree.
 */
export const QUANTISE_PRESET_GUIDANCE = {
  /** Nothing saved yet, which is every reader's first visit. */
  empty:
    'The dials on this tab open at positions that were calibrated against one reference sheet, and the settings that suit the artwork your own generator returns are usually somewhere else. Once you have found them, save them here under a name and they are a click away on the next sheet. A preset holds the dials and nothing else — not the image, not the pixel scale, and not a locked palette, each of which belongs to one particular sheet rather than to a way of reading sheets.',

  /** At least one saved. */
  saved:
    'Loading a preset moves the dials and leaves everything else alone, so the sheet you are looking at is re-read at the saved settings rather than replaced. Saving under a name already in the list updates that entry instead of adding a second one you could only tell apart by which sorted newer. The collection lives in this browser’s own storage, beside your prompt history and your archetypes, so nothing reaches another browser or another machine on its own — exporting it is what moves it, and what keeps a copy that outlives this browser’s storage.',
} as const;
