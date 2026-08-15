/**
 * Guidance for the studio's actions — the controls that *do* something rather than hold a value.
 *
 * The settings' own guidance lives with the options each one offers, in `constants/output/`, because
 * an option list and the sentence explaining it drift apart the moment they are filed separately.
 * These have no option list to sit beside: they are buttons, and what a reader needs from one is
 * what it will do to the configuration they have already built.
 */
export const STUDIO_ACTION_TOOLTIPS = {
  randomise:
    'Fills every field in this panel with a value drawn from the current category’s own option pools, leaving the category itself and everything in Output Configuration alone. It is a way of finding a subject rather than a way of finishing one: a random draw makes combinations nobody would have typed, and any field it lands badly on is still yours to overwrite. There is no undo, so save a configuration you want to keep as a preset first.',

  expandAll:
    'Opens or shuts every group in this panel at once. Folding hides the controls and never the configuration — a shut group states its current values in its own header — so this is about how much of the form you want to look at, and changes nothing that reaches the prompt.',

  copyJSON:
    'Puts the studio’s state on the clipboard as JSON: the category, every subject field, and every output setting, exactly as they are now. This is the configuration rather than the prompt, so it is what to paste into a note, an issue or a script when the useful thing is the settings themselves. Pasting it back into the app is not a route the studio offers — that is what presets and the prompt history are for.',

  downloadMarkdown:
    'Saves the compiled prompt as a Markdown file, named after the subject so a folder of them stays readable. The text is identical to what Copy Prompt puts on the clipboard; a file is the better form when the prompt is going into version control, a shared drive, or a generator that takes an attachment. Downloading does not record the prompt in the history, which only tracks what has been copied.',

  splitIntoSheets:
    'Opens the drawer that works through this configuration one sheet at a time. Some configurations are more than one generation: a cut-out rig covers a single facing per sheet, so eight directions is eight runs, and a component set too large for one sheet arrives as a short series. Each row in the drawer carries its own finished prompt, what it asks for, and whether you have copied it yet. Set the identity lock from the first sheet you accept, or the later runs are free to return a different individual in similar colours.',

  previousSheet:
    'Goes back one sheet in this batch, putting that sheet’s own facing and its place in the series into the studio so the prompt recompiles for it. Only which sheet you are composing changes — the subject, the render settings and the identity lock all stay as they are, and nothing you have already copied is disturbed. Use it to re-read or re-copy a sheet whose generation you were not happy with.',

  nextSheet:
    'Moves on to the sheet after this one, setting the facing and the series position it needs in a single write. Work through a batch in the order it is given: the sheets carrying the trunk come first, and every later run has to match what you accepted from them. Pressing it copies nothing — take this sheet away, generate it, and step on once you have a result you are keeping.',

  copyPrompt:
    'Compiles this configuration and puts the finished prompt on the clipboard, ready for whichever generator the Target Model names. The prompt and the studio state behind it go into the history at the same time, so the setup can be restored later even after you have moved on. The header carries the same action for when the foot of the form is a long way down.',

  describeSubject:
    'Writes what the panels above already say about the subject into the identity lock, as the labelled lines the lock is read in. It only ever replaces its own lines — your own prose and the palette line are left where they are — so it is safe to press again after changing a field. Treat what it produces as a first draft: what actually holds a series together is concrete, countable detail taken off the sheet you accepted, and this can only restate the terms you chose from a list.',

  readPalette:
    'Reads the dominant colours out of a sheet you have accepted and writes them into the identity lock as a palette line, most-used first, with the background key left out. It is the one line of a continuity digest nobody writes accurately by hand — eyeballing hex codes off a sheet is guesswork, and a later generation drifts to whatever the words allowed. The image is decoded in this tab and never leaves it.',
} as const;
