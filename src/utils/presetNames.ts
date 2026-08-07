import type { PresetArchetype } from '../types/preset.ts';

/**
 * Which preset a typed name refers to, or `undefined` if it is a new one.
 *
 * The comparison is trimmed and case-insensitive because the library displays *names*, not
 * identifiers. "My Knight" and "my knight" sit next to each other looking like a mistake, and
 * telling them apart means remembering which was saved when — which is the confusion this rule
 * exists to prevent, not a distinction worth preserving.
 *
 * Pure, and shared by the save and rename paths deliberately: two implementations of "is this name
 * taken?" would eventually disagree, and the first sign of that would be a duplicate the user
 * cannot tell apart.
 */
export function findPresetByName(
  presets: readonly PresetArchetype[],
  name: string,
): PresetArchetype | undefined {
  const needle = name.trim().toLowerCase();
  if (needle === '') return undefined;
  return presets.find((preset) => preset.name.trim().toLowerCase() === needle);
}
