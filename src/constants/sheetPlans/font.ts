import type { ComponentEntry, SheetPlan } from '../../types/components.ts';

/**
 * What a FONT sheet asks for — the printable ASCII set, across four sheets.
 *
 * **It is a series because the character set does not fit a generation, not because it has parts.**
 * Printable ASCII is 95 codepoints; one of them is the space, which is drawn as nothing, so 94
 * glyphs have to be delivered and `PRACTICAL_COMPONENT_CEILING` is 43. That is the arithmetic
 * `SheetSeries` exists for. The split is along the boundaries an engine and a reader both already
 * recognise — capitals, lower case, digits with the punctuation a sentence needs, and the remaining
 * symbols — rather than at whatever position 43 falls on, because a sheet that stops in the middle of
 * the alphabet is a sheet nobody can check by eye.
 *
 * **One mode, and the other three are declined.** A glyph is a flat mark on a baseline: it has no
 * yaw, so `CORE_DIRECTIONAL_VARIANTS` would return five drawings of one letter and none of them
 * usable; it has no joints, so `CUTOUT_RIG_SINGLE_DIRECTION` has nothing to cap; and a glyph never
 * butts against a copy of itself, so `TILESET_MODULAR` describes the opposite of what a font sheet
 * is — the cells sit apart with clear margin, and the engine decides the spacing at runtime.
 *
 * **The axis that earns a sheet here is agreement between the glyphs.** A single letter is not a
 * deliverable; the set is, and the only reason to generate one in a pass is that what holds a font
 * together is every glyph sharing one baseline, one cap height, one x-height and one stroke weight.
 * A generator asked for twenty-six letters one at a time returns twenty-six competent letters from
 * twenty-six different fonts, which is this sheet's characteristic failure and what each outro is
 * written against.
 *
 * **Every sheet after the first states the metrics again rather than citing the first.** Each is
 * generated from its own copy of the specification, so a lower-case sheet has no access to the
 * capitals it has to sit beside — and the failure that follows is silent, because both sheets look
 * correct alone and only disagree once text is set from them.
 *
 * **What the lower-case sheet states about those metrics it *defers*, and that is not fussiness.**
 * The series is fixed while `Vertical Metrics` is the reader's, so a plan asserting an x-height, an
 * ascender and a descender requires what several legitimate values of that field withhold —
 * `No Descenders, Flat Baseline` most plainly. Section 4 may not require what section 1 declines to
 * state, so this sheet asks for agreement with whatever section 1 fixed rather than naming the three
 * measurements itself. `categories/font.ts` carries the constraint's other half, on the pool.
 *
 * **A letter or a digit is shown; a punctuation mark is named and given its codepoint.** Shown alone
 * in a bullet, `-` and `~` read as list syntax rather than as the subject, and the two quotation
 * marks cannot be written into this repository's source at all — CLAUDE.md asks every authored string
 * for typographic marks, and the straight forms are exactly what this sheet has to draw. The Unicode
 * name and codepoint say which character without ambiguity, and they are what a `.fnt` or a JSON
 * atlas maps onto a cell anyway.
 */

/** One glyph, as an inventory entry drawing it once. */
function glyph(label: string, text: string): ComponentEntry {
  return { label, text, count: 1, kind: 'structure' };
}

/** The capitals and lower case, built from the alphabet rather than written out twice. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const CAPITAL_ENTRIES: readonly ComponentEntry[] = ALPHABET.map((letter) =>
  glyph(`capital-${letter.toLowerCase()}`, `Capital ${letter}`),
);

const LOWER_CASE_ENTRIES: readonly ComponentEntry[] = ALPHABET.map((letter) =>
  glyph(`lower-${letter.toLowerCase()}`, `Lower-case ${letter.toLowerCase()}`),
);

const DIGIT_ENTRIES: readonly ComponentEntry[] = '0123456789'
  .split('')
  .map((digit) => glyph(`digit-${digit}`, `Digit ${digit}`));

/** A punctuation mark, named by its Unicode name and pinned by its codepoint. */
function mark(label: string, name: string, codepoint: string): ComponentEntry {
  return glyph(label, `${name} — U+${codepoint}`);
}

/** The eleven marks a sentence is set with, which is why they travel with the digits. */
const SENTENCE_MARK_ENTRIES: readonly ComponentEntry[] = [
  mark('full-stop', 'Full stop', '002E'),
  mark('comma', 'Comma', '002C'),
  mark('colon', 'Colon', '003A'),
  mark('semicolon', 'Semicolon', '003B'),
  mark('exclamation-mark', 'Exclamation mark', '0021'),
  mark('question-mark', 'Question mark', '003F'),
  mark('apostrophe', 'Apostrophe', '0027'),
  mark('quotation-mark', 'Quotation mark', '0022'),
  mark('left-parenthesis', 'Left parenthesis', '0028'),
  mark('right-parenthesis', 'Right parenthesis', '0029'),
  mark('hyphen-minus', 'Hyphen-minus', '002D'),
];

/** Everything printable ASCII holds that the three sheets above do not. */
const SYMBOL_ENTRIES: readonly ComponentEntry[] = [
  mark('number-sign', 'Number sign', '0023'),
  mark('dollar-sign', 'Dollar sign', '0024'),
  mark('percent-sign', 'Percent sign', '0025'),
  mark('ampersand', 'Ampersand', '0026'),
  mark('asterisk', 'Asterisk', '002A'),
  mark('plus-sign', 'Plus sign', '002B'),
  mark('solidus', 'Solidus, the forward slash', '002F'),
  mark('less-than-sign', 'Less-than sign', '003C'),
  mark('equals-sign', 'Equals sign', '003D'),
  mark('greater-than-sign', 'Greater-than sign', '003E'),
  mark('commercial-at', 'Commercial at', '0040'),
  mark('left-square-bracket', 'Left square bracket', '005B'),
  mark('reverse-solidus', 'Reverse solidus, the backslash', '005C'),
  mark('right-square-bracket', 'Right square bracket', '005D'),
  mark('circumflex-accent', 'Circumflex accent', '005E'),
  mark('low-line', 'Low line, the underscore', '005F'),
  mark('grave-accent', 'Grave accent', '0060'),
  mark('left-curly-bracket', 'Left curly bracket', '007B'),
  mark('vertical-line', 'Vertical line, the pipe', '007C'),
  mark('right-curly-bracket', 'Right curly bracket', '007D'),
  mark('tilde', 'Tilde', '007E'),
];

/**
 * The metrics paragraph every sheet carries, because every sheet is generated alone.
 *
 * Written once and read four times rather than restated per plan: four wordings of one rule are four
 * chances for the sheets to be told different things about the baseline they all share, which is the
 * one disagreement a font sheet cannot survive.
 */
const METRICS_RULE = `Every glyph on this sheet stands on one baseline, holds the vertical metrics
stated in section [SEC:SUBJECT], and is drawn at one stroke weight under one light. A glyph heavier,
taller or lit differently from the rest reads as belonging to another font, which is the failure this
sheet has — and it is invisible here, because it only shows up once text is set from the set. This
sheet is one part of a set generated in several passes, so the metrics come from
section [SEC:SUBJECT] rather than from whatever the last sheet happened to do.`;

/**
 * What no glyph sheet may carry, restated per sheet for the reason the metrics are.
 *
 * The components here *are* lettering, which is the one thing section [SEC:CONTRACT] permits on this
 * category's sheet and on no other — so the boundary has to be drawn where the reader is about to
 * list ninety-four letters, rather than left to a section further down.
 */
const ISOLATION_RULE = `Each character above is drawn once, alone, as its own separate component. No
two of them are set side by side as a word, a name, a specimen line or a pangram, and no glyph carries
a caption, a codepoint or a key naming it — a pair of letters drawn touching is two entries merged,
which is the failure the count in section [SEC:CONTRACT] exists to catch.`;

export const FONT_CAPITALS: SheetPlan = {
  name: 'Capitals',
  facings: 'run',
  assembly:
    'a run of set text at any size — every capital sharing one baseline and one cap height, so no letter sits high, low or heavy against the ones beside it, and each cuts out of the sheet as a single character an engine can index by codepoint.',
  targetQuantity: 'COMPONENT',
  // Twenty-six marks on a baseline, each drawn once.
  posing: 'UNSTATED',
  groups: [
    {
      heading: null,
      intro: `The twenty-six Latin capitals, in this order. Each is drawn once, and the set is drawn together
because what makes a font work is the agreement between its letters rather than the quality of any
one of them:`,
      entries: CAPITAL_ENTRIES,
      outro: `${METRICS_RULE}

${ISOLATION_RULE}`,
    },
  ],
};

export const FONT_LOWER_CASE: SheetPlan = {
  name: 'Lower case',
  facings: 'run',
  assembly:
    'a run of set text at any size — every lower-case letter sharing one baseline and one height against it, with any ascender or descender reaching the same distance throughout, and each cutting out of the sheet as a single character an engine can index by codepoint.',
  targetQuantity: 'COMPONENT',
  // Twenty-six marks on a baseline, each drawn once.
  posing: 'UNSTATED',
  groups: [
    {
      heading: null,
      intro: `The twenty-six Latin lower-case letters, in this order. They are drawn to sit beside the capitals of
the same font, so their height against the baseline — and how far any ascender rises or any descender
drops — is what the vertical metrics in section [SEC:SUBJECT] fix, rather than whatever this sheet
arrives at on its own. Where those metrics allow a letter no ascender or no descender, it has none:`,
      entries: LOWER_CASE_ENTRIES,
      outro: `${METRICS_RULE}

${ISOLATION_RULE}`,
    },
  ],
};

export const FONT_DIGITS_AND_PUNCTUATION: SheetPlan = {
  name: 'Digits and sentence punctuation',
  facings: 'run',
  assembly:
    'a run of set text carrying numbers and punctuation — the digits aligning with each other in a column of figures, and each mark sitting at the height against the baseline that its own use asks for.',
  targetQuantity: 'COMPONENT',
  // Digits and marks, each drawn once.
  posing: 'UNSTATED',
  groups: [
    {
      heading: 'Digits',
      intro: `The ten Western Arabic digits, in this order. They are drawn to one width and one height whatever the
rest of the set does, so a column of figures lines up:`,
      entries: DIGIT_ENTRIES,
    },
    {
      heading: 'Sentence punctuation',
      intro: `The eleven marks a sentence is set with. Each sits at the height its use asks for rather than centred in
its cell — a full stop rests on the baseline, a quotation mark hangs from the cap height, and a
hyphen crosses at the middle:`,
      entries: SENTENCE_MARK_ENTRIES,
      outro: `${METRICS_RULE}

${ISOLATION_RULE}`,
    },
  ],
};

export const FONT_SYMBOLS: SheetPlan = {
  name: 'Symbols and operators',
  facings: 'run',
  assembly:
    'the rest of a printable ASCII set — every symbol drawn to the same construction and weight as the letters it will be set among, so none of them reads as borrowed from another font.',
  targetQuantity: 'COMPONENT',
  // Symbols and operators, each drawn once.
  posing: 'UNSTATED',
  groups: [
    {
      heading: null,
      intro: `The twenty-one printable ASCII characters the three sheets before this one do not carry, in this
order. The space at U+0020 is not among them: it is drawn as nothing, and an engine renders it by
advancing rather than by cutting a sprite out:`,
      entries: SYMBOL_ENTRIES,
      outro: `${METRICS_RULE}

${ISOLATION_RULE}`,
    },
  ],
};
