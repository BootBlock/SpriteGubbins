import { MOVE_WAITS_FOR_THE_BUTTON } from '../guidanceSentences.ts';

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
 * things about it: two decide where a new save goes and two choose where an existing one moves. The
 * two Move buttons that commit those choices are here with them.
 */
export const PROJECT_ACTION_TOOLTIPS = {
  newProjectName:
    'What the new project will be called. Name it after the game or job the sprites are for, since every save dropdown in the app offers this name afterwards.\n\n' +
    'It has to differ from your other projects’ names and fit the length a dropdown shows whole. You can rename it later without disturbing anything filed inside.',

  newProjectDescription:
    'An optional sentence about the new project, shown under its name in the list here. Something like “Overworld sprites for the harbour town” is worth more in six months than the name alone. Nothing outside this view reads it.',

  createProject:
    'Makes a project from the two boxes beside this and adds it to the list, ready for your next save. It is refused if the name is blank or another project already answers to it. Nothing is filed in the new project until you save into it or move an existing save across.',

  selectProject:
    'Opens this project, listing the studio presets and the quantiser settings saved in it. Choosing one changes nothing about your saves; it decides which of them the panel beside this shows. The number on the right counts everything filed here, of both kinds.',

  editProjectDetails:
    'Opens this project’s name and sentence for editing, in place of its heading. The saves inside are untouched and stay in this project however you rename it.\n\n' +
    'A name one of your other projects already answers to is refused, so the dropdowns you save through never offer two rows nobody could tell apart.',

  projectNameBox:
    'The project’s new name, capped at the length a save dropdown can show whole. Enter stores both boxes and Escape abandons the edit. Neither the saves filed here nor anything in the studio is affected either way.',

  projectDescriptionBox:
    'The sentence this project’s row carries under its name, which only this view shows. Leaving it empty is fine. Enter stores both boxes and Escape abandons the edit, and the project’s contents are untouched whichever you press.',

  confirmProjectDetails:
    'Stores the project’s name and sentence together. It is refused if another project already answers to that name, and the boxes stay open so you can choose a different one. Everything filed in the project stays where it is.',

  cancelProjectDetails:
    'Closes the editor and keeps this project’s existing name and sentence. Escape in either box does the same, and nothing filed in the project was going to change in any case.',

  deleteProject:
    'Removes this project and everything saved in it, after asking once: its studio presets and its quantiser settings go with it.\n\n' +
    'Nothing in the studio or the Quantise tab changes. The Default project can never be removed, because it is where a save goes when you choose nothing else.',

  confirmDeleteProject:
    'Removes the project and its contents for good. **There is no undo**, and no other copy of any of it unless you have exported your library to a file. The count beside this says how many saves go with it.',

  cancelDeleteProject:
    'Leaves the project and everything in it alone, and puts the row back to its ordinary buttons.',

  exportLibrary:
    'Downloads your whole library as a single JSON file: every project, every studio preset filed in one, and every saved set of quantiser settings. The built-in archetypes travel in it too, so whoever opens it sees complete configurations.\n\n' +
    'Use it to move your work to another browser or machine, to keep a copy that outlives this browser’s storage, or to hand projects to somebody else.',

  importLibrary:
    'Reads a library pack this app exported and offers to put its contents in place of yours. It says how many things the file carries and how many of yours would go, and nothing is removed until you agree.\n\n' +
    'Built-in archetypes in the file are skipped, and a preset naming a project the file does not carry is filed under Default rather than lost.',

  confirmImportLibrary:
    'Replaces your projects and everything saved in them with the file’s. **All of it goes from this browser’s storage and there is no undo**, so cancel and export first if any of it is worth keeping.\n\n' +
    'Nothing in the studio or the Quantise tab moves until you load one of the saves that arrives.',

  cancelImportLibrary:
    'Puts the file aside without reading any of it into storage. Your projects and everything filed in them stay as they are, and the two transfer buttons come back.',

  savePresetProject:
    'Which project the studio configuration is filed under when you press Save. Names only have to be unique inside one project, so saving “Hero” here updates this project’s “Hero” and leaves any other project’s alone.\n\n' +
    'You make new projects on the Projects view rather than typing them here.',

  saveQuantiseProject:
    'Which project these dial positions are filed under when you press Save. It is the same list the studio saves into, so a game’s prompts and the settings its sheets are read back at end up in one place.\n\n' +
    'Choosing a project here does not narrow the saved sets listed below.',

  movePresetProject:
    `Chooses the project this preset moves to. ${MOVE_WAITS_FOR_THE_BUTTON}\n\n` +
    'The Move button appears under the dropdown once you choose a project other than the one the preset is in.',

  confirmMovePreset:
    'Files this preset under the project you chose, right now. Its name, its description and its configuration are untouched, and nothing in the studio changes.\n\n' +
    'It keeps the identity it was saved with, so this is safe even where the destination already has a preset of the same name.',

  moveQuantiseProject:
    `Chooses the project this saved set of dial positions moves to. ${MOVE_WAITS_FOR_THE_BUTTON}\n\n` +
    'The Move button appears under the dropdown once you choose a project other than the one the set is in.',

  confirmMoveQuantise:
    'Files this saved set of dial positions under the project you chose, right now. The dials are untouched and a set you have loaded stays loaded. Moving it back to the old project undoes the move.',
} as const;
