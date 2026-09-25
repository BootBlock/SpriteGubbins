/**
 * Guidance for the controls the two overlays and the split drawer carry in their own footers.
 *
 * A close button is the one control here that looks too obvious to explain, and it is the one most
 * worth a sentence: what a reader wants to know before pressing it is whether anything is about to
 * be lost. These two are shown on **every** dialog, so what they say has to be true of all of them —
 * and it is not the same answer in each. The settings dialog applies every change as it is made and
 * has nothing to lose; the atlas calculator's canvas size and gutter are its own working state and
 * go when it closes. So they say what is *durable* rather than promising that nothing goes.
 */
export const DIALOG_TOOLTIPS = {
  close:
    'Closes this panel. Nothing outside it is affected, and nothing here waits on a Save: a preference applies as you change it, and the atlas calculator’s two settings start fresh next time. Escape does the same.',

  done: 'Closes the panel, exactly as the ✕ does. It submits nothing, because whatever this dialog changes has already been changed.',

  copyAtlasSpec:
    'Copies the atlas layout to the clipboard as JSON: the texture size, the grid, the cell pitch, the usable bounds each component gets, and whether the requested component size fits them.\n\n' +
    'Paste it into the importer, packer or build script that needs the returned sheet’s layout. It is not prompt text, and it changes nothing in the studio.',

  resetSettings:
    'Puts every preference in this dialog back to its fresh-install default: the default accent, motion following your system alone, the ambient backdrop painted, and the app opening on the Studio. The studio configuration, your saved presets and the prompt history are untouched.',

  copySheetPrompt:
    'Copies this one sheet’s finished prompt and records it in the history, which marks the row as copied. The drawer still shows how far through the batch you are after you close it, change the identity lock or come back in a later session.\n\n' +
    'Generate the sheets one at a time. A single prompt asking for all of them comes back as a plausible subset rather than an obvious shortfall.',
} as const;
