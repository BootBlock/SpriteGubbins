/**
 * The structured component inventory a sheet asks for.
 *
 * This exists because the inventory used to be **prose keyed on `DirectionalMode` alone**, with the
 * component count maintained as a separate number beside it. Two consequences followed, and both
 * shipped:
 *
 * - The subject's category had no influence on the inventory at all, so a CHARACTER could be handed
 *   a tileset's floors and walls, and an OBJECT could be handed a humanoid's arms and legs. Nothing
 *   in the types said those pairings were nonsense.
 * - The count and the list it counted were maintained independently, so they could disagree.
 *
 * Structuring the inventory fixes the second directly — the count is a sum over these entries, never
 * a literal — and gives the first something to check: an entry declares what *kind* of thing it is,
 * so "a CHARACTER sheet must contain no tiles" becomes a property of the data rather than a search
 * for words in generated prose.
 */

/**
 * What sort of component an inventory entry contributes.
 *
 * The point of the union is `categoryPermits` in `utils/sheetPlanValidation.ts`: each subject
 * category admits some kinds and not others, so a contaminated plan fails a structural check rather
 * than being spotted by eye in the output. Kept coarse deliberately — this classifies entries well
 * enough to catch a whole inventory belonging to another category, which is the failure that
 * actually happened, and finer distinctions would be modelling for its own sake.
 */
export const COMPONENT_KINDS = ['anatomy', 'appendage', 'mechanism', 'structure', 'tile'] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/**
 * One line of the inventory, and how many components that line is worth.
 *
 * `count` is carried rather than parsed back out of `text`: an entry reading "Wall top corners ×4"
 * is one line and four components, and reading the words to work that out is exactly the arithmetic
 * that used to be done twice and disagree.
 */
export interface ComponentEntry {
  readonly text: string;
  readonly count: number;
  readonly kind: ComponentKind;
}

/** A headed run of entries — the inventory's own structure, as section 4 renders it. */
export interface ComponentGroup {
  /** `null` renders the entries as a plain bullet list with no sub-heading above them. */
  readonly heading: string | null;
  /** Prose before the bullets, where the group needs framing rather than just listing. */
  readonly intro?: string;
  readonly entries: readonly ComponentEntry[];
  /** Prose after the bullets — a constraint that applies to the group as a whole. */
  readonly outro?: string;
}

/**
 * Everything one (category, sheet-mode) pairing asks for: the components, and what they must
 * assemble into.
 *
 * The assembly sentence lives here rather than in a table of its own because it is the same
 * decision as the inventory — a set of floor and wall tiles assembles into a floor field, and a set
 * of limb segments assembles into a stride. Splitting them across two `Record`s keyed by different
 * things is how one of them came to describe a tileset while the other described a character.
 */
export interface SheetPlan {
  readonly groups: readonly ComponentGroup[];
  /** Completes "The component set must assemble cleanly into: …". */
  readonly assembly: string;
}
