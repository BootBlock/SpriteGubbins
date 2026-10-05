import { describe, expect, it } from 'vitest';
import { ICON_OVERLAY_PLANS } from '../constants/sheetPlans/iconOverlaySheet.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * An icon set is drawn to one square per icon, not to one scale (audit finding P10).
 *
 * Section 2's share rungs said "the largest component occupies 50–65% of its cell height … and every
 * other component is drawn to that same scale" — a hand smaller than its torso, a full stop smaller than
 * a capital. On an icon sheet that orders a coin drawn as a speck beside a sword, against the sheet's own
 * "each subject filling its square to the same margin" and *Subject Framing*. A plan drawing every
 * component to one square declares `fit`, and the share is then the square's.
 */

const SQUARE =
  'every component is drawn to one square of the same size, however large or small the thing it depicts';
const LARGEST = 'the largest component occupies';

describe('what occupies section 2’s share of a cell', () => {
  // 30 seconds, as `tests/resolution-profile-fit.test.ts` budgets its own sweep: this compiles every
  // reachable sheet, and can run past the 5,000ms default under full-suite contention.
  it('is the one square on every sheet that declares it, and the largest component everywhere else', () => {
    for (const resolutionProfile of ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const) {
      for (const { where, category, subject, output, plan } of reachableSheets()) {
        const line = /^- Resolution profile: (.*)$/m.exec(
          generatePrompt(category, subject, { ...output, resolutionProfile }),
        )?.[1];
        const [stated, withheld] = plan.fit === 'SAME_SQUARE' ? [SQUARE, LARGEST] : [LARGEST, SQUARE];
        expect(line, `${where} / ${resolutionProfile}`).toContain(stated);
        expect(line, `${where} / ${resolutionProfile}`).not.toContain(withheld);
      }
    }
  }, 30_000);

  it('is declared by every ICON sheet, and by no sheet of a set drawn to one scale', () => {
    for (const plan of Object.values(ICON_OVERLAY_PLANS)) expect(plan.fit).toBe('SAME_SQUARE');
    const declaring = new Set(
      reachableSheets()
        .filter(({ plan }) => plan.fit === 'SAME_SQUARE')
        .map(({ category }) => category),
    );
    expect([...declaring]).toEqual(['ICON']);
    for (const { where, category, plan } of reachableSheets()) {
      if (category === 'ICON') expect(plan.fit, where).toBe('SAME_SQUARE');
    }
  });
});
