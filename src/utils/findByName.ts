/**
 * Which record in a collection a typed name refers to, or `undefined` if nothing holds it.
 *
 * The comparison is trimmed and case-insensitive because the library displays *names*, not
 * identifiers. "My Knight" and "my knight" sit next to each other looking like a mistake, and
 * telling them apart means remembering which was saved when — which is the confusion this rule
 * exists to prevent, not a distinction worth preserving.
 *
 * Pure, and shared by the save and rename paths deliberately: two implementations of "is this name
 * taken?" would eventually disagree, and the first sign of that would be a duplicate the user
 * cannot tell apart. **Both libraries, too** — the studio's archetypes and the quantiser's saved
 * dial positions are different things that are picked out of a list by name in exactly the same
 * way, so this asks only for a name and hands back whichever kind it was given. **The projects are
 * the third**, and they ask the same question for the opposite purpose: a preset whose name is
 * taken is an update, while a project whose name is taken is refused, because a project is picked
 * out of a dropdown rather than overwritten. What is shared is the comparison, not the policy — the
 * two stores decide what a match means.
 */
export function findByName<T extends { readonly name: string }>(
  records: readonly T[],
  name: string,
): T | undefined {
  const needle = name.trim().toLowerCase();
  if (needle === '') return undefined;
  return records.find((record) => record.name.trim().toLowerCase() === needle);
}
