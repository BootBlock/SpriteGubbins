import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber } from '../../utils/numberWords.ts';
import { PORTRAIT_FEELINGS } from './portraitFeelings.ts';

/**
 * What a layered PORTRAIT sheet asks for: the head drawn once, and the pieces an expression is
 * built from.
 *
 * **The base this answers, and why it needed one** (issue #292). `Portrait Assembly Base` offered
 * nine layered cuts against one sheet of twelve whole portraits, so section 1 told the generator the
 * set shares a head and swaps its features while section 4 ordered twelve complete drawings — the
 * §1-says-one-thing/§4-orders-another contradiction the per-category records exist to remove.
 * `sheetPlans/portrait.ts` used to argue that no plan could be a function of the subject; #281
 * reversed that and #283 built the table, so the cut is drawn here instead of denied.
 *
 * **One layered cut, where the pool offered nine.** Seven of them cut the same way and differed only
 * in *which* pieces swap over the shared head — mouths alone, eyes and mouths, optics, headwear,
 * damage, an emissive pass — which is a difference in what the pieces depict rather than in how the
 * set comes apart, and the subject's own *Facial Features & Hair*, *Marks & Adornment* and *Extra
 * Expressions* fields already carry it. The other two were different shapes again, and no sheet drew
 * either: `Shared Body With Swappable Heads` swaps the head rather than what is on it, and `Single
 * Portrait With Damage Stages` is not a layered cut at all. So the pool names the cut once, and this
 * plan draws the brows, the eyes and the mouth every layered dialogue set is built from.
 *
 * **The head is drawn with those three regions clear**, which is the whole difference between this
 * sheet and the expression library. A head carrying a neutral brow would have every swapped piece
 * laid over a feature already there, and a dialogue system compositing that gets two mouths. So the
 * head is the part of the portrait no feeling moves — the bone structure, the hair, the marks, the
 * garments at the shoulders — and the pieces below are everything that does.
 *
 * **It is the same person, and that is still the failure to check for.** The expression library's
 * outro says twelve competent portraits of twelve people is what it comes back as; this sheet's is
 * a head and a set of pieces drawn to three different faces, which is worse, because the pieces
 * only ever appear on that one head.
 */

/** The head every piece below is registered against. */
const SHARED_HEAD_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'shared-head',
    text: 'Shared head ×1 — the whole portrait at rest, with the brow, eye and mouth regions left clear for the pieces below',
    count: 1,
    kind: 'anatomy',
  },
];

/**
 * The pieces that swap over that head.
 *
 * Hoisted because the group's own outro counts the expressions they reach, and that figure is the
 * product of the three runs rather than a number written beside them: a brow, an eye or a mouth
 * added or dropped moves it, and the sentence it appears in is the argument for cutting the set
 * this way at all.
 */
const BROW_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'brows',
    parts: [
      'brows-level',
      'brows-raised',
      'brows-drawn-down',
      'brows-one-raised',
      'brows-furrowed',
      'brows-pinched',
    ],
    text: 'Brows ×6: level, both raised, drawn down, one raised, furrowed inward, pinched upward at the inner ends',
    count: 6,
    kind: 'anatomy',
  },
];

const EYE_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'eyes',
    parts: ['eyes-open-level', 'eyes-widened', 'eyes-narrowed', 'eyes-closed', 'eyes-downcast', 'eyes-aside'],
    text: 'Eyes ×6: open and level, widened, narrowed, closed, downcast, turned aside',
    count: 6,
    kind: 'anatomy',
  },
];

const MOUTH_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'mouths',
    parts: [
      'mouth-closed-level',
      'mouth-smiling',
      'mouth-open-laughing',
      'mouth-open-shouting',
      'mouth-downturned',
      'mouth-pressed-flat',
      'mouth-bared-teeth',
      'mouth-parted-uncertain',
    ],
    text: 'Mouths ×8: closed and level, smiling, open and laughing, open and shouting, downturned, pressed flat, bared teeth, parted and uncertain',
    count: 8,
    kind: 'anatomy',
  },
];

const FEATURE_ENTRIES: readonly ComponentEntry[] = [...BROW_ENTRIES, ...EYE_ENTRIES, ...MOUTH_ENTRIES];

/** How many faces the three runs reach between them, which is this sheet's argument for existing. */
const EXPRESSIONS_REACHED =
  componentTotal(BROW_ENTRIES) * componentTotal(EYE_ENTRIES) * componentTotal(MOUTH_ENTRIES);

/**
 * The faces the pieces have to reach, named in the outro's own sentence.
 *
 * Read from `portraitFeelings.ts` rather than written out, because the expression library draws one
 * portrait per feeling from that same list: a feeling added to one sheet and not the other would have
 * the two sheets of one deliverable disagree about what a dialogue system gets.
 */
const FEELINGS_REACHED = PORTRAIT_FEELINGS.map(({ face }, index) =>
  index === PORTRAIT_FEELINGS.length - 1 ? `and ${face}` : `${face},`,
).join(' ');

export const PORTRAIT_FEATURE_CUT: SheetPlan = {
  name: 'Feature cut',
  facings: 'run',
  assembly:
    'one head and the features a conversation moves, composited at runtime — every piece drawn to the same crop and the same registration as the head, so any brow, any eye and any mouth can be laid on it together without the face shifting on the screen.',
  targetQuantity: 'COMPONENT',
  extent: 'PIECE',
  // A brow, an eye and a mouth each appear once per shape the feeling puts them in.
  posing: 'PER_POSITION',
  // The one PORTRAIT sheet that holds a genuine pair: a mouth piece has to fit the space the head
  // left for it, and a piece drawn larger than that space is the failure this example names.
  scaleExample: 'a mouth piece drawn beside the head it lays on is in proportion to it',
  // The expression library's unit, and for its reason: the crop is the reader's, and the head is one
  // portrait at whatever crop they asked for.
  scaleUnit: 'one portrait',
  componentClass: 'the head of this one person, or a feature piece that lays on it',
  // The assembled face rather than the roster: a layered cut comes back as the head wearing its
  // pieces, which looks like a finished portrait and cannot be composited at all.
  assemblyFailure: {
    instruction:
      'Do not draw the head wearing any of the feature pieces, or the pieces assembled into a finished face, anywhere on the sheet, including as a reference or key.',
    exclusion:
      'The head drawn with brows, eyes or a mouth in place, and any finished expression assembled from the pieces.',
    audit: 'nothing on the sheet is the head drawn with a brow, an eye or a mouth already on it',
  },
  groups: [
    {
      heading: 'The shared head',
      intro: `Everything about this person no feeling moves, drawn once. The bone structure, the hair, the marks on
the skin and the garments at the shoulders all live here, and the three regions the pieces below
occupy are left clear rather than drawn at rest:`,
      entries: SHARED_HEAD_ENTRIES,
    },
    {
      heading: 'Feature pieces',
      intro: `The ${spellNumber(componentTotal(FEATURE_ENTRIES))} pieces that swap over that head, each drawn alone and clear of it. Every one is
registered to the same point as the head, so a piece laid on it lands where the head left room:`,
      entries: FEATURE_ENTRIES,
      // Its own statement of where each entry ends, because section 4's generic one forbids "the whole
      // subject with the other parts faded, cropped or hidden" — and the head is the whole portrait with
      // the three feature regions left clear, as its entry says. The pieces are laid over the head
      // rather than joined to it, so there is no join for a generic rule to name.
      ends: `The head and every piece are drawn apart and never joined. The head is the one entry drawn as the
whole portrait, and it stops short of the three features: where a brow, the eyes or the mouth would
sit, it shows the bare face the pieces are laid over. Each piece is its feature alone — no hair,
outline or surrounding face of the head drawn around it, and no other feature beside it — so a brow
drawn with the eyes below it, or a mouth drawn with the chin, is two components merged into one and
cannot be laid on the head.`,
      outro: `Each piece is drawn to the head above and to no other face: the skin tone, the outline weight and the
light all match it, so a brow and a mouth laid on together read as one person rather than as two
drawings meeting. Any brow goes with any eye and any mouth, which is what makes ${String(EXPRESSIONS_REACHED)} faces out
of ${spellNumber(componentTotal(FEATURE_ENTRIES))} pieces and is the reason to cut the set this way. Between them they reach ${FEELINGS_REACHED} — a cut that
cannot reach one of those has drawn the wrong pieces.`,
    },
  ],
};
