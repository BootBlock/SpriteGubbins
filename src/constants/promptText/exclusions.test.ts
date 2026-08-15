import { describe, expect, it } from 'vitest';
import { EFFECT } from '../categories/effect.ts';
import { CATEGORY_AUDIT_TEXT, CATEGORY_EXCLUSION_TEXT } from './exclusions.ts';

/**
 * The one collision a per-category exclusion list cannot design away, and the check that keeps its
 * repair honest.
 *
 * An effect is usually named after the thing it comes out of — a *muzzle* flash, a *weapon* trail, a
 * *projectile* body — and the thing it comes out of is exactly what an effect sheet must not draw.
 * So EFFECT is the one category whose ban list and whose `Effect Type` pool are drawn from the same
 * vocabulary, and section 1 is the sole authority for the subject's design: a reader matching on the
 * noun finds the subject itself named in the exclusions. Section 8 closes by saying an attribute
 * above that names an excluded element is already overruled, which is the instruction that reading
 * had been missing.
 *
 * The repair is to bind each banned noun to its own relation and then name the colliding effect
 * types outright as things that *are* drawn. What this suite holds is that the second half stays in
 * step with the pool: the collisions are **derived** from the options rather than listed, so a tenth
 * `Effect Type` named after a banned noun fails here until the text names it too.
 *
 * **The first half is pinned in `utils/sheetPlans.test.ts` instead**, where the assertion about this
 * category's source ban already lived — it quotes the leading relation as well as the nouns, so
 * putting the modifier back on the end of the list fails there. The division is worth knowing before
 * editing either: this file watches the text against the *pool*, that one watches it against the
 * *prompt*, and a change to the wording has to answer both.
 *
 * **Only `species` is walked**, and that is the whole of the judgement in this file. Every category
 * shares words between its option pools and its exclusion text — CREATURE's `Saddle & Armor Harness`
 * against "any harness section 1 does not name", VEHICLE's `Wheeled Ground Vehicle` against "ground
 * planes", EFFECT's own `Concentrated Point Flare` against "**lens** flare" — and each of those is
 * either already carved out, a different sense of the word, or a ban that carries its own qualifier.
 * `species` is the field that says what the sheet's subject **is**, so a shared noun there reads as
 * forbidding the subject rather than qualifying an attribute of it. That is the difference the
 * reported defect turned on, and it is the line this test can hold without a hand-kept exemption
 * list.
 */

/**
 * Words long enough to mean something on their own, stripped of a plural.
 *
 * The five-character floor is what keeps the comparison free of a stop-word list: below it the
 * overlap is `hand`, `line`, `cast` and other words that carry no category vocabulary, and above it
 * every match so far has been a real one. Prefix matching rather than equality, because the ban
 * writes `environments` where the option writes `Environmental` — the same noun, one of them
 * adjectival, and an equality test would miss it.
 */
function contentWords(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 5);
}

function sharesAStem(left: string, right: string): boolean {
  return left.startsWith(right) || right.startsWith(left);
}

/**
 * The terms an `Effect Type` option offers, which is what has to be named rather than the whole
 * option.
 *
 * `Muzzle Flash / Discharge` collides through its first half and `Slash / Weapon Trail` through its
 * second, so the separator is where the option divides into the things it could be called.
 */
function termsOf(option: string): readonly string[] {
  return option
    .split(/[/&]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

const EFFECT_TYPES = EFFECT.fields.find((field) => field.key === 'species')?.options ?? [];

/** Every `Effect Type` term sharing a stem with a word in `text`, lower-cased as it must be named. */
function collisionsWith(text: string): readonly string[] {
  const banned = contentWords(text);
  return EFFECT_TYPES.flatMap(termsOf)
    .filter((term) => contentWords(term).some((word) => banned.some((ban) => sharesAStem(word, ban))))
    .map((term) => term.toLowerCase());
}

/**
 * The exclusion's two halves: what is absent, and the sentence saying which of those words name the
 * subject instead. They are split on the first sentence break, which is the only one — the ban is a
 * single semicolon-separated sentence by construction.
 */
const [BAN_CLAUSE = '', CARVE_OUT = ''] = ((): readonly string[] => {
  const text = CATEGORY_EXCLUSION_TEXT.EFFECT;
  const brk = text.indexOf('. ');
  return brk < 0 ? [text] : [text.slice(0, brk), text.slice(brk + 2)];
})();

describe('EFFECT’s exclusions against the effect types it offers', () => {
  it('has a carve-out sentence to check at all', () => {
    // Guards the suite itself: collapsing the text back to one sentence would leave `CARVE_OUT`
    // empty and every assertion below vacuous, which is the shape the defect had in the first place.
    expect(CARVE_OUT, 'EFFECT’s exclusion text has no second sentence').not.toBe('');
    expect(EFFECT_TYPES.length, 'EFFECT has no species pool to derive collisions from').toBeGreaterThan(0);
  });

  it('names every effect type that shares a noun with the ban', () => {
    // The reported four: muzzle, weapon, projectile and — through "environments" at the head of the
    // line — environmental. Derived rather than listed, so a tenth option lands here rather than in
    // a delivered sheet.
    const collisions = collisionsWith(BAN_CLAUSE);

    expect(
      collisions.length,
      'the ban and the pool no longer share a word — has one been reworded?',
    ).toBeGreaterThan(0);
    for (const term of collisions) {
      expect(CARVE_OUT.toLowerCase(), `"${term}" is banned above and never named as the effect`).toContain(
        term,
      );
    }
  });

  it('keeps the self-audit in step, where the reader acts on it', () => {
    // The same property one section later, and it bites harder there: the audit is a check the reader
    // *performs* before delivering, so a bare "no weapon" read against a Slash / Weapon Trail sheet
    // fails the sheet on its own subject.
    //
    // The audit answers it by naming no source noun at all — it states the relation and stops — so
    // the derived set is empty today and this assertion passes on having nothing to report rather
    // than on having checked nothing. That is the stronger of the two positions and it is why the
    // assertion is written as a set: restoring a noun list here puts the terms back and fails, which
    // is the regression worth catching, and a reader can tell the difference from the message.
    const audit = CATEGORY_AUDIT_TEXT.EFFECT;
    const unnamed = collisionsWith(audit).filter((term) => !audit.toLowerCase().includes(term));

    expect(unnamed, 'the audit bans an effect type’s own noun without naming it as the effect').toEqual([]);
  });
});
