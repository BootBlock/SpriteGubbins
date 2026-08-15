import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS, leadingSide } from '../constants/promptText/index.ts';
import { coreFacingChunks } from '../constants/sheetPlans/directionalViews.ts';
import { leadingSideLedger } from './leadingSideLedger.ts';

/**
 * The ledger against the answer it is built from, and against the facings a sheet actually covers.
 *
 * `chirality.test.ts` is the half that holds section 3's prose to {@link leadingSide}; this is the
 * half that holds the lookup to it. Between them the two spellings of the leading side that reach
 * one prompt cannot disagree, which is the only property that makes the repetition safe to ship.
 */

/** Paired with a name so `it.each` takes a facing list as one case rather than one case per facing. */
const COVERED_LISTS = Object.values(DIRECTION_LISTS)
  .flatMap((facings) => coreFacingChunks(facings))
  .map((facings) => [facings.join(', '), facings] as const);

describe('the leading-side ledger', () => {
  it.each(COVERED_LISTS)('names one side per covered facing across %s', (_name, covered) => {
    const lines = leadingSideLedger(covered).split('\n');
    expect(lines).toHaveLength(covered.length);

    lines.forEach((line, index) => {
      const facing = covered[index];
      if (facing === undefined) return;

      expect(line.startsWith(`- **${facing}** — `), line).toBe(true);
      const leading = leadingSide(facing);
      if (leading === null) {
        expect(line, facing).toContain('neither side leads');
        return;
      }
      expect(line, facing).toContain(`the subject’s **${leading}** side is the near one`);
      expect(line, facing).toContain(`its ${leading === 'left' ? 'right' : 'left'} side is turned away`);
    });
  });

  it('gives the two square-on facings no near side at all', () => {
    // 0° and 180° put both flanks edge-on, so a ledger that named one would be asserting an
    // occlusion the camera cannot produce — and the audit downstream would then fail the sheet for
    // not producing it.
    const ledger = leadingSideLedger(['front', 'front-three-quarter', 'back']);
    expect(ledger).toContain('- **front** — neither side leads');
    expect(ledger).toContain('- **back** — neither side leads');
    expect(ledger).toContain('- **front-three-quarter** — the subject’s **right** side is the near one');
  });

  it('reads the compass and classic sets opposite ways at the same printed yaw', () => {
    // The reason this is derived rather than written out: `west` and `right side` are both 90°, and
    // a ledger keyed on the printed figure would state the wrong side on every classic sheet.
    expect(leadingSideLedger(['west'])).toContain('**left** side is the near one');
    expect(leadingSideLedger(['right side'])).toContain('**right** side is the near one');
  });
});
