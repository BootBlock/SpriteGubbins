import { REDO_KEYBOARD_SHORTCUTS } from '../guidanceSentences.ts';

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
    'Fills every field in this panel with a random value from the current category’s option pools. The category and Output Configuration stay as they are.\n\n' +
    'Use it to find a subject rather than to finish one, and overwrite any field it lands badly on. Your previous subject goes into the history above the panel first, so one Undo brings it back.',

  reset:
    'Puts all sixteen fields back to the first option in each of the current category’s pools, the same blank slate that switching category gives you. The category itself and Output Configuration are left alone.\n\n' +
    'This is not the studio the app opened on: that is the built-in preset Cyberpunk Katana Specialist, which you can load again from the Presets tab.\n\n' +
    'Reach for this when starting over beats picking a subject apart. The studio you had goes into the history above the panel first, so a single Undo has it back.',

  undoSubject:
    'Puts the whole studio, Output Configuration included, back the way it stood before your last:\n\n' +
    '- category switch, Randomise or Reset\n' +
    '- preset load, or restore from the prompt history\n' +
    '- assembly base that moved your sheet\n\n' +
    'Only those acts are recorded; editing a field records nothing. An edit you made after one of them is not lost, because Redo brings the studio back exactly as you left it. Nothing outside the Studio tab moves.\n\n' +
    'Ctrl+Z does the same, except while you are typing in a box, where it undoes your typing, or while a dialog is open.',

  redoSubject:
    'Steps forward again into a subject you have just stepped back from, which is the way out of an undo pressed once too often.\n\n' +
    'Switching category, randomising, resetting, loading a subject or choosing an assembly base that moves your sheet replaces what was ahead of you, so this is offered only until you do one of those.\n\n' +
    REDO_KEYBOARD_SHORTCUTS,

  expandAll:
    'Opens or shuts every group in this panel at once, so you choose how much of the form you see. A shut group still shows its current values in its header, and nothing that reaches the prompt changes.',

  copyJSON:
    'Copies the studio’s state to the clipboard as JSON: the category, every subject field and every output setting, exactly as they are now.\n\n' +
    'This is the configuration rather than the prompt, for pasting into a note, an issue or a script. The studio cannot read it back in; presets and the prompt history do that job.',

  downloadMarkdown:
    'Saves the compiled prompt as a Markdown `.md` file named after the subject. The text is identical to what Copy Prompt puts on the clipboard.\n\n' +
    'A file suits version control, a shared drive, or a generator that takes an attachment. Downloading does not add the prompt to the history, which records only what you copy.',

  splitIntoSheets:
    'Opens the drawer that works through this configuration one sheet at a time, for a configuration that takes more than one generation:\n\n' +
    '- a cut-out rig covers one facing per sheet, so eight directions is eight runs\n' +
    '- an inventory too large for one sheet is split into parts, each generated once per facing if its components are drawn one facing at a time\n\n' +
    'Each row carries its own finished prompt, what it asks for, and whether you have copied it yet.\n\n' +
    '**Set the identity lock from the first sheet you accept**, or the later runs are free to return a different individual in similar colours.',

  previousSheet:
    'Goes back one sheet in this batch, putting that sheet’s facing and its part of the inventory into the studio so the prompt recompiles for it.\n\n' +
    'The subject, the render settings and the identity lock stay as they are, and nothing you have copied is disturbed. Use it to re-read or re-copy a sheet whose generation you were not happy with.',

  nextSheet:
    'Moves on to the next sheet in this batch, setting the facing and the part of the inventory it needs.\n\n' +
    'Work through a batch in the order it is given: the sheets carrying the trunk come first, and every later run has to match what you accepted from them. This copies nothing, so generate this sheet and keep a result before you step on.',

  copyPrompt:
    'Compiles this configuration and puts the finished prompt on the clipboard, ready for whichever generator the Target Model names.\n\n' +
    'The prompt and the studio state behind it go into the history, so you can restore the setup after you have moved on. The header carries the same action for when the foot of the form is a long way down.',

  describeSubject:
    'Writes what the panels above say about the subject into the identity lock, as labelled lines. It replaces only its own lines and leaves your prose and the palette line alone, so you can press it again after changing a field.\n\n' +
    'Treat the result as a first draft. What holds a series together is concrete, countable detail taken off the sheet you accepted, and this can only restate the terms you chose from a list.',

  openGenerator:
    'Opens the chosen generator’s own image page in a new browser tab, so the prompt you have copied has somewhere to go. Nothing changes here and nothing is sent: you paste the prompt in yourself.\n\n' +
    'Four of the targets have no such page, and for those the button is unavailable and says why.',

  readPaletteFromQuantise:
    'Writes the colours of the sheet the Quantise tab is holding into the identity lock as a palette line, without your having to find the file again.\n\n' +
    'It reads the quantised result rather than the image you dropped there, so these are the colours the palette lock will hold later sheets to. The Quantise tab and the rest of the lock are left as they are.',

  loadRigContract:
    'Reads a rig contract your engine’s rig tooling exported and takes the sheet’s piece list from it. The file never leaves this tab.\n\n' +
    'Section 4 then names each piece as the engine does, so the pack you cut needs no renaming, and section 5 states each piece’s size, joint end and joint position within the assembled frame. Without it, the prompt states only the assembled size and the model picks each piece’s share.\n\n' +
    'The contract is carried with the configuration, so a saved preset or a restored prompt keeps it. The line under this control says when the one in force came with a preset.',

  removeRigContract:
    'Drops the loaded rig contract. The sheet goes back to the piece list this app authors and to the target size you typed, and nothing else changes. Load the file again to get the engine’s own geometry back.',

  loadCustomPalette:
    'Reads a palette of your own from a file, so the prompt states the colours your project already uses instead of a machine’s. The file is read in this tab and never leaves it. It takes the three forms this app writes:\n\n' +
    '- a swatch picture\n' +
    '- a `.gpl` palette a pixel editor opens\n' +
    '- a list of hex values\n\n' +
    'The colours are pinned in the order the file lists them. A picture holding more colours than a palette can carry is refused rather than trimmed, and you are offered the reduction instead.',

  reduceCustomPalette:
    'Reduces the picture you just dropped to 256 colours and pins those, using the same reducer as the Quantise tab.\n\n' +
    'Every colour it keeps is already in the picture, chosen by how much of the image each covers, so the result measures that picture rather than being a palette somebody authored. Use it when you dropped a sheet rather than a swatch.',

  removeCustomPalette:
    'Drops the colours you loaded. The palette control falls back to the colour budget, as it does before you load anything, and nothing else about the configuration changes.',

  readPalette:
    'Reads the dominant colours from a sheet you have accepted and writes them into the identity lock as a palette line, most-used first, leaving out the background key.\n\n' +
    'Nobody reads hex codes off a sheet accurately by eye, and a later generation drifts to whatever the words allow. The image is decoded in this tab and never leaves it.',
} as const;
