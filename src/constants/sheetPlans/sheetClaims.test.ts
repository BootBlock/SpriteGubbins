import { describe, expect, it } from 'vitest';
import { everySheetOf, planProseFor } from '../../test/categoryProse.ts';
import { sameWord } from '../../test/sameWord.ts';
import type { SheetPlan } from '../../types/components.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import {
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
} from '../promptText/exclusions.ts';
import { BACKGROUND_LAYER_LIBRARY, BACKGROUND_PARALLAX_SET } from './background.ts';

/**
 * What a sheet says about itself outside its inventory — the class its guard and audit put every entry
 * in, and the three forms that forbid its assembled whole — held to the sheet it is said on.
 *
 * **The defect behind the suite** (issue #278): all four were written per category, and a category's
 * sheets do not draw the same things. BACKGROUND's parallax set draws nine bands and its layer library
 * draws none, and the layer library was still told that every entry below was “a band of this one
 * backdrop, or a loose piece laid over one”, and not to draw “the bands stacked into the finished
 * scene”. Nothing checked either against the inventory beneath it, because a category-keyed sentence
 * had no inventory of its own to be checked against. They are `SheetPlan.componentClass` and
 * `SheetPlan.assemblyFailure` now, and this suite is what makes being on the plan mean something.
 *
 * **The sweep asks one narrow question, and it is the question the defect answers yes to**: does a
 * claim name a piece that a *sibling* sheet of the same category draws and this sheet does not write
 * anywhere? A word no sheet of the category draws is not a finding — “the finished scene” and
 * “a composited picture” name the forbidden composite, which by construction no entry is. And a word
 * this sheet's own prose writes is not one either. What is left is the case that moves a noun from one
 * sheet onto another, which is exactly how the band reached the layer library.
 *
 * **It reads the plan's claims and not the categories' sentences around them.** A category's exclusion
 * line and the tail of its guard are true of every sheet by design, and they legitimately ban a piece
 * one sheet draws — VEHICLE's audit forbids an exhaust plume drawn as a component on the directional
 * views as well as on the part library that lists the vent. The one clause in those sentences that
 * depends on the sheet, BACKGROUND's seam rule, is pinned on the compiled prompt in
 * `utils/promptCompiler.test.ts`, where its presence is what is being asserted.
 */

/** Every distinct sheet a category can be asked for, once each — the plans told apart by their names. */
function sheetsOf(category: SubjectCategory): readonly SheetPlan[] {
  const byName = new Map<string, SheetPlan>();
  for (const plan of everySheetOf(category)) {
    if (!byName.has(plan.name)) byName.set(plan.name, plan);
  }
  return [...byName.values()];
}

/**
 * Words that name nothing, which a claim may share with a sibling's piece names.
 *
 * Closed on purpose, as `categoryAssembly.test.ts`'s list is: it exists so “or” in `Panel or window
 * frame` and “and” in `Sky and horizon` are not read as pieces, not so a claim can be excused a noun.
 */
const FUNCTION_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'its',
  'of',
  'on',
  'one',
  'or',
  'the',
  'this',
  'to',
  'with',
]);

/**
 * The three nouns every sheet's entries answer to, whatever they are, which a piece name may also use.
 *
 * ITEM is why: its part library names `Detachable or consumable part`, and its directional views are
 * “a part of this one item” like the part library itself. Neither use names a kind of piece — the word
 * is what an inventory entry *is* — so the directional views are not borrowing from the part library by
 * saying it. Three words and closed, for the reason the function words are.
 */
const ENTRY_NOUNS = new Set(['component', 'part', 'piece']);

/**
 * The words of a text, lower-cased, with punctuation, single letters and function words discarded —
 * the `s` a typographic possessive leaves behind is not a word anything could draw.
 */
function wordsOf(text: string): readonly string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (word) => word.length > 1 && !FUNCTION_WORDS.has(word),
  );
}

/**
 * The words a sheet's inventory names its pieces with: each entry's identifier, and its text up to the
 * count or the description that follows the name.
 *
 * **The name and not the description**, because a description says what a piece does, and what it does
 * it does to things no sheet draws. The parallax set's `Foreground strip ×1 — the band that passes in
 * front of the playfield` names a strip; the playfield is what the category plays in, and a layer
 * library forbidding a picture of the backdrop with the playfield in front of it names no piece of the
 * parallax set by doing so.
 */
function pieceWordsOf(plan: SheetPlan): readonly string[] {
  return plan.groups.flatMap((group) =>
    group.entries.flatMap((entry) => {
      const [name = ''] = entry.text.split(/\s*[×:—,]/);
      return [...wordsOf(entry.label.replaceAll('-', ' ')), ...wordsOf(name)].filter(
        (word) => !ENTRY_NOUNS.has(word.replace(/s$/, '')),
      );
    }),
  );
}

/** The four claims a plan makes about itself, each with the name a failure message gives it. */
function claimsOf(plan: SheetPlan): readonly (readonly [string, string])[] {
  return [
    ['component class', plan.componentClass],
    ['assembly instruction', plan.assemblyFailure.instruction],
    ['assembly exclusion', plan.assemblyFailure.exclusion],
    ['assembly audit', plan.assemblyFailure.audit],
  ];
}

/**
 * Each word in one of `plan`'s claims that names a piece only another of `sheets` draws, with the
 * claim it is in and the sheet that draws it.
 */
function borrowedPieces(plan: SheetPlan, sheets: readonly SheetPlan[]): readonly string[] {
  const own = wordsOf(planProseFor(plan));
  return claimsOf(plan).flatMap(([claim, text]) =>
    [...new Set(wordsOf(text))].flatMap((word) => {
      if (own.some((written) => sameWord(word, written))) return [];
      const drawer = sheets.find(
        (other) => other.name !== plan.name && pieceWordsOf(other).some((piece) => sameWord(word, piece)),
      );
      return drawer === undefined ? [] : [`“${word}” in its ${claim}, which only ${drawer.name} draws`];
    }),
  );
}

/**
 * Every run of `length` consecutive words in a text, punctuation and case discarded.
 *
 * Words rather than characters, so that a comma moved or a hyphen dropped cannot hide a phrase from
 * the comparison — which is the shape the duplication takes when one of a pair is edited.
 */
function runsOf(text: string, length: number): ReadonlySet<string> {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return new Set(
    words.slice(0, Math.max(0, words.length - length + 1)).map((_, at) => {
      return words.slice(at, at + length).join(' ');
    }),
  );
}

describe('what a sheet says about itself outside its inventory', () => {
  it.each(SUBJECT_CATEGORIES)(
    '%s names no piece on a sheet that only another of its sheets draws',
    (category) => {
      const sheets = sheetsOf(category);
      for (const plan of sheets) {
        expect(borrowedPieces(plan, sheets), `${category} / ${plan.name}`).toEqual([]);
      }
    },
  );

  it('finds the band in BACKGROUND’s layer library written in the parallax set’s words', () => {
    // The reported instance: the layer library carrying the parallax set's class and forms, which is
    // what the per-category records handed it. Without this the sweep above could pass by reading
    // nothing — every claim in all four places, not only the class.
    const borrowed = borrowedPieces(
      {
        ...BACKGROUND_LAYER_LIBRARY,
        componentClass: BACKGROUND_PARALLAX_SET.componentClass,
        assemblyFailure: BACKGROUND_PARALLAX_SET.assemblyFailure,
      },
      sheetsOf('BACKGROUND'),
    );
    for (const claim of ['component class', 'assembly instruction', 'assembly exclusion', 'assembly audit']) {
      expect(
        borrowed.some((finding) => /^“bands?” in its /.test(finding) && finding.includes(claim)),
        claim,
      ).toBe(true);
    }
  });

  it.each(SUBJECT_CATEGORIES)('gives every %s sheet a class that completes both openings', (category) => {
    // "Every entry below is …" and "Every component is …", with the additions exemption spliced after
    // it — so a lower-case noun phrase that closes no sentence of its own.
    for (const plan of sheetsOf(category)) {
      const where = `${category} / ${plan.name}`;
      expect(plan.componentClass, where).toBe(plan.componentClass.trim());
      expect(plan.componentClass, where).toMatch(/^[a-z]/);
      expect(plan.componentClass, where).not.toMatch(/[.;:]$/);
    }
  });

  it.each(SUBJECT_CATEGORIES)(
    'shapes every %s sheet’s three forms for the sections they land in',
    (category) => {
      for (const plan of sheetsOf(category)) {
        const where = `${category} / ${plan.name}`;
        const { audit, exclusion, instruction } = plan.assemblyFailure;

        // Section 4's closes the paragraph that has just banned merging, substituting, padding and
        // omitting, so it is a whole sentence and it tells the generator what not to draw. The tail is
        // the load-bearing half: a reference key drawn beside the grid is the commonest way an otherwise
        // correct sheet arrives with the finished thing on it.
        expect(instruction, where).toMatch(/^Do not draw .+\.$/);
        expect(instruction, where).toContain('anywhere on the sheet, including as a reference or key.');

        // Section 8's is a bullet under "Absent from the image entirely:", beside three fixed ones — so a
        // noun phrase in sentence case, not an instruction and not a clause.
        expect(exclusion, where).toMatch(/^[A-Z][^.]*\.$/);
        expect(exclusion, where).not.toMatch(/^Do not /);

        // Section 9's completes "…no entry arrives with a neighbouring piece attached, and …", which the
        // template closes with its own full stop.
        expect(audit, where).toBe(audit.trim());
        expect(audit, where).toMatch(/^[a-z]/);
        expect(audit, where).not.toMatch(/[.;]/);
      }
    },
  );

  it.each(SUBJECT_CATEGORIES)('does not restate the category line a %s sheet already carries', (category) => {
    // Each pair lands in one list — section 8's exclusion bullet is the first and its assembly bullet
    // the fourth, and section 9 runs the two checks two items apart — so a phrase shared between a pair
    // is one claim made twice in one list, which is what a reader resolves as two separate demands.
    // TERRAIN is why: it was the one category whose assembly failure had already reached the body,
    // written into both of those records because they were the only per-category lines that could hold
    // it, and both gave the wording up when a record gained somewhere to put it.
    //
    // Four words rather than three, because "on the sheet and" and its like are connective tissue every
    // one of these lines is built from; four in a row is a phrase somebody wrote twice.
    //
    // **It covers one of the two duplications it is named for, and the shortfall is worth knowing.**
    // Restoring TERRAIN's old exclusion clause fails this — the replacement kept "landscape, vista or
    // diorama" and "in place of the component grid" from it. Restoring the old *audit* clause does not:
    // "nothing drawn as a landscape view rather than as a separate piece" and "a run of tiles drawn
    // already laid together, or a landscape composed from them" share no run of even three words,
    // because that one was rewritten rather than moved. A restatement in genuinely different words is a
    // judgement no run-length can hold, which is why each plan records its own.
    for (const plan of sheetsOf(category)) {
      const { audit, exclusion, instruction } = plan.assemblyFailure;
      for (const [form, neighbour, where] of [
        // `null` is the sentence without the additions exemption — this sheet's own words, which is
        // what a restatement would be a restatement of. The clause is shared by all thirteen, so
        // comparing against the exempting form would hand every category the same four-word runs.
        [instruction, CATEGORY_GUARD_TEXT[category](plan, null), 'the section 4 guard'],
        [exclusion, CATEGORY_EXCLUSION_TEXT[category](plan), 'the section 8 exclusion line'],
        [audit, CATEGORY_AUDIT_TEXT[category](plan, null), 'the section 9 category check'],
      ] as const) {
        const shared = [...runsOf(form, 4)].filter((run) => runsOf(neighbour, 4).has(run));
        expect(shared, `${category} / ${plan.name} repeats ${where}: “${shared.join('”, “')}”`).toEqual([]);
      }
    }
  });

  it('gives no two categories the same whole failure', () => {
    // Shared *wording* is fine and deliberate — OBJECT, ITEM and VEHICLE open their forms the same way.
    // What this catches is a set copied wholesale when a category or a sheet was added, which is how the
    // figure vocabulary reached all nine categories in the first place, in all three forms at once.
    // CHARACTER and CREATURE are the one pair that genuinely shares a failure, and they are named rather
    // than derived.
    const seen = new Map<string, Set<SubjectCategory>>();
    for (const category of SUBJECT_CATEGORIES) {
      for (const plan of sheetsOf(category)) {
        const { audit, exclusion, instruction } = plan.assemblyFailure;
        const key = [instruction, exclusion, audit].join(' | ');
        seen.set(key, new Set([...(seen.get(key) ?? []), category]));
      }
    }
    expect([...seen.values()].filter((categories) => categories.size > 1).map((set) => [...set])).toEqual([
      ['CHARACTER', 'CREATURE'],
    ]);
  });
});
