import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { CATEGORY_OPTIONS } from '../src/constants/categories/index.ts';
import { mentionsTerm } from '../src/constants/categories/exclusionElements.ts';
import { modesFor, sheetSeriesFor } from '../src/constants/sheetPlans/index.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { assemblyBaseSubjectsOf } from '../src/test/assemblyBaseSubjects.ts';

/**
 * An `exclusions` option against the components its own category's sheets order.
 *
 * **The section 4 half of what `exclusionElements.ts` already does for section 1.** That table pairs
 * a ban against an *attribute* another field asks for — `No cape` beside a cloak — and it never
 * looks at the inventory, so a ban on a piece the plan itself orders was outside anything's reach.
 * CHARACTER offered `No hands, no torso below the collarbone, no dialogue frame, no text` while its
 * plans order both. Measured over the six distinct plans the category compiles, **five order a
 * torso** — all but the articulation sheet, whose inventory is limbs for a trunk the directional
 * core drew — and **three order hands**: the pose library, that articulation sheet and the rig.
 * Between them they cover every configuration, so no CHARACTER sheet escapes the ban naming
 * something it draws. The value was written on 2026-08-08, a fortnight before PORTRAIT became a
 * category of its own, and it stayed in the pool it was written for.
 *
 * **Section 8's closing paragraph is what kept it from breaking a sheet, and it is not a defence.**
 * Where section 4 lists an entry section 8 excludes, the entry is drawn — dropping it would mis-map
 * every component after it. So the prompt overruled the reader's own ban on every component it
 * named, which is a control that does nothing rather than a control that does harm; it is still not
 * an option worth offering.
 *
 * **What it matches is a *bare* noun phrase**, and that is the whole of why it needs no exemption
 * list. Every option in these pools is a prohibition, so the clause `no hands` bans hands and
 * nothing else — where a *qualified* clause bans something the noun merely modifies, which is the
 * distinction `exclusionElements.ts` records for `No weapon fire or tracer effects` banning the
 * discharge and not the gun. Matching the clause whole leaves all five of those alone
 * (`no floor shadow`, `no ground terrain tiles`, `no exhaust plume or dust cloud`,
 * `no composed landscape scene or vista`, `no foreground props the player could mistake for
 * pickups`) while a match on the clause's first word flags every one of them. Run against the pools
 * as they stood, this reports the CHARACTER line above and nothing else across all thirteen
 * categories.
 *
 * It is a net rather than a proof: a ban worded so that no clause of it is the bare name of a
 * component passes. What it buys is that the plainest form of the mistake — the form that was
 * actually shipped — cannot come back unnoticed.
 */

/**
 * Every plan a category can compile, across its assembly bases, modes, direction sets and sheets.
 *
 * Each base is walked with the subject that selects it, because a declared base draws sheets of its
 * own (issue #283): a ban naming a piece of a rigid object's views would otherwise never meet them.
 */
function plansOf(category: SubjectCategory) {
  return assemblyBaseSubjectsOf(category).flatMap((subject) =>
    modesFor(category, subject).flatMap((mode) =>
      CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
        sheetSeriesFor(category, subject, mode, directions).map((plan, sheetIndex) => ({
          base: subject.anatomy,
          mode,
          directions,
          sheetIndex,
          plan,
        })),
      ),
    ),
  );
}

/**
 * The things one `exclusions` option bans, one per clause, with the leading `no` taken off.
 *
 * Clauses are comma- or semicolon-separated because that is how every option in these pools is
 * written — `No weapons, no floor shadows` is two bans in one value, and reading it whole would ask
 * whether any plan orders a component called “weapons, no floor shadows”.
 */
function bansIn(option: string): readonly string[] {
  return option
    .split(/[,;]/)
    .map((clause) => /^\s*no\s+(.+?)\s*$/i.exec(clause)?.[1])
    .filter((phrase): phrase is string => phrase !== undefined);
}

describe('no exclusion bans a component its own category orders', () => {
  it.each(SUBJECT_CATEGORIES)('holds across every %s sheet', (category) => {
    const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'exclusions');
    if (field === undefined) throw new Error(`No exclusions field for ${category}.`);

    for (const option of field.options) {
      for (const ban of bansIn(option)) {
        for (const { base, mode, directions, sheetIndex, plan } of plansOf(category)) {
          for (const group of plan.groups) {
            for (const entry of group.entries) {
              // The label as well as the prose, because the label is the identifier the manifest and
              // the sprite pack key on — a ban naming it is banning a file the reader is about to be
              // handed, whatever the entry's sentence happens to say.
              const named =
                mentionsTerm(entry.text, ban) || mentionsTerm(entry.label.replace(/-/g, ' '), ban);
              expect(
                named,
                `${category} / ${base} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)} — “${option}” bans the ${ban} that “${entry.text}” orders`,
              ).toBe(false);
            }
          }
        }
      }
    }
  });

  it('reads a ban out of every option, so the sweep is not empty', () => {
    // The floor under the parse. `bansIn` returns nothing for a clause that does not open with
    // “no”, and a pool rewritten into another shape — or a regex that stopped matching — would leave
    // every assertion above vacuously true while reporting nothing at all.
    for (const category of SUBJECT_CATEGORIES) {
      const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'exclusions');
      for (const option of field?.options ?? []) {
        expect(bansIn(option).length, `${category} — “${option}”`).toBeGreaterThan(0);
      }
    }
  });

  it('walks every assembly base’s sheets, so a rigid object’s are checked too', () => {
    // The floor under the plan walk, as the test above is the floor under the parse. OBJECT draws its
    // rigid sheets only for `Single Rigid Object`, so a walk that lost the base axis would check every
    // standard sheet and never read these.
    const sheets = plansOf('OBJECT').map(({ plan }) => plan.name);
    expect(sheets).toContain('Object states');
    expect(sheets).toContain('Object views');
  });
});
