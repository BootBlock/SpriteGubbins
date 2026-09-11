import { describe, expect, it } from 'vitest';
import { LIBRARY_CONFIGURATIONS } from '../../test/libraryConfigurations.ts';
import { measurePromptFit } from '../../test/promptFit.ts';
import { TARGET_MODEL_IDS } from '../../types/output.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { readPromptBudget } from '../../utils/promptBudget.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { CATEGORY_OPTIONS, fieldLabelFor } from '../categories/index.ts';
import { CATEGORY_GUARD_TEXT } from './exclusions.ts';

/**
 * The exemption `guardExemption` and `auditExemption` splice into a category's guard and audit,
 * priced against every ceiling the app is demonstrated against.
 *
 * **A preset used to do this by accident, and stopped.** The clause lands only in a prompt whose sheet
 * lists the subject's own pieces, and `Side-On Rail Gun Car` — the library's only worked example for
 * Qwen, whose 4,500-token ceiling is the tightest the app compiles against — carried a towed trailer
 * and sat eighteen estimated tokens under its allowance. So a draft of the clause that ran long failed
 * `presetCoverage.test.ts`, and the wording that landed was sized against that card. The card later
 * gave its trailer up to buy back the margin a one-sentence template change had taken, and from that
 * moment no prompt in the library carrying the clause sat anywhere near a ceiling: a later pass could
 * have made it as long as it liked. Issue #249 recorded the gap.
 *
 * **What is measured is the constraint itself rather than a card standing in for it.** The claim is
 * that a reader on a target whose ceiling holds some of what the app composes can still name pieces
 * of their own and be read. So every configuration the app composes unprompted is compiled once per
 * option its own category's pool offers for that field — a pick from a list, not text the reader
 * wrote — and once as it stands, for each such target in turn, with the target set on the output so
 * the target's own wrapper and its section gating are what gets measured. The leanest prompt that
 * carries the exemption has to fit the same {@link measurePromptFit} allowance every other reading
 * in the suite answers to.
 *
 * **The leanest, and not every one.** A sheet already near a ceiling does not have room for extra
 * pieces, and it is not meant to: `Side-On Rail Gun Car` with `Roof Turret ×1, Ammo Box ×2` measures
 * past its allowance today, which is the trade #248 made on purpose. Holding every configuration
 * would put that card back on a margin of single tokens, which is what the trade escaped. What has
 * to stay true is that the feature is still reachable at all on a target the app claims to fit, and
 * a clause that grew past the slack `MAX_BUDGET_SHARE` leaves is what would stop it being.
 *
 * **The targets are found by measurement, not listed**, as `presetCoverage.test.ts` finds the ones it
 * exempts: a ceiling nothing the app composes fits is out, and a new target whose ceiling holds some
 * of the library is in without anyone adding it. That also prices each ceiling in its own unit, so
 * a character budget is never compared with a token one.
 *
 * **The clause is found by the category's own sentence rather than by a copy of its words**, which is
 * what `landmarks.test.ts` does with the same record. This suite prices length, and a rewording that
 * moved the detection out from under it would pass on having measured nothing; the wording itself is
 * pinned in `utils/sheetPlans.test.ts`. The audit's half is gated on the same value as the guard's,
 * so on a target that reaches section 9 it is in every prompt measured here as well.
 */

/** The field whose pieces the exemption names. */
const ADDITIONS = 'additional_anatomy';

/** The opening claim of a category's guard, which is the sentence the exemption is spliced into. */
function openingClaim(category: SubjectCategory, label: string | null): string {
  const [claim = ''] = CATEGORY_GUARD_TEXT[category](label).split('. ');
  return claim;
}

/** Every value a configuration's additions field is measured at: its own, and each one its pool offers. */
function additionsFor(category: SubjectCategory, own: string): readonly string[] {
  const pool = CATEGORY_OPTIONS[category].fields.find((field) => field.key === ADDITIONS)?.options ?? [];
  return [...new Set([own, ...pool])];
}

/** Every target whose ceiling holds some of what the app composes. */
const MEASURED_TARGETS = TARGET_MODEL_IDS.filter((target) => {
  const fit = measurePromptFit(target);
  return fit !== null && fit.fit !== 'NONE';
});

describe('the exemption for the subject’s own pieces, against every ceiling that holds a sheet', () => {
  it('has a ceiling to measure against', () => {
    // An empty list would make the priced assertion below a test of nothing, and pass.
    expect(MEASURED_TARGETS.length).toBeGreaterThan(0);
  });

  it.each(SUBJECT_CATEGORIES)('%s states an exemption this suite can find', (category) => {
    // The detection below reads a prompt for the opening claim *with* the exemption in it. If the
    // two forms ever became one sentence, every prompt would match it and the leanest would be a
    // sheet listing no pieces at all.
    expect(openingClaim(category, fieldLabelFor(category, ADDITIONS))).not.toBe(openingClaim(category, null));
  });

  it.each(MEASURED_TARGETS)(
    '%s still reads the leanest sheet that lists the subject’s own pieces',
    (target) => {
      const fit = measurePromptFit(target);
      if (fit === null) throw new Error(`${target} was measured and has no ceiling`);

      let leanest: { readonly name: string; readonly additions: string; readonly used: number } | null = null;
      for (const { name, category, subject, output } of LIBRARY_CONFIGURATIONS) {
        const exempted = openingClaim(category, fieldLabelFor(category, ADDITIONS));
        for (const additions of additionsFor(category, subject[ADDITIONS])) {
          const prompt = generatePrompt(
            category,
            { ...subject, [ADDITIONS]: additions },
            { ...output, targetModel: target },
          );
          if (!prompt.includes(exempted)) continue;

          const reading = readPromptBudget(prompt, target);
          if (reading === null) throw new Error(`${target} has a ceiling and read no budget`);
          if (leanest === null || reading.used < leanest.used) {
            leanest = { name, additions, used: reading.used };
          }
        }
      }

      if (leanest === null) {
        throw new Error(`no configuration compiled for ${target} carries the exemption — nothing was priced`);
      }
      expect(
        leanest.used,
        `the leanest prompt carrying the exemption is ${leanest.name} with “${leanest.additions}”, at ` +
          `${String(leanest.used)} ${fit.budget.unit} against ${target}'s allowance of ` +
          `${String(fit.allowance)} — the exemption in exclusions.ts, or the block it points at, has ` +
          `outgrown the ceiling`,
      ).toBeLessThanOrEqual(fit.allowance);
    },
  );
});
