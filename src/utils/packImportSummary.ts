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
    : `${arriving} Importing it deletes the ${countPackItems(replacing, noun)} you have saved, and there is no undo.`;
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
