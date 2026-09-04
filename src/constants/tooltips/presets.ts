import { COLLECTION_COUNT_FOLLOWS_SEARCH } from '../guidanceSentences.ts';

/**
 * Guidance for the preset library's controls.
 *
 * A preset is the whole studio configuration under a name, so nearly every entry here has to say
 * what it does to the setup currently on screen. That is the one thing a reader cannot see from the
 * card in front of them, and it is the thing they will mind about.
 */
export const PRESET_ACTION_TOOLTIPS = {
  savePresetName:
    'The name this configuration goes into the library under. Names are what the library is searched and sorted by, so something describing the subject and the treatment — “Knight, eight-way cut-out rig” — is worth more later than “test 3”. Reusing the name of a preset you already saved updates that one rather than adding a second, and the button beside this says which of the two it is about to do.',

  savePresetDescription:
    'A sentence saying what this configuration is for, shown on its card under the name and searched alongside it — “Eight-way overworld rig for the town scenes” tells you in a month what a name on its own will not. It is optional, and a preset saved without one shows its subject and setting instead. Naming a preset you already saved fills this in with that preset’s own description, so updating it edits what is in front of you rather than quietly replacing it.',

  savePreset:
    'Stores the studio exactly as it stands — the category, every subject field and every output setting — in the library under the name beside this. It reads as Update instead when the name matches a preset you already saved, and then overwrites that one. Built-in presets are never touched. Saved presets live in this browser’s own storage, so exporting the library is what gets them onto another machine.',

  exportPresets:
    'Downloads the whole library as a single JSON file — the built-in presets as well as your own, so the file makes sense on its own to somebody who opens it. It is the way to move a library between browsers or machines, to keep a copy that survives clearing this browser’s storage, and to hand a set of configurations to somebody else. Importing it back skips the built-ins, so they never arrive twice.',

  importPresets:
    'Reads a preset pack exported from this app and offers to put the presets it holds in place of your saved ones. It says how many the file carries and how many of yours would go, and nothing is deleted until you agree to it. Built-in presets in the file are skipped, since the app already ships them, and nothing in the studio changes until you load one of the presets that arrives.',

  confirmImportPresets:
    'Replaces your saved presets with the ones in the file, for good. Everything you have saved goes from this browser’s storage and there is no undo, so cancel and export your library first if any of it is worth keeping. Built-in presets are untouched, and nothing in the studio moves until you load one of the presets that arrives.',

  cancelImportPresets:
    'Discards the file and asks nothing further. Your saved presets stay exactly as they are, none of the file was read into the library, and the two transfer buttons come back so you can pick a different file.',

  searchPresets:
    'Narrows the library to presets matching what you type, across their names, descriptions, subjects and the settings on each card, so “isometric” or “cut-out” finds them as readily as a name does. It filters every collection at once, and the number beside each collection in the list says how many of its presets match. Escape clears the box.',

  clearSearch:
    'Empties the search box and puts the whole library back, returning to the collection you last chose from the list — a search that found its match somewhere else moves the view while it is running, and this is what takes you back. Escape in the box does the same thing.',

  loadPreset:
    'Replaces the entire studio configuration with this preset’s — the category, every subject field and every output setting — and takes you to the Studio, where the prompt has been recompiled from it. What was in the studio is recorded in the Subject history panel on that tab first, so one Undo brings the whole of it back. A preset is a starting point rather than a finished answer: change whatever it got wrong for your subject afterwards.',

  editPresetDetails:
    'Opens the name and the description of this preset for editing, in place of its title. Only those two change — the configuration behind them is untouched, and nothing in the studio moves, which makes this the way to correct a sentence without saving over the preset with whatever you currently have open. A name another of your presets already uses is refused, because saving under a name that exists overwrites it, and two presets with one name would make which of them a mystery.',

  deletePreset:
    'Deletes this preset, after asking once. It is one of yours rather than a built-in, so nothing else holds a copy: unless it is in a preset pack you exported, deleting it is the end of that configuration. Nothing in the studio changes — a preset you had loaded stays loaded, so saving it again under the same name is the way back if you press this by mistake.',

  detailsNameBox:
    'The preset’s new name. Enter saves both boxes and Escape leaves the preset as it was. The configuration stored under it is untouched either way, and nothing in the studio moves.',

  detailsDescriptionBox:
    'The sentence this preset’s card carries under its title, and one more thing the search looks through. Leaving it empty is fine — the card names the subject and the setting instead. Enter saves both boxes and Escape abandons the edit; neither the stored configuration nor the studio is affected either way.',

  confirmDetails:
    'Stores the name and the description together. It is refused if another of your presets already uses that name, and the boxes stay open so you can pick a different one; the configuration behind the preset is not touched either way.',

  confirmDeletePreset:
    'Deletes this preset for good. There is no undo, and no other copy of it unless you have exported the library. The configuration currently in the studio is untouched either way.',

  cancelDeletePreset: 'Leaves the preset where it is and puts the card back to its ordinary buttons.',

  cancelDetails:
    'Closes the editor and keeps the preset’s existing name and description. Escape in either box does the same.',
} as const;

/**
 * What a collection button in the library's sidebar says, given the collection's own name.
 *
 * A function rather than a record, because the collections are the app's subject categories plus one
 * — a set that grows when a category is added — and a record keyed by hand is the copy that would be
 * missing an entry the first time one is. The label is passed in rather than looked up so this file
 * knows nothing about where the names come from.
 */
export function presetCollectionGuidance(label: string, isCustom: boolean): string {
  return isCustom
    ? 'Shows the presets you have saved yourself, whatever category each one was saved under — “mine” is what you go looking for, and a knight of your own filed among a dozen built-in humanoids is one you would have to hunt for. ' +
        COLLECTION_COUNT_FOLLOWS_SEARCH
    : `Shows the built-in presets written for the ${label} category. Loading any of them switches the studio to that category as well, so the field labels and option pools change with it. ${COLLECTION_COUNT_FOLLOWS_SEARCH}`;
}
