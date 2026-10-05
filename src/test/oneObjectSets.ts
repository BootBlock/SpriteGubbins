import { lookObject } from './lookObject.ts';

/**
 * The catalogue entries that may be drawn as one object, which the silhouette checks (`lookObject`)
 * otherwise refuse.
 *
 * Each is one object told apart by a drawn difference rather than by hue, so a colour-blind player and a
 * grey tint mask still read it:
 *
 * - **A tier ladder** grows one object: a slim injector against a heavy one, a small key against a heavy
 *   master key, a copper coin against a gold one. An action bar sets them side by side so a player sees
 *   the size, and the restoratives' docblock says why.
 * - **A marked pair** draws a mark on one object: a quest giver's star and a turn-in's tick on one
 *   marker, and a vendor's purse with a return arrow for the buyback — the convention a player knows.
 */
export const ONE_OBJECT_SETS: readonly (readonly string[])[] = [
  ['heal-minor', 'heal-standard', 'heal-major'],
  ['mana-minor', 'mana-major'],
  ['tool-key-common', 'tool-key-master'],
  ['currency-common-coin', 'currency-precious-coin'],
  ['pin-quest-available', 'pin-quest-turn-in'],
  ['service-vendor', 'service-buyback'],
];

/**
 * The groups whose every entry is one carrier marked differently, by convention: a chat channel is a
 * speech bubble with its channel's mark inside, an emote is a gesture of a hand or a face, and a pet
 * command is a paw print with the command's mark. The mark is drawn, so it reads without colour.
 */
export const ONE_OBJECT_GROUPS: ReadonlySet<string> = new Set(['chat', 'emotes', 'pet-commands']);

/** The ids that share one object in `lookObject`'s reading and are not permitted to. */
export function sharedObjects(
  entries: readonly { readonly id: string; readonly look: string }[],
): readonly string[][] {
  const byObject = new Map<string, string[]>();
  for (const { id, look } of entries) {
    const object = lookObject(look);
    byObject.set(object, [...(byObject.get(object) ?? []), id]);
  }
  return [...byObject.values()].filter(
    (ids) => ids.length > 1 && !ONE_OBJECT_SETS.some((set) => ids.every((id) => set.includes(id))),
  );
}
