import type { PackItemNoun } from '../types/packImport.ts';

/**
 * What each collection calls its members when a whole pack is being counted.
 *
 * One definition per collection, read by the store that builds the toast and by the confirmation
 * that asks the question — the two sentences a reader compares when deciding whether to replace
 * their library, so a word that differed between them would read as two different collections.
 */
export const PRESET_PACK_ITEMS: PackItemNoun = {
  singular: 'custom preset',
  plural: 'custom presets',
};

export const QUANTISE_PACK_ITEMS: PackItemNoun = {
  singular: 'saved setting',
  plural: 'saved settings',
};
