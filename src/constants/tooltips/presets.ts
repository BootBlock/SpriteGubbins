/**
 * Guidance for the preset library's controls.
 *
 * A preset is the whole studio configuration under a name, so nearly every entry here has to say
 * what it does to the setup currently on screen. That is the one thing a reader cannot see from the
 * card in front of them, and it is the thing they will mind about.
 */
export const PRESET_ACTION_TOOLTIPS = {
  savePresetName:
    'The name this preset is saved under. It is what you will pick it out of its project by, so something describing the subject and the treatment — “Knight, eight-way cut-out rig” — is worth more later than “test 3”. Names only have to be different inside one project: reusing one this project already holds updates that preset rather than adding a second, and the button beside this says which of the two it is about to do.',

  savePresetDescription:
    'A sentence saying what this configuration is for, shown under its name on the Projects tab — “Eight-way overworld rig for the town scenes” tells you in a month what a name on its own will not. It is optional, and a preset saved without one shows its subject and setting instead. Naming a preset the chosen project already holds fills this in with that preset’s own description, so updating it edits what is in front of you rather than quietly replacing it.',

  savePreset:
    'Stores the studio exactly as it stands — the category, every subject field and every output setting — under the name beside this, in the project the dropdown names. It reads as Update instead when that project already holds a preset of that name, and then overwrites that one; a preset of the same name in another project is left alone. Built-in presets are never touched. Saved presets live in this browser’s own storage, so exporting your library from the Projects tab is what gets them onto another machine.',

  searchPresets:
    'Narrows the built-in library to presets matching what you type, across their names, descriptions, subjects and the settings on each card, so “isometric” or “cut-out” finds them as readily as a name does. It filters every collection at once, and the number beside each collection in the list says how many of its presets match. Your own saved presets are not in this library and are not searched — they are on the Projects tab, under the project each was filed in. Escape clears the box.',

  clearSearch:
    'Empties the search box and puts the whole library back, returning to the collection you last chose from the list — a search that found its match somewhere else moves the view while it is running, and this is what takes you back. Escape in the box does the same thing.',

  loadPreset:
    'Replaces the entire studio configuration with this preset’s — the category, every subject field and every output setting — and takes you to the Studio, where the prompt has been recompiled from it. What was in the studio is recorded in the Subject history panel on that tab first, so one Undo brings the whole of it back. A preset is a starting point rather than a finished answer: change whatever it got wrong for your subject afterwards.',

  editPresetDetails:
    'Opens the name and the description of this preset for editing, in place of its title. Only those two change — the configuration behind them is untouched, and nothing in the studio moves, which makes this the way to correct a sentence without saving over the preset with whatever you currently have open. A name another preset in this same project uses is refused, because saving under a name that exists there overwrites it, and two presets with one name in one project would make which of them a mystery.',

  deletePreset:
    'Deletes this preset, after asking once. It is one of yours rather than a built-in, so nothing else holds a copy: unless it is in a library pack you exported, deleting it is the end of that configuration. Nothing in the studio changes — a preset you had loaded stays loaded, so saving it again under the same name is the way back if you press this by mistake.',

  detailsNameBox:
    'The preset’s new name. Enter saves both boxes and Escape leaves the preset as it was. The configuration stored under it is untouched either way, and nothing in the studio moves.',

  detailsDescriptionBox:
    'The sentence this preset carries under its name on the Projects tab. Leaving it empty is fine — the row names the subject and the setting instead. Enter saves both boxes and Escape abandons the edit; neither the stored configuration nor the studio is affected either way.',

  confirmDetails:
    'Stores the name and the description together. It is refused if another of your presets already uses that name, and the boxes stay open so you can pick a different one; the configuration behind the preset is not touched either way.',

  confirmDeletePreset:
    'Deletes this preset for good. There is no undo, and no other copy of it unless you have exported your library. The configuration currently in the studio is untouched either way.',

  cancelDeletePreset: 'Leaves the preset where it is and puts the card back to its ordinary buttons.',

  cancelDetails:
    'Closes the editor and keeps the preset’s existing name and description. Escape in either box does the same.',
} as const;

/**
 * What a collection button in the library's sidebar says, given the collection's own name.
 *
 * A function rather than a record, because the collections are the app's subject categories — a set
 * that grows when a category is added — and a record keyed by hand is the copy that would be
 * missing an entry the first time one is. The label is passed in rather than looked up so this file
 * knows nothing about where the names come from.
 *
 * **One branch, where there were two.** The second described the collection holding the reader's
 * own saved presets, and there is no such collection any more: everything a reader saves is filed
 * under a project and shown on the Projects view. The closing sentence came from
 * `constants/guidanceSentences.ts` while the two branches both stated it; with one branch left it
 * is carried by one control, so it is written out here and the constant is gone — a shared sentence
 * with a single carrier is a fact stated once in a file nothing else reads.
 */
export function presetCollectionGuidance(label: string): string {
  return `Shows the built-in presets written for the ${label} category. Loading any of them switches the studio to that category as well, so the field labels and option pools change with it. The count beside it is how many match the search, where one is running.`;
}
