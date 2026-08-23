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

  detachPreview:
    'Moves both previews, the layout choice and the zoom into a window of their own, so they stay in front of you while you scroll through the dials on this page. The window opens at the size the panel had and can be dragged to a second display or made as large as you like, and the previews go on following every change you make here. Where the browser supports it the window floats above this one and carries no address bar; where it does not, it is an ordinary browser window. Nothing about the sheet or the transform changes — this decides where the preview is shown and nothing else. A browser set to block popups can refuse it, and this panel says so if that happens.',

  reattachPreview:
    'Closes the separate window and puts both previews back into this page, in the place the panel came from. Closing that window yourself does the same thing, and so does leaving this tab, so nothing is stranded if you lose track of it. The zoom, the layout and the position you had panned to all come back with it, since they were never anywhere but this tab.',

  downloadAseprite:
    'Saves the quantised sheet as an Aseprite document at the magnification the Save At control states, whatever the preview is showing. The sprites this tab separated on the sheet are cut into one frame each, in reading order, and each row of them is tagged as its own run — so the file opens with the animation already laid out instead of as a single image to slice by hand. A sprite keeps its place up and down within its row, which is what carries a bob or a crouch across the frames; its position along the row is where it sat in the sequence rather than how it was drawn, so every frame is centred. Where the sheet’s colours fit, the document is written in indexed mode with the palette as its own, which is what lets a palette swap work in the editor; past 256 entries it is written in RGB colour mode instead, and the confirmation says which you got. A sheet with nothing separable on it is written whole, as a document of one frame. It is unavailable until a grid is settled, and again while a file is being written.',

  downloadPNG:
    'Saves the quantised sheet as a PNG at the magnification the Save At control states, whatever the preview is showing. At 1× that is the sheet’s own true size — the sheet divided by the pixel grid, so a 1024 px sheet read at a grid of 8 is written out 128 px across, genuine pixel art with one file pixel per drawn pixel, which is what an engine wants to import. Where the sheet’s colours fit, it is written as a true indexed PNG, carrying its palette in the file rather than only in this panel, which is the form a game pipeline, a tile editor or a palette-swap shader reads. A palette holds 256 entries, and transparency takes one of them, so a keyed sheet fits 255 colours and an opaque one 256; past that the sheet is written the ordinary way instead, and the confirmation says which you got. Transparency is kept where the background has been keyed out. It is unavailable until a grid is settled, since there is nothing to write until then, and again while the sheet is being written — the button says so, and a large sheet magnified eight times takes a moment.',

  downloadSpritePack:
    'Saves a ZIP holding three things: the quantised sheet as it would have downloaded on its own, one PNG per sprite this tab separated on it, and a manifest naming them. The sprites are cut at the bounding boxes the Sprites panel counted and the preview rings, at the magnification the Save At control states, so what you get is the artwork already in pieces rather than one picture to slice by hand. Where the studio is composing the sheet you dropped, the pieces carry the inventory’s own names — the prompt fixes the reading order, so the third sprite across is the third component it asked for — and where the sprite count and that inventory disagree the files are numbered instead, which the confirmation says. Nothing about the sheet is changed by this: the colours, the grid and the keying are what the dials already produced. It is unavailable until a grid is settled, and again while a file is being written.',

  downloadManifest:
    'Saves the manifest on its own, as JSON — where every sprite sits on the sheet, what the inventory calls it, where it stands, and which sprites are the same drawing twice. The rects describe the PNG this panel would write at the magnification the Save At control states, so the two go together: take the sheet with the PNG button and this file tells an importer, a packer or a script of your own how to cut it. It also records which sheet of which deliverable the studio was composing when you saved, which is what makes ten downloads of a ten-sheet character sort themselves. It carries no artwork and changes nothing — reach for the sprite pack instead if you want the pieces as files. It is not the component map the studio can ask a generator for: that one is the model’s account of what it meant to draw, and it carries a bone parent nothing here can measure. The two number their entries the same way, so you can read them side by side.',

  keyTheBackground:
    'Switches the background keying on, at the tolerance this tab already holds — the tolerance control appears with the rest of the keying row once the pass is running. The tab offers this when the border of the sheet you dropped is the key colour the studio asked for, which means the field came back on the image rather than as transparency. Pressing it changes the result, not the file you dropped: the field becomes alpha, the sprite, duplicate, symmetry and frame readings below start reporting, and the checkbox it turns on is where you switch it off again. Nothing about the prompt or the studio moves.',

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
  exportQuantisePresets:
    'Downloads every set of dial positions you have saved as one JSON file. The collection otherwise lives only in this browser’s storage, so this is how it survives clearing that storage, reaches a second machine, or reaches somebody else working on the same artwork. The file holds the dials and their names — no images, and nothing about the sheet each set was found on.',
  importQuantisePresets:
    'Reads a file exported from this tab and offers to put its saved settings in place of yours. It says how many sets the file carries and how many of your own would go, and nothing is deleted until you agree to it. The dials on this tab do not move, and the sheet on screen is not re-read, until you load one of the sets that arrives.',
  confirmImportQuantisePresets:
    'Puts the file’s saved settings in place of your collection, for good. Every set you have saved goes from this browser’s storage and there is no undo, so cancel and download your own collection first if you may want it back. The dials on this tab stay where they are either way, and the sheet on screen is not re-read.',
  cancelImportQuantisePresets:
    'Leaves your collection where it is and forgets the file. None of it was read in, none of yours was removed, and the transfer buttons come back so you can choose a different file.',
  cancelDeleteQuantisePreset:
    'Leaves the saved set where it is and puts the row back to its ordinary buttons. Nothing was removed, and the dials on this tab were never touched.',
  undoDials:
    'Puts the dials back where they were before your last change to them, one change at a time. A drag counts as one change rather than one per position the slider passed through, so a single press undoes the whole of it. Only the dials move — the sheet stays loaded, the pixel grid stays where you set it and a held palette stays held — and the sheet is read again at the positions you step back to. Ctrl+Z does the same thing, except while you are typing in a box, where it undoes your typing as it always has.',
  redoDials:
    'Steps forward again into a position you have just stepped back from, which is the way out of an undo pressed once too often. Moving any dial after stepping back replaces what was ahead of you, so this is offered only until you do. Ctrl+Shift+Z and Ctrl+Y both do the same.',
  autoTune:
    'Sweeps the dials that decide how this sheet is read, and puts them where the sheet itself says they belong. It runs the whole pipeline over five busy crops of your image at several hundred combinations of the cell reading, the outline expansion, the ink blend, the ink threshold, the colour merge, the fill cleanup, the cleanup passes and the four dials that shape the anti-aliasing pass, and keeps the one that reproduces those crops most closely for the fewest colours. It goes round all of them up to six times, stopping as soon as a round retraces ground it has already covered, so each dial is finally chosen against the others rather than against the positions they opened at — which is why it can take a minute or two on a large sheet. Those twelve dials are all it moves: the pixel scale, the background keying, the edge hardening, the dither, the palette snap, the sprite gap, the frame alignment, the anti-aliasing control itself and the symmetry and duplicate settings stay exactly where you put them, because none of them is a question a likeness score can answer — keying and hardening both delete pixels, a dither trades likeness away on purpose, whether to soften a contour at all is a matter of style, and the rest change what the tab reports rather than what it draws. The whole answer lands as one change, so a single undo puts every dial back where it was. Read it as a starting point rather than a verdict: it judges crops rather than the whole sheet, and your own eye on the preview is what settles it.',
  candidateFromSheet:
    'Puts the scale read out of this sheet into the grid box. A measured reading is exact — the sheet’s colours genuinely change only every so many pixels — and it is already in force, so this is the way back after you have typed over it. An estimated reading is a different thing: it is inferred from what a softened sheet still repeats at — the spacing of its edges, the distance its detail repeats over, or the gaps between the boundaries it still shows — which is why it is offered here rather than applied for you. The badge above says which of those produced the number. Judge an edge at 4× or 8× after taking it.',

  candidateFromTarget:
    'Puts the scale implied by the studio’s target component size into the grid box. It is an upper bound rather than a reading of this image: at any coarser scale the sheet could not hold the number of components the prompt asked for, and a generator that left canvas empty drew finer than this. Worth trying when no reading of the sheet found a scale, and worth checking against the preview either way.',
} as const;
