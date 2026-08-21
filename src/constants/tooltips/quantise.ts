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

  downloadAseprite:
    'Saves the quantised sheet as an Aseprite document at the magnification the Save At control states, whatever the preview is showing. The sprites this tab separated on the sheet are cut into one frame each, in reading order, and each row of them is tagged as its own run — so the file opens with the animation already laid out instead of as a single image to slice by hand. A sprite keeps its place up and down within its row, which is what carries a bob or a crouch across the frames; its position along the row is where it sat in the sequence rather than how it was drawn, so every frame is centred. Where the sheet’s colours fit, the document is written in indexed mode with the palette as its own, which is what lets a palette swap work in the editor; past 256 entries it is written in RGB colour mode instead, and the confirmation says which you got. A sheet with nothing separable on it is written whole, as a document of one frame. It is unavailable until a grid is settled, and again while a file is being written.',

  downloadPNG:
    'Saves the quantised sheet as a PNG at the magnification the Save At control states, whatever the preview is showing. At 1× that is the sheet’s own true size — the sheet divided by the pixel grid, so a 1024 px sheet read at a grid of 8 is written out 128 px across, genuine pixel art with one file pixel per drawn pixel, which is what an engine wants to import. Where the sheet’s colours fit, it is written as a true indexed PNG, carrying its palette in the file rather than only in this panel, which is the form a game pipeline, a tile editor or a palette-swap shader reads. A palette holds 256 entries, and transparency takes one of them, so a keyed sheet fits 255 colours and an opaque one 256; past that the sheet is written the ordinary way instead, and the confirmation says which you got. Transparency is kept where the background has been keyed out. It is unavailable until a grid is settled, since there is nothing to write until then, and again while the sheet is being written — the button says so, and a large sheet magnified eight times takes a moment.',

  lockPalette:
    'Takes the colours out of the quantised sheet beside this and holds them, so the next sheet you bring in is drawn in the same ones. A sprite sheet series is generated a sheet at a time, and a palette chosen afresh from each of them drifts — two sheets of one character come back with two sets of greens that are near-identical and not the same, so the armour changes shade between the walk sheet and the run sheet. A held palette supersedes the studio’s colour setting for as long as you keep it, and it survives dropping a new sheet, which is the whole point of it. It changes nothing about the prompt, the studio or anything already downloaded, and it is unavailable while a newer result is still being worked out, so the colours you hold are always the ones you are looking at.',

  unlockPalette:
    'Discards the held palette, so this sheet and the next one are coloured by the studio’s own setting again. Nothing that has already been downloaded changes, and the sheet on screen is quantised again without the lock as soon as you press it. Take a new palette from whichever result you would rather the series followed.',

  relockPalette:
    'Replaces the held palette with the colours of the sheet beside this one. Worth doing after changing the studio’s colour setting, since a palette taken under the old one is still the one being applied — and worth doing when the sheet you locked from turns out not to be the one whose colours the rest of the series should follow.',

  saveQuantisePreset:
    'Stores every dial on this tab under the name in the box, so the settings you have just found can be brought back on the next sheet without hunting for them again. The pixel scale, the sheet itself and any locked palette are left out deliberately — each describes one particular image rather than a way of reading images. Typing a name that is already in the list turns this into an update of that entry, which the button says before you press it.',
  loadQuantisePreset:
    'Moves every dial on this tab to the positions saved under this name. The sheet on screen stays where it is and is simply re-read at those settings, so this is a way of trying a saved recipe on the image in front of you rather than of loading anything new. Whatever the dials were set to beforehand is replaced outright, so save the current positions first if you want them back.',
  deleteQuantisePreset:
    'Offers to remove this saved set of dial positions from the collection. The row turns into a confirmation first, so a press here changes nothing on its own — and nothing about the sheet on screen changes either way, since a saved set is a record of where the dials were rather than anything the artwork depends on.',
  confirmDeleteQuantisePreset:
    'Removes this set of dial positions for good. There is no undo and nothing else holds a copy, so if you may want these settings again, cancel and save them under a second name first. The dials themselves stay exactly where they are — only the saved record of them goes.',
  cancelDeleteQuantisePreset:
    'Leaves the saved set where it is and puts the row back to its ordinary buttons. Nothing was removed, and the dials on this tab were never touched.',
  undoDials:
    'Puts the dials back where they were before your last change to them, one change at a time. A drag counts as one change rather than one per position the slider passed through, so a single press undoes the whole of it. Only the dials move — the sheet stays loaded, the pixel grid stays where you set it and a held palette stays held — and the sheet is read again at the positions you step back to. Ctrl+Z does the same thing, except while you are typing in a box, where it undoes your typing as it always has.',
  redoDials:
    'Steps forward again into a position you have just stepped back from, which is the way out of an undo pressed once too often. Moving any dial after stepping back replaces what was ahead of you, so this is offered only until you do. Ctrl+Shift+Z and Ctrl+Y both do the same.',
  candidateFromSheet:
    'Puts the scale read out of this sheet into the grid box. A measured reading is exact — the sheet’s colours genuinely change only every so many pixels — and it is already in force, so this is the way back after you have typed over it. An estimated reading is a different thing: it is inferred from the spacing the softened edges of a resampled sheet still repeat at, which is why it is offered here rather than applied for you. Judge an edge at 4× or 8× after taking it.',

  candidateFromTarget:
    'Puts the scale implied by the studio’s target component size into the grid box. It is an upper bound rather than a reading of this image: at any coarser scale the sheet could not hold the number of components the prompt asked for, and a generator that left canvas empty drew finer than this. Worth trying when no reading of the sheet found a scale, and worth checking against the preview either way.',
} as const;
