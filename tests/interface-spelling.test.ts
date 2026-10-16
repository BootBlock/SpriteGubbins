import { describe, expect, it } from 'vitest';
import { AUTHORED_SOURCES, authoredStrings, type AuthoredString } from './authoredStrings.ts';

/**
 * Every string the app writes is spelt the British way, and this is where that is held.
 *
 * CLAUDE.md asks user-facing strings and prompt text for British spelling, and nothing checked it.
 * An option pool is shown to the reader and written into the compiled prompt verbatim, so when
 * `Spiked Bone Armor` sat six lines below `Gothic Plate Armour`, choosing one put both spellings of
 * one word into a single prompt. Seventeen such labels had shipped across the category pools and the
 * presets that pin them.
 *
 * The walk is `authoredStrings.ts`, shared with `interface-punctuation.test.ts` and taken for the
 * reason that suite gives: a string is checked because it is written in `src/`, not because somebody
 * remembered to name its file. So the design work is again deciding what to leave out, and each
 * exclusion below is counted only when it hid a word this list flags. A count of zero fails, because
 * an exclusion that stops hiding anything has become a hole.
 */

/**
 * The `-our` words American English writes `-or`, with the endings either spelling adds.
 *
 * The endings are listed rather than open, because an open stem match flags words both spellings
 * share: `laboratory`, `honorary` and `humorous` are British too.
 */
const OUR = String.raw`(?:arb|ard|arm|behavi|cand|clam|col|endeav|fav|ferv|flav|glam|harb|hon|hum|lab|neighb|od|parl|ranc|rum|savi|splend|tum|val|vap|vig)or(?:s|y|ies|ed|ing|ings|ful|fully|less|ite|ites|ist|ists|hood|hoods|able|ably)?`;

/** The `-re` words American English writes `-er`. `meter` is absent: a measuring device is a meter. */
const RE = String.raw`(?:cent|theat|fib|lit|calib|sab|somb|spect|lust|och)er(?:s|ed|ing|piece|pieces|glass)?|meager|maneuver(?:s|ed|ing|able)?`;

/**
 * The words whose final `l` British English doubles before an ending and American English does not.
 * `bevelled` and `labelled` are the ones a sprite tool is likeliest to need.
 */
const DOUBLED_L = String.raw`(?:bevel|cancel|channel|chisel|counsel|dial|duel|enamel|fuel|jewel|label|level|marvel|model|panel|pedal|quarrel|rival|signal|spiral|stencil|swivel|total|travel|tunnel)(?:ed|ing|ings|er|ers)`;

/**
 * Everything else, word by word.
 *
 * Deliberately absent, because British English writes them the same way in some sense: `license`
 * (the verb), `practice` (the noun), `meter`, `program` (software), `tire`, `curb`, `check`, `draft`,
 * `dialog` (an ARIA role) and `analog`, which a hardware name may carry.
 */
const OTHERS = String.raw`defenses?|defenseless|offenses?|pretenses?|gray(?:s|ed|ing|er|est|ish|ness|scale|scales)?|artifacts?|catalog(?:s|ed|ing)?|fulfill(?:s|ment)?|skillful(?:ly)?|willful(?:ly)?|enroll(?:s|ment)?|instills?|distills?|jewelry|aluminum|mold(?:s|ed|ing|y)?|plow(?:s|ed|ing)?|cozy|pajamas|sulfur(?:ous|ic)?|mustaches?|skeptic(?:s|al|ally|ism)?|ax|esthetic(?:s|ally)?|anesthetics?|donuts?|airplanes?|aging`;

/**
 * An `-ize` or `-yze` verb and what is built from it, where British English writes `-ise` and `-yse`.
 *
 * Checked by shape, since the family is open, and the words whose `z` is their root are what the
 * shape must spare: `size` and its compounds, `prize`, `seize`, `capsize`, `maize`, `baize` and
 * `assize`. The compounds of `size` are listed rather than matched as any word ending in it, because
 * `synthesized`, `emphasized` and `fantasized` end in it too, and a suffix match hid the first of
 * those when this suite was written. The stem needs a letter before the `i`, so a bare `ized` in a
 * regex that matches both spellings is not a word.
 */
const IZE = /^[a-z]+[iy]z(?:e|es|ed|ing|ings|ation|ations|er|ers|able)$/i;
const ROOT_Z =
  /^(?:(?:re|over|under|down|up|out|super|mid|king|life|pint|full|bite)?siz|priz|seiz|capsiz|maiz|baiz|assiz)(?:e|es|ed|ing|er|ers|able)$/i;

const AMERICAN = new RegExp(String.raw`^(?:${OUR}|${RE}|${DOUBLED_L}|${OTHERS})$`, 'i');

/** Whether one word is the American form of a word this list knows. */
function isAmerican(word: string): boolean {
  if (AMERICAN.test(word)) return true;
  return IZE.test(word) && !ROOT_Z.test(word);
}

/**
 * A run of text written for a parser, found by its shape within one whitespace-delimited chunk.
 *
 * Each is code a string passes on rather than words it says: an identifier in snake case or camel
 * case (`GAME_BOY_COLOR`, `colorMerge`), a CSS custom property (`--color-tab`), an address — a URL or
 * a module path such as `../constants/colors.ts` — and a Tailwind utility under any variants: the
 * `-center` family and `transition-colors`, which are CSS's own words, and `ease-emphasized`, which
 * is the utility `src/index.css` generates from its `--ease-emphasized` token.
 *
 * The utility is matched by its whole shape rather than by where the string is bound, which is how
 * `interface-punctuation.test.ts` excuses a class string. Class lists are bound to names such as
 * `BUTTON` and `CHROME_ACTION` as often as to a `className`, and a shape that names the property
 * leaves a hyphenated `off-center` in prose to be caught.
 */
const CODE_SHAPES = {
  identifier: /_|[a-z][A-Z]/,
  property: /--[a-z]/i,
  address: /^(?:[a-z][a-z0-9+.-]*:\/\/|\.{0,2}\/)/i,
  utility:
    /^(?:[a-z-]+:)*(?:bg|content|items|justify|justify-items|justify-self|object|origin|place-content|place-items|place-self|self|text)-center$|^(?:[a-z-]+:)*(?:transition-colors|ease-emphasized)$/,
} as const;

/**
 * American forms that are right where they stand, each held to the file it is in.
 *
 * A proper noun is spelt the way its owner spells it, a platform keyword the way the platform reads
 * it, and a model's stock negative term the way its training captions spell it, since the respelt
 * term is a different string to the text encoder and would change what the negative suppresses.
 */
const ALLOWED = [
  {
    why: 'Nintendo’s name for the handheld',
    files: ['src/constants/hardware/nintendo.ts', 'src/constants/palettes/nintendo.ts'],
    phrase: /\bGame Boy Color\b/g,
  },
  {
    why: 'the `type` keyword of an HTML colour input',
    files: ['src/hooks/isTextEntry.ts'],
    phrase: /^color$/g,
  },
  {
    why: 'Stable Diffusion’s stock quality negative',
    files: ['src/utils/modelWrapperText/stableDiffusion.ts'],
    phrase: /\bjpeg artifacts\b/g,
  },
] as const;

type Shape = keyof typeof CODE_SHAPES;

const SHAPES = Object.keys(CODE_SHAPES) as Shape[];
const HIDDEN: Record<Shape, number> = { identifier: 0, property: 0, address: 0, utility: 0 };
const PERMITTED = ALLOWED.map(() => 0);

/** The words of a chunk that the list flags, before any exclusion is applied. */
function flagged(chunk: string): string[] {
  return (chunk.match(/[A-Za-z]+/g) ?? []).filter(isAmerican);
}

/** Every American form one string writes where a reader meets it, as `file:line  word`. */
function offencesIn({ file, line: start, text }: AuthoredString): string[] {
  const offences: string[] = [];
  for (const [offset, raw] of text.split('\n').entries()) {
    let line = raw;
    for (const [index, allowance] of ALLOWED.entries()) {
      if (!(allowance.files as readonly string[]).includes(file)) continue;
      line = line.replace(allowance.phrase, () => {
        PERMITTED[index] = (PERMITTED[index] ?? 0) + 1;
        return ' ';
      });
    }
    for (const chunk of line.split(/\s+/)) {
      const words = flagged(chunk);
      if (words.length === 0) continue;
      const shape = SHAPES.find((candidate) => CODE_SHAPES[candidate].test(chunk));
      if (shape !== undefined) {
        HIDDEN[shape] += words.length;
        continue;
      }
      for (const word of words) offences.push(`${file}:${String(start + offset)}  ${word}  (${raw.trim()})`);
    }
  }
  return offences;
}

// Neither silence the walk reports is honoured here. A class string is held word by word, and its
// utilities are excused by `CODE_SHAPES.utility`. A SQL statement names its columns in snake case,
// which `CODE_SHAPES.identifier` already excuses.
const OFFENCES = AUTHORED_SOURCES.flatMap((path) => authoredStrings(path).flatMap(offencesIn));

describe('the spelling the interface ships with', () => {
  it('knows both spellings of the words it checks', () => {
    const american = [
      'Armor',
      'colors',
      'Defense',
      'centered',
      'gray',
      'Artifact',
      'Synthesized',
      'modeling',
      'analyze',
    ];
    const british = [
      'Armour',
      'colours',
      'Defence',
      'centred',
      'grey',
      'Artefact',
      'Synthesised',
      'modelling',
      'analyse',
    ];
    const shared = [
      'size',
      'oversized',
      'resize',
      'prize',
      'seize',
      'laboratory',
      'honorary',
      'humorous',
      'meter',
      'citizen',
      'catalogue',
    ];
    expect(american.filter((word) => !isAmerican(word))).toEqual([]);
    expect([...british, ...shared].filter(isAmerican)).toEqual([]);
  });

  it.each(SHAPES)('still finds an American form hidden as %s', (shape) => {
    // An exclusion nothing lands in is indistinguishable from one that has stopped matching, and the
    // second is a hole. Whichever of the two it turns out to be, it wants looking at.
    expect(HIDDEN[shape]).toBeGreaterThan(0);
  });

  it.each(ALLOWED.map((allowance, index) => [allowance.why, index] as const))(
    'still finds %s to allow',
    (_why, index) => {
      expect(PERMITTED[index]).toBeGreaterThan(0);
    },
  );

  it('writes every string a reader sees in British spelling', () => {
    expect(OFFENCES, `an American spelling reaches the reader:\n${OFFENCES.join('\n')}`).toEqual([]);
  });
});
