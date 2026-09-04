import { describe, expect, it } from 'vitest';
import { modesFor, SHEET_INDEX_RANGE } from '../src/constants/sheetPlans/index.ts';
import { resolutionProfileDescription } from '../src/constants/promptText/renderStyle.ts';
import { SCALE_UNIT_FRAME } from '../src/constants/promptText/subject.ts';
import { ASPECT_RATIOS, DIRECTION_SETS } from '../src/types/output.ts';
import type { AspectRatio } from '../src/types/output.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import { componentCountFor } from '../src/utils/componentSet.ts';

/**
 * Whether section 2's resolution profile asks for artwork the sheet can actually hold.
 *
 * **The defect this suite exists for:** the two share-bearing profiles stated their range against
 * the sheet height on all thirteen categories, and that reading was written for a whole figure the
 * sheet is forbidden to draw. On a category whose scale unit is a component the sheet draws one of
 * per entry, the same range argues with the component count two sections later — a default ICON
 * sheet compiles “Exactly 28 components” and “one icon occupies 25–35% of the sheet height”, and
 * twenty-eight squares at the *bottom* of that range need 1.75 sheet heights squared against a 16:9
 * page measuring 1.78. That is the whole surface, with nothing left for the spacing the layout
 * section asks for in the same prompt. Nothing in the app noticed, because the two facts were
 * stated in different sections by different records and neither had ever been multiplied out.
 *
 * **It reads the compiled line, not the constants behind it.** `SHARE_RANGE` and `SCALE_UNIT_FRAME`
 * are what produce that line, and a check that read them back would agree with itself whatever the
 * sentence said — the frame would decide both the wording and the formula. Parsing the sentence is
 * what makes the two independent: the arithmetic follows the words a generator is actually given,
 * so a range moved into the wrong frame fails here rather than passing quietly.
 */

/** The share the sentence states, as a fraction, at each end of its range. */
interface Share {
  readonly low: number;
  readonly high: number;
  readonly framedBy: 'CELL' | 'SHEET';
}

/**
 * The two frames the app writes, and the only two this file knows how to price.
 *
 * A third — or a reworded one — fails to parse rather than being scored under whichever arm happens
 * to match, because the frame is what decides the formula and guessing it wrong is the failure this
 * suite is named after.
 */
const FRAME_PATTERN = {
  SHEET: /(\d+)–(\d+)% of the sheet height/,
  CELL: /(\d+)–(\d+)% of its cell height in the exploded grid/,
} as const;

function shareOf(sentence: string): Share {
  for (const framedBy of ['SHEET', 'CELL'] as const) {
    const found = FRAME_PATTERN[framedBy].exec(sentence);
    if (found === null) continue;
    return { low: Number(found[1]) / 100, high: Number(found[2]) / 100, framedBy };
  }
  throw new Error(`no frame recognised in: ${sentence}`);
}

/**
 * The sheet's width over its height, read out of the identifier rather than tabulated beside it.
 *
 * `WIDE_16_9` says 16:9 in its own name, so a second table here would be the same fact written
 * twice — and the one this file would get wrong is the one nobody re-reads.
 */
function aspectOf(ratio: AspectRatio): number {
  const found = /_(\d+)_(\d+)$/.exec(ratio);
  if (found === null) throw new Error(`no ratio in the identifier: ${ratio}`);
  return Number(found[1]) / Number(found[2]);
}

/**
 * How many of the scale unit the sheet actually draws.
 *
 * `REFERENCE` is zero and that is the whole point of the frame: a full figure, a full building, a
 * full vehicle is a whole every one of sections 4, 8 and 9 forbids the page to carry, so no number
 * of components makes a share of the sheet height too large. The pieces on the page are fractions of
 * that unit, not copies of it.
 */
function unitsDrawn(category: (typeof SUBJECT_CATEGORIES)[number], components: number): number {
  return SCALE_UNIT_FRAME[category] === 'DRAWN' ? components : 0;
}

/**
 * The share of the page the stated scale spends, at one end of one range.
 *
 * Both arms assume the unit is drawn roughly as square as the box it is measured in, which is what
 * lets a height be turned into an area at all. That is an approximation and it is the honest one to
 * make: a taller-than-wide unit spends less than this and a wider one more, and neither the prompt
 * nor the app knows which a given component will be.
 *
 * - **`SHEET`** — the unit is `share` of the page's height, so each copy is `share²` of a square
 *   page and `share² / aspect` of this one. `N` copies is that again `N` times, and nothing bounds
 *   it: the count and the share are set by two records that never meet.
 * - **`CELL`** — the unit is `share` of its own cell's height, and the cells tile the page by
 *   construction. `N` of them therefore spend `share²` of it **whatever `N` is and whatever aspect
 *   the reader chose**, which is the property that makes the contradiction impossible rather than
 *   merely smaller.
 */
function coverage(share: number, framedBy: Share['framedBy'], units: number, aspect: number): number {
  return framedBy === 'CELL' ? (units === 0 ? 0 : share * share) : (units * share * share) / aspect;
}

/**
 * What the layout section's "generously and uniformly spaced" costs, as a share of the page.
 *
 * A grid whose components cover more than three quarters of the sheet has no generous gutter left to
 * give, so this is the ceiling rather than 1. The top of the top rung is what it is really holding:
 * `HIGH_RESOLUTION` runs to 85% of a cell, which is 0.72 of the page, and a rung nudged past roughly
 * 87% would breach it. Every other reading has room to spare — the bottom of `HIGH_RESOLUTION` is
 * 0.42 and `MID_RESOLUTION` runs 0.20 to 0.42.
 */
const COVERAGE_CEILING = 0.75;

/** Every sheet a category can be asked for, which is where the component count comes from. */
function componentCounts(category: (typeof SUBJECT_CATEGORIES)[number]): readonly number[] {
  const counts: number[] = [];
  for (const mode of modesFor(category)) {
    for (const directions of DIRECTION_SETS) {
      for (let sheetIndex = 0; sheetIndex <= SHEET_INDEX_RANGE.max; sheetIndex += 1) {
        counts.push(componentCountFor(category, mode, directions, sheetIndex, []));
      }
    }
  }
  return counts;
}

describe('the resolution profile against the component count', () => {
  const SHARE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const;

  it('leaves the page room for the spacing the same prompt asks for', () => {
    const breaches: string[] = [];
    let scored = 0;

    for (const category of SUBJECT_CATEGORIES) {
      for (const components of componentCounts(category)) {
        const units = unitsDrawn(category, components);
        for (const profile of SHARE_BEARING) {
          const { low, high, framedBy } = shareOf(resolutionProfileDescription(profile, false, category));
          for (const ratio of ASPECT_RATIOS) {
            for (const share of [low, high]) {
              const spent = coverage(share, framedBy, units, aspectOf(ratio));
              if (units > 0) scored += 1;
              if (spent <= COVERAGE_CEILING) continue;
              breaches.push(
                `${category} / ${profile} / ${ratio}: ${String(components)} components at ` +
                  `${String(Math.round(share * 100))}% of the ${framedBy === 'CELL' ? 'cell' : 'sheet'} ` +
                  `cover ${spent.toFixed(2)} of the page`,
              );
            }
          }
        }
      }
    }

    // Non-vacuous: the reference categories score zero by construction, so a run that scored nothing
    // at all would mean the drawn ones had stopped being reached rather than that they all fit.
    expect(scored, 'no category was scored as drawing its own scale unit').toBeGreaterThan(0);
    expect(breaches, `the stated scale does not fit:\n${breaches.join('\n')}`).toEqual([]);
  });

  it('makes the fit independent of the count and the aspect wherever the sheet draws the unit', () => {
    // The claim the cell frame rests on, stated separately because the assertion above would also
    // pass on a frame that merely happened to fit at the counts these plans carry today. A category
    // whose sheet draws its own unit has to spend the same share of the page at 12 components and at
    // 28, on a 9:16 page and on a 21:9 one — otherwise a plan that grows by one entry can put the
    // prompt back into contradiction with nothing to say it had.
    for (const category of SUBJECT_CATEGORIES) {
      if (SCALE_UNIT_FRAME[category] !== 'DRAWN') continue;
      const { low, framedBy } = shareOf(resolutionProfileDescription('HIGH_RESOLUTION', false, category));
      const spent = new Set(
        ASPECT_RATIOS.flatMap((ratio) =>
          [12, 28, 64].map((components) => coverage(low, framedBy, components, aspectOf(ratio)).toFixed(6)),
        ),
      );
      expect(spent.size, `${category}: what the scale costs moves with the count or the aspect`).toBe(1);
    }
  });
});
