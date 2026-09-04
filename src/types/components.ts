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
 *
 * **`frame` is the one kind that classifies a position in *time* rather than a piece of the
 * subject**, and it earns its place by the same test as the rest: excluding it from the other six
 * categories catches a real misfiling, because a sequence of frames filed under OBJECT would be
 * sitting in a plan whose every other entry is a part that coexists with the rest. It runs the other
 * way too, and that is the half that matters more — EFFECT admits *nothing else*, so a part
 * breakdown that drifts onto an effect sheet fails the check rather than shipping an explosion with
 * a hatch and a footing.
 */
import type { Direction } from './rendering.ts';

export const COMPONENT_KINDS = ['anatomy', 'appendage', 'mechanism', 'structure', 'tile', 'frame'] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/**
 * One line of the inventory, and how many components that line is worth.
 *
 * `count` is carried rather than parsed back out of `text`: an entry reading "Wall top corners ×4"
 * is one line and four components, and reading the words to work that out is exactly the arithmetic
 * that used to be done twice and disagree.
 */
export interface ComponentEntry {
  /**
   * What this line's components are called outside the prompt — `heads`, `left-arm`, `wall-top`.
   *
   * `text` is written for the generator and reads as prose; this is written for a *file*, and the
   * two cannot be one field. The sprite manifest names each cut-out sprite from the entry it belongs
   * to, and an identifier derived by slugging the prose would be at the mercy of its wording:
   * `the-same-eight-variants-as-the` is what "The same eight variants as the left arm, redrawn for
   * the right side" comes to, and rewording the sentence would silently rename the file.
   *
   * Lower-case, hyphen-separated and unique within its plan — `sheetPlans.test.ts` holds all three.
   * Where an entry is worth more than one component, `componentSlots` takes the names from {@link
   * ComponentEntry.parts}, or suffixes this with the facing or the ordinal where the line has none —
   * so this names the line rather than any one component of it.
   */
  readonly label: string;
  /**
   * What each of this line's components is called, one name per component, in reading order.
   *
   * `label` names the *line*; this names the *components*, and the two are different things wherever
   * a line is worth more than one component whose parts are told apart by what they are rather than
   * by where they sit. Without it `componentSlots` had nothing to suffix a label with but an ordinal,
   * so a fifteen-piece character rig cut into a sprite pack arrived as `04-left-arm-1.png` through
   * `06-left-arm-3.png` — three files whose names carry nothing the index beside them does not
   * already say, while the sheet's own inventory calls them the upper arm, the lower arm and the
   * hand. An engine importer keys a piece by its slot, so every one of them had to be renamed by
   * hand against a table held somewhere else.
   *
   * **Absent is the honest answer for a genuine ×N line**, and that is the distinction to hold: the
   * blend set's `Base material tile ×6: the primary, and five variants differing only in surface
   * scatter` has no name to give its second variant that its third does not equally answer to, and
   * an ordinal is what such a component is actually called. The test is whether the parts are
   * *distinguishable by name*, never whether there are several of them — so a named part that itself
   * comes in ×N copies takes an ordinal inside its own name (`mounting-bracket-1`), which says both
   * halves.
   *
   * **It is authored rather than parsed back out of `text`.** Reading the names from the prose is
   * exactly the parse the `label` field exists to avoid: `Fittings: handle ×1, latch or catch ×1,
   * mounting bracket ×2` is one sentence and four components, and rewording it would silently rename
   * four files. It also may not *invent* a name the prose does not fix — the blend set's four outer
   * corner transitions are drawn "once per corner" with no corner named, so naming them here would
   * have the manifest assert an order the prompt never asked for.
   *
   * Each name is lower-case and hyphen-separated like `label`, the list is exactly `count` long, and
   * no two components of one plan answer to the same name — `sheetPlans.test.ts` holds all three.
   */
  readonly parts?: readonly string[];
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
 * Which facings one sheet draws.
 *
 * A **facing tuple** is a sheet whose components are *views*: the directional core draws one head at
 * each of exactly these yaws, and its inventory names them entry by entry. The tuple is written by
 * the series builder from the direction set the user actually chose, which is what makes the
 * Directions control steer the sheet rather than being discarded — and it is a tuple rather than a
 * set name because one series can carry a *part* of a set: an eight-compass core is two sheets, the
 * cardinals and then the diagonals, and a set name cannot say which half a sheet holds.
 *
 * `'run'` is a sheet drawn to **one facing per generation**: the chosen direction set is a run list,
 * `primaryDirection` says which run this is, and the batch holds one copy of this sheet per facing.
 * A cut-out rig's pieces, a pose library, a tileset and the articulation variants are all runs —
 * their inventories are written for a single facing, so a set of eight is eight generations, never
 * one sheet asked for eight of everything.
 *
 * It sits on the sheet rather than beside the mode because one series holds both kinds: the
 * character's directional pairing is a multi-view core followed by a run-list articulation sheet,
 * and anything keyed on the mode alone has no way to answer for both.
 */
export type SheetFacings = 'run' | readonly [Direction, ...Direction[]];

/**
 * What a size stated for a sheet is a size **of**.
 *
 * The studio's `spriteTargetSize` is one free-text box and it names two different quantities. On a
 * sheet whose components are whole deliverable units — a tile, an icon cell, a glyph, a frame, a
 * façade bay, a parallax band — the size the reader types is one of those components, and the
 * shipped presets say so in the value: `32 × 32 px per tile`, `16 × 16 px per badge`,
 * `96 × 128 px per bay`. On a sheet whose components are the parts one subject is cut into, it is
 * the subject those parts assemble into, and the presets say that too: `48 × 96 px assembled`,
 * `32 × 48 px per figure`, `64 × 64 px per icon cell` on an ITEM part library whose entries are a
 * grip, a shaft and a working end. Every preset in the library falls on one side or the other, and
 * none contradicts its own sheet.
 *
 * **The test is whether the whole has one definite size**, not whether the entries are called parts.
 * A nine-slice set is cut into corners, edges and a centre and it is still `COMPONENT`, because what
 * they assemble into is "a panel at any width and height" — there is no assembled size to state. A
 * tile field, a façade of repeated bays and a parallax band are indefinite for the same reason. A
 * character, a creature, an object, a vehicle and an item each have one, so their part libraries,
 * their directional views and their rigs all state it.
 *
 * **It is declared per sheet rather than derived from {@link ComponentKind}**, which cannot answer
 * it: `structure` covers an OBJECT housing, which is a part, and a BUILDING façade bay, which is a
 * unit its own preset prices individually. Nor is it a property of the category or the sheet mode —
 * `SINGLE_DIRECTION_POSE_LIBRARY` draws a head, a torso and limb variants for a CHARACTER and whole
 * glyphs for a FONT, which is the pairing that made the field mean two things in the first place.
 *
 * `utils/componentTargetSize.ts` is the seam every reader comes through, and it reads this.
 */
export type TargetQuantity = 'COMPONENT' | 'ASSEMBLED';

/**
 * In what position this sheet's inventory draws each part that moves.
 *
 * **The statement that relates a plan's entries to the rig section beside them.** `rigMode` decides
 * whether section 5 asks for a cut-out rig, and a cut-out rig's first rule is that every piece is
 * drawn in its neutral rest orientation, straight along its own long axis and never pre-bent. A pose
 * library, an articulation sheet and a part library each ask for the opposite in section 4 — `Upper
 * arms: neutral lowered, forward-diagonal, raised`, `Access panel, lid or hatch: closed, part-open,
 * fully open`, `Turret, weapon or working mount: stowed, traversed, elevated` — and nothing related
 * the two, so the pairing compiled: section 4 requiring the orientations, section 5 forbidding them,
 * and section 9 auditing for "straight and unposed". One prompt disagreeing with itself, which the
 * generator then resolves however it likes.
 *
 * It is a property of the *sheet* and not of the mode, which is why it could not be another row of
 * the rig table `rigModes.ts` used to key on `DirectionalMode`: a CHARACTER on
 * `CORE_DIRECTIONAL_VARIANTS` draws a trunk at each chosen yaw on its first sheet and thirty-four
 * limb variants on its last, so one mode holds both answers.
 *
 * **Its reader asks the question of a whole series**, though, because a pairing is one deliverable
 * whose sheets assemble together — `resolveRigMode` argues that, and it is why the character
 * pairing above answers as its articulation sheet does rather than sheet by sheet.
 *
 * **It is declared rather than derived**, for the reason {@link ComponentEntry.parts} is: reading
 * the answer out of an entry's prose or its part names would put the plan's rig at the mercy of its
 * wording, and `Feet: flat planted, forward-step/heel-strike, rear-step/toe-off` is three positions
 * of one part where `Floor ×4: one base tile and three low-frequency variants` is four different
 * tiles.
 *
 * **A view is not a position.** The directional plans draw one head at each yaw section 3 lists,
 * which is the camera turning rather than the part, so they answer `'UNSTATED'` — and that is what
 * keeps a cut-out rig's trunk drawable at every facing of a chosen set.
 *
 * The answer is about the inventory alone, so a category that articulates about nothing still gives
 * a truthful one — a BUILDING entrance module is drawn closed and open, and an INTERFACE button body
 * in four states. It changes nothing there: `resolveRigMode` does read it for every category, and
 * the `supportsRigMode` guard beside it is what makes the answer `NONE` regardless, because
 * `CATEGORY_RIG_MODES` has already settled that those sheets carry no rig at all.
 */
export type InventoryPosing =
  /** A part that moves appears once per position or state it takes: the artwork settles the motion. */
  | 'PER_POSITION'
  /** Every part that moves appears once, at rest: a rig settles the motion, and section 5 says how. */
  | 'AT_REST'
  /** No part is drawn twice for a position it takes, so the inventory settles nothing about motion. */
  | 'UNSTATED';

/**
 * One sheet: what it asks for, how many facings it draws, and what its components must assemble into.
 *
 * The assembly sentence lives here rather than in a table of its own because it is the same
 * decision as the inventory — a set of floor and wall tiles assembles into a floor field, and a set
 * of limb segments assembles into a stride. Splitting them across two `Record`s keyed by different
 * things is how one of them came to describe a tileset while the other described a character.
 */
export interface SheetPlan {
  /**
   * What this sheet carries, as the split drawer titles it and the inventory heading names it.
   *
   * Every plan has one, including the single-sheet ones: a run row reading only its facing tells a
   * user working through a rig nothing about what is on it, and a name is the half that does not
   * change between runs.
   */
  readonly name: string;
  readonly facings: SheetFacings;
  readonly groups: readonly ComponentGroup[];
  /** Completes "The component set must assemble cleanly into: …". */
  readonly assembly: string;
  /**
   * Which quantity a target size stated for this sheet names — see {@link TargetQuantity}.
   *
   * It sits beside {@link SheetPlan.assembly} because it is the same fact read a second way: the
   * sentence says what the components assemble into, and this says whether that whole is the thing
   * the reader is pricing. A plan whose assembly names something of no fixed size answers
   * `'COMPONENT'`.
   */
  readonly targetQuantity: TargetQuantity;
  /**
   * In what position this sheet draws each part that moves — see {@link InventoryPosing}.
   *
   * It sits beside {@link SheetPlan.targetQuantity} because it is the same kind of statement: a fact
   * about the inventory that a table outside this directory has to read. `rigModes.ts` is that
   * reader, and what it decides is which rigs the sheet can be asked for.
   */
  readonly posing: InventoryPosing;
}

/**
 * Every sheet one (category, sheet-mode) pairing takes, in the order they are generated.
 *
 * **A pairing is a series because a sheet has a ceiling and a deliverable does not.**
 * `PRACTICAL_COMPONENT_CEILING` is a fact about what one generation returns before it starts merging
 * and dropping pieces, so anything larger has to arrive as more than one image — and until this type
 * existed, the only thing a plan could do when it outgrew a sheet was shrink. That is what pinned
 * the directional core at three views: a CHARACTER at forty-three components had no headroom, and
 * three views is the most a single sheet could hold, which is also the only set of views that cannot
 * reach the camera-facing one.
 *
 * A non-empty tuple, so the first sheet is a `SheetPlan` rather than a `SheetPlan | undefined` —
 * every pairing produces at least one sheet, and a series that produced none would be a plan that
 * asks for nothing.
 */
export type SheetSeries = readonly [SheetPlan, ...SheetPlan[]];
