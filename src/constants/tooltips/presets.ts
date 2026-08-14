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

  savePreset:
    'Stores the studio exactly as it stands — the category, every subject field and every output setting — in the library under the name beside this. It reads as Update instead when the name matches a preset you already saved, and then overwrites that one. Built-in presets are never touched. Saved presets live in this browser’s own storage, so exporting the library is what gets them onto another machine.',

  exportPresets:
    'Downloads every preset you have saved as a single JSON file. It is the way to move a library between browsers or machines, to keep a copy somewhere that survives clearing this browser’s storage, and to hand a set of configurations to somebody else. Built-in presets are not included — they ship with the app, so every copy already has them.',

  importPresets:
    'Reads a preset pack exported from this app and adds what it holds to your saved presets. A preset whose name matches one you already have replaces it, so re-importing a pack you have edited updates rather than duplicates. Built-in presets are never affected, and nothing in the studio changes until you load one of the presets that arrives.',

  searchPresets:
    'Narrows the library to presets matching what you type, across their names, subjects and the settings on each card, so “isometric” or “cut-out” finds them as readily as a name does. It filters every collection at once, and the number beside each collection in the list says how many of its presets match. Escape clears the box.',

  clearSearch:
    'Empties the search box and puts the whole library back, leaving the collection you are looking at selected. Escape in the box does the same thing.',

  loadPreset:
    'Replaces the entire studio configuration with this preset’s — the category, every subject field and every output setting — and takes you nowhere, so the prompt is recompiled where you can read it. Anything currently in the studio that has not been saved as a preset or copied is gone, so save it first if you want it back. A preset is a starting point rather than a finished answer: change whatever it got wrong for your subject afterwards.',

  renamePreset:
    'Renames this preset in place. Only its label changes — the configuration behind it is untouched, and nothing in the studio moves. A name another of your presets already uses is refused, because saving under a name that exists overwrites it, and two presets with one name would make which of them a mystery.',

  deletePreset:
    'Deletes this preset, after asking once. It is one of yours rather than a built-in, so nothing else holds a copy: unless it is in a preset pack you exported, deleting it is the end of that configuration. Nothing in the studio changes — a preset you had loaded stays loaded, so saving it again under the same name is the way back if you press this by mistake.',

  renameNameBox:
    'The preset’s new name. Enter saves it and Escape leaves the old one alone. Only the label changes — the configuration stored under it is untouched, and nothing in the studio moves.',

  confirmRename:
    'Stores the new name. It is refused if another of your presets already uses it, and the box stays open so you can pick a different one; the configuration behind the preset is not touched either way.',

  confirmDeletePreset:
    'Deletes this preset for good. There is no undo, and no other copy of it unless you have exported the library. The configuration currently in the studio is untouched either way.',

  cancelDeletePreset: 'Leaves the preset where it is and puts the card back to its ordinary buttons.',

  cancelRename: 'Closes the name box and keeps the preset’s existing name. Escape in the box does the same.',
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
    ? 'Shows the presets you have saved yourself, whatever category each one was saved under — “mine” is what you go looking for, and a knight of your own filed among a dozen built-in humanoids is one you would have to hunt for. The count beside it is how many match the search, where one is running.'
    : `Shows the built-in presets written for the ${label} category. Loading any of them switches the studio to that category as well, so the field labels and option pools change with it. The count beside it is how many match the search, where one is running.`;
}
