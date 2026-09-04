import { SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from '../../types/subject.ts';
import { LETTERING_IS_A_COMPONENT } from '../promptText/exclusions.ts';

/**
 * The words that name **lettering**, held against every pool and preset value the twelve categories
 * section 0 bans text on can offer — the check that stops an option asking for what the output
 * contract forbids.
 *
 * **This is the same defect `exclusionElements.ts` catches, one level up.** That table pairs a
 * category's own `exclusions` value against its own attribute fields, and its docblock records that
 * `lettering` was taken *out* of a first draft because no single category both bans it and names it.
 * That reading was correct about the exclusions pools and wrong about the prompt: the ban on
 * lettering is not written in a pool at all. It is in the template, three times — section 0's output
 * contract, section 8's exclusion list and section 9's self-audit — and it is global to every
 * category `LETTERING_IS_A_COMPONENT` is false for, which is all of them but FONT. So the element
 * that could not be paired against a pool has to be paired against the template instead, and this
 * file is that pairing.
 *
 * **Seven options were asking for it when this was reported**, across three `worn_details` pools:
 * unit numbers, serial numbers, a handwritten label, two sets of stencils and two of graffiti.
 * Section 1 stated each one verbatim, section 0 forbade it, and section 8's precedence paragraph
 * resolves the pair against the attribute — so the marking the reader chose could never be drawn,
 * with nothing on screen saying so. `Unit Numbers & Roundels` opened VEHICLE's markings pool, which
 * made it the studio's own default subject as well as one of the six values a shipped preset pinned.
 *
 * **The sweep found two more the report had not**, which is the argument for deriving the collision
 * set rather than listing it: BUILDING's `Chalked Prices & Notices` and OBJECT's
 * `Stencilled Cargo Panel`, the second of them in the same file as one of the seven and in a
 * different field. Nine options, three of the sixteen fields, five categories — and the pools are
 * written per category with no reference to the ban, so rewording the ones somebody has noticed
 * connects nothing. Every option of every field the prompt draws from is swept, and a new one naming
 * lettering fails here until it is either reworded or argued into the carve-outs below.
 *
 * **What is deliberately not lettering, and why each one is not.** The line being drawn is between
 * *writing* and a *mark*, because only the first is what section 0 forbids:
 *
 * - **A sign, a banner and a notice board are objects.** BUILDING offers `Swinging Inn Sign &
 *   Porch`, `Overhanging Neon Signage & Pipes`, `Neon Holographic Banner`, `Holographic Vending
 *   Sign` and `Hanging Sign Bracket & Lamp`, OBJECT offers `Signpost & Notice Board`, and every one
 *   of them is a physical fitting that can be drawn blank. BUILDING's own exclusions pool offers
 *   `No signage lettering or shop name`, which is the same distinction written from the other side.
 *   It is why neither `sign` nor `notice` is a term here, and why `Chalked Prices & Notices` was
 *   reworded to the board rather than caught by the second half of its own name: `price` is a
 *   written number and is a term, and the notices beside it were a fitting the option could keep.
 * - **A barcode is a bar pattern**, drawable without the numerals normally set under it, so it
 *   stands where the signage does. PORTRAIT's `Barcode Brand On The Neck` and ITEM's
 *   `Factory Barcode & Batch Marks` both rest on that.
 * - **A rune, a sigil and a glyph are ornament.** ICON's `Focal Motif` field offers
 *   `Rune & Sigil Carving` under a tooltip naming “a drawn motif, never a letter or a numeral”, and
 *   INTERFACE's `Focal Glyph` field offers `No Glyph — Blank Face` and the same carving under the
 *   same sentence written about a glyph. EFFECT's `Runic Glyphs & Sigils` is a motif carried inside
 *   the effect's own shape. Reading any of them as writing would fail the sheet on the mark it
 *   exists to draw.
 * - **A tally, a stamp and a brand are marks**, so `Kill Tally Marks`, `Tally Notches & Wear Marks`,
 *   `Maker’s Stamp & Guild Mark` and `Branded Herd Tags` stay as they are.
 * - **Two of the rewordings land on that line rather than clear of it**, and they are named here
 *   because the wording alone does not argue them. `Apothecary Tag & Wax Seal` replaced
 *   `Handwritten Apothecary Label`, and a tag tied to a bottle is normally written on — it is
 *   admissible on the notice board's ground, as a fitting drawn blank, and the wax seal beside it is
 *   what carries the provenance the option is for. `Spray-Paint Marks & Scratches` replaced
 *   `Graffiti & Scratches`, and it says *marks* rather than *tags* deliberately: a sprayed tag is a
 *   word, where a sprayed mark is a mark.
 *
 * **Field tooltips are not swept, and the three that promised lettering were reworded by hand.** A
 * tooltip is where the app *discusses* the ban — the two focal-mark tooltips above both spell out
 * that section 0 forbids text anywhere on the sheet — so a sweep over guidance copy would fail on
 * the sentences that state the rule correctly. What a tooltip may not do is promise the control
 * something the contract removes, and that is a claim about meaning rather than about words.
 */
export interface LetteringRequest {
  readonly field: SubjectFieldKey;
  readonly value: string;
  /** The word in `value` that named lettering, so a failure says what it matched on. */
  readonly term: string;
}

/**
 * The words the template's own ban spells, quoted from it.
 *
 * `letteringMarks.test.ts` holds every one of these against the `[IF:LETTERING_IS_A_COMPONENT!=yes]`
 * blocks of `PROMPT_TEMPLATE`, so a term that stops appearing in the ban has had the ban reworded —
 * and this list is then enforcing something the prompt no longer says.
 */
export const BAN_WORDS: readonly string[] = [
  'text',
  'label',
  'number',
  'caption',
  'watermark',
  'signature',
  'legend',
];

/**
 * The words the pools used for lettering that the ban does not spell.
 *
 * The ban is written in the vocabulary of annotation — a caption, a watermark, a legend — and the
 * pools were written in the vocabulary of livery, so most of the collisions share no word with the
 * sentence forbidding them. `BAN_WORDS` alone would have found three of the nine: the two spelling
 * `Numbers` and the one spelling `Label`.
 *
 * These cannot be guarded the way `BAN_WORDS` are, because the ban does not spell them. What holds
 * them instead is that each is a word *this app* writes when it means lettering: four are spelled by
 * the exclusions pools that ban it a second time — `No text or letters`, `No lettering, numerals or
 * captions`, `No word, phrase or specimen line set from the glyphs` — and five by the options this
 * change retired, which the suite keeps as `RETIRED_MARKING_OPTIONS` and asserts are still caught. A
 * synonym answering to neither is vocabulary invented rather than collected, and the suite fails it.
 */
export const MARKING_SYNONYMS: readonly string[] = [
  'lettering',
  'letter',
  'word',
  'numeral',
  'serial',
  'stencil',
  'graffiti',
  'handwritten',
  'price',
];

/** Every word this check reads as lettering. */
const LETTERING_TERMS: readonly string[] = [...BAN_WORDS, ...MARKING_SYNONYMS];

/**
 * The endings a term is matched through, and why this does not use `mentionsTerm`.
 *
 * That matcher forgives a trailing `s` and nothing else, which its own docblock states as a
 * deliberate property: the terms in `EXCLUDED_ELEMENTS` are bare nouns picked to survive it, and
 * `holster` and `holstered` are listed separately for exactly that reason. The words here are not
 * like that. A pool writes a marking as a participle far more readily than as a noun, and
 * `Stencilled Cargo Panel` is the proof — a live OBJECT option, in the same file as one of the seven
 * reported ones, that a trailing-`s` match cannot see. Listing the inflections one by one is the
 * hand-kept list this check exists to avoid, so the endings are matched instead.
 *
 * **The set is bounded rather than open**, because a stem match would be worse than useless here:
 * `text` opens `Texture`, which BACKGROUND and EFFECT both offer as a surface, and `legend` opens
 * `Legendary`, which is an ICON rarity. Neither `ure` nor `ary` is in this set, and neither word is
 * reachable from any other term — the suite asserts both, because they are the two false positives
 * that would make the check unusable.
 */
const TERM_ENDINGS = String.raw`(?:s|es|ed|d|ing|led|ling|ised|ized)?`;

/**
 * Whether `text` uses `term` as a whole word, through any ending `TERM_ENDINGS` allows.
 *
 * The escape is `mentionsTerm`'s, kept for its reason rather than its effect: every word in the two
 * lists above is alphabetic today, and one carrying a `.` or a `-` would otherwise quietly match
 * something else.
 */
export function namesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

  return new RegExp(String.raw`\b` + escaped + TERM_ENDINGS + String.raw`\b`, 'iu').test(text);
}

/** The word in `text` that names lettering, or `undefined` where none does. */
export function letteringTermIn(text: string): string | undefined {
  return LETTERING_TERMS.find((term) => namesTerm(text, term));
}

/**
 * The fields a lettering request is not read from, and why each one is not one.
 *
 * `exclusions` is the ban itself, and ten of the thirteen pools spell the ban's own words in it —
 * `No text or letters`, `No lettering, numerals or captions` — so reading it would fail those
 * categories on their own prohibition. The two colour fields name *hues*, and the pools name hues
 * after the things they were sampled from.
 *
 * **`role` is read here, where `NON_DEPICTIVE_FIELDS` does not read it**, and the difference is what
 * that carve-out is for. Section 1's closing sentence disclaims one thing — “Do not infer props,
 * weapons or equipment from the role: if it is not listed above, it does not exist” — and nothing in
 * the template tells a generator not to infer *lettering* from a role. BACKGROUND offers
 * `Credits & End Card` and `Title & Menu Backdrop`, and INTERFACE offers `Quest & Objective Log`;
 * none of the three names lettering today, but a role that did would reach section 1 unopposed.
 */
export const FIELDS_NOT_READ: readonly SubjectFieldKey[] = [
  'exclusions',
  'primary_colours',
  'accent_colours',
];

/**
 * Every field of this subject that asks for the lettering `category`'s section 0 forbids.
 *
 * Empty is the answer for every configuration the app ships. It is also FONT's answer
 * unconditionally, because lettering is that sheet's inventory — its contract says so in place of
 * banning it, which is what `LETTERING_IS_A_COMPONENT` records.
 */
export function letteringAskedFor(
  category: SubjectCategory,
  subject: SubjectDefinition,
): readonly LetteringRequest[] {
  if (LETTERING_IS_A_COMPONENT[category]) return [];

  const found: LetteringRequest[] = [];

  for (const field of SUBJECT_FIELD_KEYS) {
    if (FIELDS_NOT_READ.includes(field)) continue;

    const value = subject[field];
    const term = letteringTermIn(value);
    if (term !== undefined) found.push({ field, value, term });
  }

  return found;
}
