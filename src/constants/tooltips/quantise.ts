/**
 * Guidance for the Quantise tab's actions.
 *
 * Beside `constants/quantiser.ts`'s own `QUANTISE_TOOLTIPS` rather than inside it, and the split is
 * the same one the studio makes: that object explains the tab's three *settings* — the pixel grid,
 * the zoom and the keying — and sits with the numbers those settings are drawn from. These are the
 * buttons, and what a reader needs from one of those is what pressing it does to the sheet in front
 * of them.
 */
export const QUANTISE_ACTION_TOOLTIPS = {
  chooseImage:
    'Opens a file picker for the sheet your generator returned. Dropping the file anywhere on this panel does the same, and so does pasting one from the clipboard while this tab is open. The image is decoded in this tab, transformed here, and never leaves it — there is no server to send it to.',

  clearImage:
    'Drops the loaded sheet and puts every control on this tab back to its default, so the next image is read fresh rather than through the grid and tolerance the last one needed. It discards nothing but this tab’s working state: the file on disk, the studio configuration and anything you have already downloaded are untouched. Loading another sheet over this one does not need it — dropping a new file replaces the old one.',

  downloadPNG:
    'Saves the quantised sheet as a PNG at the magnification the Save At control states, whatever the preview is showing. At 1× that is the sheet’s own true size — the sheet divided by the pixel grid, so a 1024 px sheet read at a grid of 8 is written out 128 px across, genuine pixel art with one file pixel per drawn pixel, which is what an engine wants to import. Transparency is kept where the background has been keyed out. It is unavailable until a grid is settled, since there is nothing to write until then.',

  candidateFromSheet:
    'Puts the scale read out of this sheet into the grid box. A measured reading is exact — the sheet’s colours genuinely change only every so many pixels — and it is already in force, so this is the way back after you have typed over it. An estimated reading is a different thing: it is inferred from the spacing the softened edges of a resampled sheet still repeat at, which is why it is offered here rather than applied for you. Judge an edge at 4× or 8× after taking it.',

  candidateFromTarget:
    'Puts the scale implied by the studio’s target component size into the grid box. It is an upper bound rather than a reading of this image: at any coarser scale the sheet could not hold the number of components the prompt asked for, and a generator that left canvas empty drew finer than this. Worth trying when no reading of the sheet found a scale, and worth checking against the preview either way.',
} as const;
