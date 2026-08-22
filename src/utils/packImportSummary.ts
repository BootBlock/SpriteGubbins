import type { PackItemNoun } from '../types/packImport.ts';

/** A count and the word for what is being counted — “1 custom preset”, “11 custom presets”. */
export function countPackItems(count: number, noun: PackItemNoun): string {
  return `${count} ${count === 1 ? noun.singular : noun.plural}`;
}

/**
 * The question the import confirmation asks, naming both figures.
 *
 * Both, because either on its own is the half a reader does not need: how many presets arrive says
 * nothing about what it costs, and how many go says nothing about what is coming instead. Neither
 * number is known until the file has been parsed, which is why the confirmation belongs after the
 * parse rather than on the press that opens the file chooser.
 *
 * An empty collection is a different sentence rather than "replacing 0": there is nothing to lose,
 * and saying so is what stops a reader on their first visit reading a warning about work they have
 * not done yet.
 */
export function describePackReplacement(incoming: number, replacing: number, noun: PackItemNoun): string {
  const arriving = `This file holds ${countPackItems(incoming, noun)}.`;
  return replacing === 0
    ? `${arriving} You have none saved, so importing it deletes nothing of yours.`
    : `${arriving} Importing it deletes the ${countPackItems(replacing, noun)} you already have, and there is no undo.`;
}

/**
 * What the toast says once the replace has run.
 *
 * It reports the deletion as well as the arrival, which the old wording did not: "Imported 4 custom
 * presets" is true of a library that had eleven and now has four, and a reader who had not read the
 * tooltip learned nothing from it.
 */
export function describePackImported(incoming: number, replacing: number, noun: PackItemNoun): string {
  const imported = `Imported ${countPackItems(incoming, noun)}`;
  return replacing === 0 ? imported : `${imported}, replacing ${replacing}`;
}

/**
 * The Replace button's accessible name.
 *
 * It carries the figures rather than leaning on the sentence beside it, because the sentence cannot
 * be attached to the button: {@link ControlTooltip} clones its child and writes `aria-describedby`
 * itself, so a description set here would be overwritten. A name that stands alone is also what the
 * app's own repeated buttons do — `QuantisePresetRow` names the preset each of its buttons acts on
 * for the same reason.
 */
export function describeReplaceAction(incoming: number, noun: PackItemNoun): string {
  return `Replace your ${noun.plural} with the ${countPackItems(incoming, noun)} in this file`;
}

/** The Cancel button's accessible name, saying what survives rather than merely "cancel". */
export function describeCancelAction(replacing: number, noun: PackItemNoun): string {
  return replacing === 0
    ? 'Cancel the import, which changes nothing'
    : `Cancel the import and keep your ${countPackItems(replacing, noun)}`;
}
