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
    'Closes this panel. Nothing you have set outside it is affected, and nothing here was waiting on a Save — a preference applies as you change it, and the atlas calculator’s own two settings are working state that starts fresh next time. Escape does the same thing.',

  done: 'Closes the panel, exactly as the ✕ does. Nothing is submitted by it: whatever this dialog changes has already been changed.',

  copyAtlasSpec:
    'Puts the atlas layout on the clipboard as JSON — the texture size, the grid, the cell pitch, the usable bounds each component gets, and whether the requested component size fits them. It is engine metadata rather than prompt text: paste it into the importer, packer or build script that has to know how the returned sheet is laid out. It changes nothing in the studio.',

  resetSettings:
    'Puts every preference in this dialog back to what a fresh install renders — the default accent, motion following your system alone, the ambient backdrop painted, and the app opening on the Studio. It touches nothing outside this dialog: the studio configuration, your saved presets and the prompt history are all left as they are.',

  copySheetPrompt:
    'Puts this one sheet’s finished prompt on the clipboard and records it in the history, which is also what marks the row as copied — so the drawer still shows how far through the batch you are after closing it, changing the identity lock, or coming back in a later session. Generate the sheets one at a time; a single prompt asking for all of it comes back as a plausible subset rather than an obvious shortfall.',
} as const;
