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
    'Fills every field in this panel with a value drawn from the current category’s own option pools, leaving the category itself and everything in Output Configuration alone. It is a way of finding a subject rather than a way of finishing one: a random draw makes combinations nobody would have typed, and any field it lands badly on is still yours to overwrite. The subject you had is recorded in the history above the panel first, so one Undo brings the whole of it back.',

  reset:
    'Puts all sixteen fields back to the first option in each of the current category’s pools — the same blank slate that switching category lands on — leaving the category itself and everything in Output Configuration alone. It is not the studio the app opened on: that is a built-in preset, Cyberpunk Katana Specialist, and the Presets tab is where to load it again. Reach for this when a subject has been edited past the point of being worth keeping and starting over beats picking it apart. The studio you had goes onto the history above the panel first, so a single Undo has it back.',

  undoSubject:
    'Puts the subject back the way it was before your last category switch, Randomise, Reset, preset load or restore from the prompt history — the whole studio as it stood then, Output Configuration included, because a category switch moves those settings along with the answers. Those acts are the only things recorded, because each replaces the whole subject at once; editing a single field records nothing, and an edit you made after one of them is not lost either, because Redo brings the studio back exactly as you left it. Nothing outside the Studio tab moves. Ctrl+Z does the same thing, except while you are typing in a box, where it undoes your typing as it always has, and while a dialog is open, where the page behind it is not what your keyboard is aimed at.',

  redoSubject:
    'Steps forward again into a subject you have just stepped back from, which is the way out of an undo pressed once too often. Switching category, randomising, resetting or loading a subject from anywhere after stepping back replaces what was ahead of you, so this is offered only until you do. Ctrl+Shift+Z and Ctrl+Y both do the same.',

  expandAll:
    'Opens or shuts every group in this panel at once. Folding hides the controls and never the configuration — a shut group states its current values in its own header — so this is about how much of the form you want to look at, and changes nothing that reaches the prompt.',

  copyJSON:
    'Puts the studio’s state on the clipboard as JSON: the category, every subject field, and every output setting, exactly as they are now. This is the configuration rather than the prompt, so it is what to paste into a note, an issue or a script when the useful thing is the settings themselves. Pasting it back into the app is not a route the studio offers — that is what presets and the prompt history are for.',

  downloadMarkdown:
    'Saves the compiled prompt as a Markdown file, named after the subject so a folder of them stays readable. The text is identical to what Copy Prompt puts on the clipboard; a file is the better form when the prompt is going into version control, a shared drive, or a generator that takes an attachment. Downloading does not record the prompt in the history, which only tracks what has been copied.',

  splitIntoSheets:
    'Opens the drawer that works through this configuration one sheet at a time. Some configurations are more than one generation: a cut-out rig covers a single facing per sheet, so eight directions is eight runs, and an inventory too large for one sheet is split into parts, each of which is then generated once per facing if its components are drawn for one facing at a time. Each row in the drawer carries its own finished prompt, what it asks for, and whether you have copied it yet. Set the identity lock from the first sheet you accept, or the later runs are free to return a different individual in similar colours.',

  previousSheet:
    'Goes back one sheet in this batch, putting that sheet’s own facing and its part of the inventory into the studio so the prompt recompiles for it. Only which sheet you are composing changes — the subject, the render settings and the identity lock all stay as they are, and nothing you have already copied is disturbed. Use it to re-read or re-copy a sheet whose generation you were not happy with.',

  nextSheet:
    'Moves on to the sheet after this one, setting the facing and the part of the inventory it needs in a single write. Work through a batch in the order it is given: the sheets carrying the trunk come first, and every later run has to match what you accepted from them. Pressing it copies nothing — take this sheet away, generate it, and step on once you have a result you are keeping.',

  copyPrompt:
    'Compiles this configuration and puts the finished prompt on the clipboard, ready for whichever generator the Target Model names. The prompt and the studio state behind it go into the history at the same time, so the setup can be restored later even after you have moved on. The header carries the same action for when the foot of the form is a long way down.',

  describeSubject:
    'Writes what the panels above already say about the subject into the identity lock, as the labelled lines the lock is read in. It only ever replaces its own lines — your own prose and the palette line are left where they are — so it is safe to press again after changing a field. Treat what it produces as a first draft: what actually holds a series together is concrete, countable detail taken off the sheet you accepted, and this can only restate the terms you chose from a list.',

  openGenerator:
    'Opens the chosen generator’s own image page in a new browser tab, so the prompt you have just copied has somewhere to go. Nothing here moves when you press it: no setting changes, nothing is sent, and this app never talks to a generator itself — you paste the prompt in yourself once the page has loaded. Where the link goes is the page that actually generates, rather than the vendor’s front door or its API reference. Three of the targets have no such page, and for those the button is unavailable and says why.',

  readPaletteFromQuantise:
    'Takes the colours from the sheet the Quantise tab is holding and writes them into the identity lock as a palette line, without your having to find the file again. It reads the quantised result rather than the image you dropped into that tab, so the colours it states are the ones you settled there and the ones the palette lock will hold the following sheets to. The Quantise tab is left exactly as it is, and nothing beyond the palette line of the lock changes.',

  readPalette:
    'Reads the dominant colours out of a sheet you have accepted and writes them into the identity lock as a palette line, most-used first, with the background key left out. It is the one line of a continuity digest nobody writes accurately by hand — eyeballing hex codes off a sheet is guesswork, and a later generation drifts to whatever the words allowed. The image is decoded in this tab and never leaves it.',
} as const;
