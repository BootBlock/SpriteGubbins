import type { PackItemNoun } from '../types/packImport.ts';

/**
 * What a pack calls its members when a whole one is being counted.
 *
 * One definition, read by the store that builds the toast and by the confirmation that asks the
 * question — the two sentences a reader compares when deciding whether to replace their library, so
 * a word that differed between them would read as two different collections.
 *
 * **One noun, because there is now one pack.** The library used to travel as two files, the studio
 * archetypes and the quantiser's dial positions, with a noun each. It is one file now, holding the
 * projects and both collections, so a sentence counting it has to name what they have in common
 * rather than what either of them is: “12 saved items” covers three projects, seven archetypes and
 * two sets of dials, where any of the three specific words would be false of most of what was
 * counted.
 */
export const LIBRARY_PACK_ITEMS: PackItemNoun = {
  singular: 'saved item',
  plural: 'saved items',
};
