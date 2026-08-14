/**
 * Guidance for the controls the two overlays and the split drawer carry in their own footers.
 *
 * A close button is the one control here that looks too obvious to explain, and it is the one most
 * worth a sentence: what a reader wants to know before pressing it is whether anything is about to
 * be discarded. In this app the answer is always no, and saying so is the point.
 */
export const DIALOG_TOOLTIPS = {
  close:
    'Closes this panel. Nothing is discarded — every dialog in this app applies its changes as they are made, so there is nothing held back waiting to be saved. Escape does the same thing.',

  done: 'Closes the panel. Everything here has already been applied, so this only puts the page back.',

  copyAtlasSpec:
    'Puts the atlas layout on the clipboard as JSON — the texture size, the grid, the cell pitch, the usable bounds each component gets, and whether the requested component size fits them. It is engine metadata rather than prompt text: paste it into the importer, packer or build script that has to know how the returned sheet is laid out. It changes nothing in the studio.',

  resetSettings:
    'Puts every preference in this dialog back to what a fresh install renders — the default accent, motion following your system alone, the ambient backdrop painted, and the app opening on the Studio. It touches nothing outside this dialog: the studio configuration, your saved presets and the prompt history are all left as they are.',

  copySheetPrompt:
    'Puts this one sheet’s finished prompt on the clipboard and records it in the history, which is also what marks the row as copied — so the drawer still shows how far through the batch you are after closing it, changing the identity lock, or coming back in a later session. Generate the sheets one at a time; a single prompt asking for all of it comes back as a plausible subset rather than an obvious shortfall.',
} as const;
