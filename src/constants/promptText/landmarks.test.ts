import { describe, expect, it } from 'vitest';
import { categoryProseFor } from '../../test/categoryProse.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { CATEGORY_GUARD_TEXT } from './exclusions.ts';
import { LANDMARK_TEXT } from './landmarks.ts';

/**
 * The pieces a landmark sentence names, in the two shapes the record writes them in.
 *
 * A landmark sentence is a statement about *components* — which end of each one leads — so its
 * grammatical subjects are the only words in it that have to be the category's own vocabulary. The
 * rest of a clause describes surfaces of that piece (the jaws, the dorsal ridge, the cut bank), and
 * those are anatomy rather than inventory lines: no plan lists them and none ever will.
 *
 * **The force of this is against a foreign noun, and a category's own subject noun is nearly free.**
 * EFFECT names “an effect” and ICON names “an icon”, and each of those words is written all over the
 * plans that draw them — so those two ground almost by construction, and what the check actually
 * decides there is that the sentence has not reached for somebody else's vocabulary. That is the
 * defect it was built for: CHARACTER's sentence moved onto BUILDING fails on “head”, and VEHICLE's
 * moved onto CREATURE fails on “hull”. Four categories name no piece at all — OBJECT, ITEM, BUILDING
 * and PORTRAIT each state a front for the subject as a whole — and the shape assertion below is what
 * stops that reading as coverage.
 *
 * Both patterns read a lower-case article, the negative one reads `a` and `an` alone, and both bound
 * the subject at four words. That is what keeps EFFECT's second sentence out of the parse: “A radial
 * effect that is the same in every direction has no front axis at all” is a statement about the
 * category rather than a landmark for a piece, and its only article is the capital at the head of it.
 * Admitting `the` there would read the subject as “same in every direction”, which is four words of
 * ordinary English and no piece at all.
 */
const NAMED_PIECE = [
  /\b(?:a|an|the) ([a-z]+(?: [a-z]+){0,3})(?:’s|’) (?:front|rear)\b/g,
  /\b(?:a|an) ([a-z]+(?: [a-z]+){0,3}) has no (?:front|rear)\b/g,
];

/**
 * The words of a named piece that have to be grounded — everything but the conjunctions and
 * articles holding a compound subject together, which are the sentence's own scaffolding.
 */
const SCAFFOLDING = new Set(['a', 'an', 'the', 'or', 'and']);

function namedPiecesIn(landmark: string): readonly string[] {
  return NAMED_PIECE.flatMap((pattern) =>
    // Discharged rather than defaulted: an empty subject would split into one empty word, which
    // grounds against anything and would report a piece as checked that was never read.
    [...landmark.matchAll(pattern)].flatMap(([, piece]) => (piece === undefined ? [] : [piece])),
  );
}

/** The shape a category takes when its landmark names no piece: the subject as a whole has a front. */
const WHOLE_SUBJECT = /\bthe front is\b/;

/**
 * What the category guard positively asserts a component of this sheet is — its **first sentence**,
 * and only that.
 *
 * The guard is the one place a category names the *class* its pieces belong to rather than the
 * pieces themselves, which is what TERRAIN's landmark reaches for: `a landform piece` is the phrase
 * both section 4's guard and section 9's audit use for everything on that sheet that is not a ground
 * tile, and no plan entry writes the word. A landmark stating a rule in the words the sentence above
 * the inventory already uses is the prompt agreeing with itself, not a foreign noun.
 *
 * **The rest of the guard is the half that must stay out.** Every one of them closes by naming what
 * would *not* belong — “An entry describing a head, limb, hand or other anatomy…” — so a corpus
 * taking the whole sentence pair would ground a character's vocabulary in the building guard that
 * bans it, and this check would pass a landmark written from exactly the wrong category. The split
 * is safe because all thirteen open `Every entry below is`, which the assertion below pins.
 */
function componentClassOf(category: SubjectCategory): string {
  const [positive = ''] = CATEGORY_GUARD_TEXT[category](null).split('. ');
  return positive;
}

describe('LANDMARK_TEXT', () => {
  it('names only pieces the category’s own sheets carry', () => {
    // The defect: the CREATURE entry was drafted from CHARACTER's and kept its nouns, so section 3
    // told a generator which end of “a torso” and “a pelvis” leads while section 4's inventory asked
    // for bodies and hindquarters. The creature plans record that distinction as deliberate — a
    // creature sheet asking for humanoid parts is the humanoid-only assumption those plans exist to
    // stop — and the landmark rule was stating it in the vocabulary the distinction rejects.
    //
    // Grounded against everything the category's plans write rather than against their labels alone,
    // because a piece is as often named in an entry's prose as in its identifier: `working mount` is
    // written in “Turret, weapon or working mounts” and in no label. Matched with a leading boundary
    // only, so a plan writing the plural grounds the singular.
    for (const category of SUBJECT_CATEGORIES) {
      const landmark = LANDMARK_TEXT[category];
      const componentClass = componentClassOf(category);
      const prose = `${categoryProseFor(category)} ${componentClass}`;
      const pieces = namedPiecesIn(landmark);

      // The split above is a claim about the guard's shape, and a guard reworded out of it would
      // hand the corpus the banning clause as well as the asserting one.
      expect(componentClass, `${category}: the guard's positive clause is not where it was`).toMatch(
        /^Every entry below is /,
      );

      // Without this a category whose sentence was reworded into a shape neither pattern reads would
      // pass while asserting nothing at all, which is the one way this check can rot silently.
      expect(
        pieces.length > 0 || WHOLE_SUBJECT.test(landmark),
        `${category}: the landmark names no piece and does not state a front for the subject itself`,
      ).toBe(true);

      for (const piece of pieces) {
        for (const word of piece.split(' ').filter((part) => !SCAFFOLDING.has(part))) {
          // `String.raw`, because a plain template literal reads \b as a backspace: the regex then
          // matches nothing and every category fails at once, which is loud but for the wrong reason.
          const grounded = new RegExp(String.raw`\b${word}`, 'i').test(prose);
          expect(grounded, `${category}: “${word}” is a piece this category’s sheets never list`).toBe(true);
        }
      }
    }
  });

  it('gives no two categories the same landmark, which would be one of them written in the other’s pieces', () => {
    const written = SUBJECT_CATEGORIES.map((category) => LANDMARK_TEXT[category]);
    expect(new Set(written).size).toBe(written.length);
  });
});
