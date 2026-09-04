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
 * **The inventory is whole portraits and not feature pieces, and that is a deliberate answer rather
 * than an omission.** `Portrait Assembly Base` in section 1 offers layered cuts — a shared head with
 * swappable brows, eyes and mouths — and a sheet that reshaped its inventory around that field would
 * be the only plan in this directory to be a function of the subject rather than of the category and
 * the mode. What the field does instead is reach section 1 verbatim, where it tells the generator how
 * the set is meant to come apart, while the entries below stay the twelve drawings every portrait
 * deliverable wants. A reader who needs the pieces themselves asks for them through `Extra
 * Expressions`, which is the field that exists for exactly that — `Speaking Mouth Shapes ×4` is one
 * of its pooled values, and it lands in section 4 counted and slotted like any other component.
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
  scaleUnitFrame: 'CELL',
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
