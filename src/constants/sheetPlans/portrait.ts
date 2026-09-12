import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumberCapitalised } from '../../utils/numberWords.ts';

/**
 * What a PORTRAIT sheet asks for.
 *
 * **One mode, and the other three are declined for three different reasons.**
 * `CORE_DIRECTIONAL_VARIANTS` draws one subject at several object yaws, and a portrait's turn is the
 * sitter's own pose inside a fixed frame rather than a camera the sheet is generated at — asking for
 * five yaws of a bust returns five portraits of five different framings, none of which can be
 * swapped for another in a dialogue box. `CUTOUT_RIG_SINGLE_DIRECTION` asks for rest-pose segments
 * carrying matched pivot caps at the joints they rotate about, and nothing on a face rotates about a
 * pivot: a mouth is replaced, not swung. `TILESET_MODULAR` asks for pieces that butt against copies
 * of themselves, which a head does not do.
 *
 * **The axis that earns a sheet here is expression**, exactly as interaction state is INTERFACE's
 * and time is EFFECT's. That is what makes a portrait set worth generating in one pass rather than
 * twelve: every expression has to be the same person, and a generator drawing them one at a time
 * produces twelve people who resemble each other.
 *
 * **The inventory is whole portraits and not feature pieces, for every base this category offers
 * today.** `Portrait Assembly Base` in section 1 offers layered cuts — a shared head with swappable
 * brows, eyes and mouths — and PORTRAIT declares no base in `assemblyBases.ts`, so the field reaches
 * section 1 verbatim and the entries below stay the twelve drawings every portrait deliverable wants.
 * This used to be argued as a principle, that no plan in this directory was a function of the subject;
 * issue #281 reversed that, and whether a layered cut should draw its own pieces is issue #292's to
 * decide. Until then, a reader who needs the pieces themselves asks for them through `Extra
 * Expressions` — `Speaking Mouth Shapes ×4` is one of its pooled values, and it lands in section 4
 * counted and slotted like any other component.
 *
 * **The outro is the whole sheet's contract**, and it is this category's version of the one
 * `INTERFACE_STATE_LIBRARY` carries: a state of a widget is that widget changed rather than a second
 * design of it, and an expression is that same face changed rather than a second person. It is worth
 * stating in as many words because it is the failure this sheet actually has — twelve competent
 * portraits that are not of one character.
 */

/**
 * The expressions, one drawing each.
 *
 * Hoisted because the group's own outro counts them, and the sentence it counts them in is this
 * sheet's contract: “twelve competent portraits that are not recognisably one character is the
 * failure this sheet has”. An expression added or dropped would have left that figure describing a
 * set nobody asked for, in the one sentence a reader is told to check the delivery against.
 */
const EXPRESSION_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'resting-portrait',
    text: 'Resting portrait ×1 — neutral, level gaze, the reference for every expression below',
    count: 1,
    kind: 'anatomy',
  },
  { label: 'pleased', text: 'Pleased or smiling ×1', count: 1, kind: 'anatomy' },
  { label: 'laughing', text: 'Laughing or delighted ×1', count: 1, kind: 'anatomy' },
  { label: 'angry', text: 'Angry ×1', count: 1, kind: 'anatomy' },
  { label: 'sad', text: 'Sad or downcast ×1', count: 1, kind: 'anatomy' },
  { label: 'surprised', text: 'Surprised ×1', count: 1, kind: 'anatomy' },
  { label: 'afraid', text: 'Afraid ×1', count: 1, kind: 'anatomy' },
  { label: 'disgusted', text: 'Disgusted ×1', count: 1, kind: 'anatomy' },
  { label: 'thoughtful', text: 'Thoughtful or uncertain ×1', count: 1, kind: 'anatomy' },
  { label: 'determined', text: 'Determined or resolved ×1', count: 1, kind: 'anatomy' },
  { label: 'hurt', text: 'Hurt or exhausted ×1', count: 1, kind: 'anatomy' },
  { label: 'suspicious', text: 'Suspicious or narrowed ×1', count: 1, kind: 'anatomy' },
];

export const PORTRAIT_EXPRESSION_LIBRARY: SheetPlan = {
  name: 'Expression set',
  facings: 'run',
  assembly:
    'the same person in every mood a conversation needs — at rest, pleased, angry, hurt, afraid — each drawn to the same crop and the same registration, so any one of them can replace any other in a dialogue box without the head shifting on the screen.',
  targetQuantity: 'COMPONENT',
  // One face, drawn once for each expression it wears.
  posing: 'PER_POSITION',
  // EFFECT's shape rather than a pair of pieces, and for EFFECT's reason: this sheet's components
  // are one subject drawn repeatedly rather than the parts of one, so there is no pair of pieces to
  // be in proportion to each other. What has to hold instead is that the repeats agree.
  scaleExample: 'the resting portrait and the expression beside it are the same head drawn at the same scale',
  // Deliberately not "a bust": the crop is the reader's, from `Framing & Crop` — head and shoulders,
  // bust to upper chest, or half body — so a unit naming one of those values prices the sheet against
  // a crop the subject may not have asked for.
  scaleUnit: 'one portrait',
  // “One expression of this one person” rather than “portrait anatomy”, because the failure this sheet
  // actually has is twelve competent portraits of twelve different people — which “anatomy” would not
  // name at all.
  componentClass: 'one expression of this one person’s portrait',
  // The expressions-blended-into-one half is stated here and not in `CATEGORY_ASSEMBLY.PORTRAIT`'s
  // terms, for the reason TERRAIN's tiles-already-laid half is: a term naming it would have to name the
  // expressions, and negating those negates the subject. A whole clause can hold it because "merged
  // into one face" is a relation between drawings rather than a word standing in for one.
  assemblyFailure: {
    instruction:
      'Do not draw the portraits arranged into a conversation, a roster or a single merged face anywhere on the sheet, including as a reference or key.',
    exclusion:
      'The portraits arranged into a dialogue scene, a party roster or a character sheet, and any two of them blended into one face.',
    audit: 'nothing on the sheet is a conversation, a roster, or two expressions merged into one drawing',
  },
  groups: [
    {
      heading: null,
      intro: `One person, drawn once for each expression. The first is the resting portrait every other is
measured against, so it is drawn first and the rest are drawn as departures from it:`,
      entries: EXPRESSION_ENTRIES,
      outro: `Every expression is that same person changed, never a second design of them: the bone structure, the
hair, the marks on the skin, the garments at the shoulders and the position of the head all hold
across the set, and only what the feeling itself moves — the brows, the eyes, the mouth, the set of
the jaw — is redrawn. The crop is identical in every one, measured from the top of the head, so the
eyes fall at the same height on every drawing and a portrait swapped in at runtime does not jump.
${spellNumberCapitalised(componentTotal(EXPRESSION_ENTRIES))} competent portraits that are not recognisably one character is the failure this sheet has, and
it is the one to check for before delivering.`,
    },
  ],
};
