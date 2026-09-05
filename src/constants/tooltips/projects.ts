/**
 * Guidance for the Projects view's controls, and for the project dropdowns the other two views
 * carry.
 *
 * A project is a container rather than a setting, so nearly every entry here has to say what it
 * does to the things filed inside it — which is the one thing a reader cannot see from the row in
 * front of them, and the thing they will mind about.
 *
 * **The four dropdowns are here rather than beside the panels that render them**, which is the
 * exception to the rule that a setting's guidance sits with its own options. Their options are the
 * project list, which lives in this feature and nowhere else, and the four say four different
 * things about it: two decide where a new save goes and two re-file one that already exists.
 */
export const PROJECT_ACTION_TOOLTIPS = {
  newProjectName:
    'What the new project will be called. Pick the game or the job the sprites are for, since this is the name every save dropdown in the app will offer you afterwards. It has to be different from your other projects’ names, and it is capped at the length a dropdown can show without cutting the end off. You can change it later without disturbing anything filed inside, because a project is identified by a hidden id rather than by what it is called.',

  newProjectDescription:
    'An optional sentence about the new project, shown under its name in the list here. Something like “Overworld sprites for the harbour town” is worth more in six months than the name alone. Nothing outside this view reads it, and a project without one simply shows nothing there.',

  createProject:
    'Makes a project from the two boxes beside this and adds it to the list, ready to be chosen the next time you save. It is refused if the name is blank or another project already answers to it. Nothing is filed in the new project until you save something into it or move an existing save across.',

  selectProject:
    'Opens this project, listing the studio presets and the quantiser settings saved in it. Choosing one changes nothing about your saves — it decides which of them the panel beside this shows. The number on the right counts everything filed here, of both kinds.',

  editProjectDetails:
    'Opens this project’s name and its sentence for editing, in place of its heading. The saves inside are untouched and keep pointing at this project however you rename it, since what they refer to is an id that never changes. A name one of your other projects already answers to is refused, because the dropdowns you save through would then offer two rows nobody could tell apart.',

  projectNameBox:
    'The project’s new name, capped at the length a save dropdown can show whole. Enter stores both boxes and Escape abandons the edit. Neither the saves filed here nor anything in the studio is affected either way.',

  projectDescriptionBox:
    'The sentence this project’s row carries under its name, which only this view shows. Leaving it empty is fine. Enter stores both boxes and Escape abandons the edit, and the project’s contents are untouched whichever you press.',

  confirmProjectDetails:
    'Stores the project’s name and sentence together. It is refused if another project already answers to that name, and the boxes stay open so you can choose a different one. Everything filed in the project stays exactly where it is.',

  cancelProjectDetails:
    'Closes the editor and keeps this project’s existing name and sentence. Escape in either box does the same, and nothing filed in the project was going to change in any case.',

  deleteProject:
    'Removes this project and every preset saved in it, after asking once. The studio archetypes and the quantiser settings filed here go together with it, since neither has anywhere to live afterwards. Nothing in the studio or the Quantise tab changes, and the Default project can never be removed — it is where a save goes when you have chosen nothing else.',

  confirmDeleteProject:
    'Removes the project and its contents for good. There is no undo, and no other copy of any of it unless you have exported your library to a file. The count beside this says how many saves are about to go with it.',

  cancelDeleteProject:
    'Leaves the project and everything in it alone, and puts the row back to its ordinary buttons.',

  exportLibrary:
    'Downloads your whole library as a single JSON file: every project, every studio preset filed in one, and every saved set of quantiser settings. The built-in archetypes travel in it as well, so somebody opening the file sees complete configurations rather than references to presets they have not got. Use it to move your work to another browser or machine, to keep a copy that outlives this browser’s storage, or to hand a set of projects to somebody else.',

  importLibrary:
    'Reads a library pack this app exported and offers to put everything in it in place of what you have. It says how many things the file carries and how many of yours would go, and nothing is removed until you agree to it. Built-in archetypes in the file are skipped, since the app already ships them, and a preset naming a project the file does not carry is filed under Default rather than lost.',

  confirmImportLibrary:
    'Replaces your projects and everything saved in them with the file’s, for good. All of it goes from this browser’s storage and there is no undo, so cancel and export first if any of it is worth keeping. Nothing in the studio or the Quantise tab moves until you load one of the saves that arrives.',

  cancelImportLibrary:
    'Puts the file aside without reading any of it into storage. Your projects and everything filed in them stay exactly as they are, and the two transfer buttons come back so you can choose a different file or leave it at that.',

  savePresetProject:
    'Which project the studio configuration is filed under when you press Save. Names only have to be unique inside one project, so saving “Hero” here updates the “Hero” in this project and leaves any other project’s alone. The list is every project you have made, and new projects are made on the Projects view rather than typed here.',

  saveQuantiseProject:
    'Which project these dial positions are filed under when you press Save. The list is the same one the studio saves into, so a game’s prompts and the settings its sheets are read back at end up in one place. Choosing a project here does not narrow the saved sets listed below, which stay in view whichever project each belongs to.',

  movePresetProject:
    'Files this preset under a different project, right now. Its name, its description and the whole configuration behind it are untouched, and it keeps the identity it was saved with — so this is safe to press even where the project you are moving it to already has a preset of the same name. Nothing in the studio changes.',

  moveQuantiseProject:
    'Files this saved set of dial positions under a different project, right now. The dials themselves are untouched and nothing in the Quantise tab moves, so a set you have loaded stays loaded. It is the same one-press move the studio presets have, and it can be undone by choosing the old project again.',
} as const;
