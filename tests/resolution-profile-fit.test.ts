import { describe, expect, it } from 'vitest';
import { resolutionProfileDescription } from '../src/constants/promptText/renderStyle.ts';
import { SHEET_CELL_PITCH } from '../src/constants/sheetCanvas.ts';
import { modesFor, SHEET_INDEX_RANGE, sheetPlanFor } from '../src/constants/sheetPlans/index.ts';
import type { SheetPlan } from '../src/types/components.ts';
import { ASPECT_RATIOS, DIRECTION_SETS } from '../src/types/output.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { widthBiasFor } from '../src/utils/atlasCalculator.ts';
import { componentCountFor } from '../src/utils/componentSet.ts';

/**
 * Whether section 2's resolution profile asks for artwork the sheet can actually hold.
 *
 * **The defect this suite exists for:** the two share-bearing profiles stated their range against
 * the sheet height on all thirteen categories, and that reading was written for a whole figure the
 * sheet is forbidden to draw. On a category whose sheet draws one of its scale unit per entry, the
 * same range argues with the component count two sections later — a default ICON sheet compiles
 * “Exactly 28 components” and “one icon occupies 25–35% of the sheet height”, and twenty-eight
 * squares at the *bottom* of that range need 1.75 sheet heights squared against a 16:9 page
 * measuring 1.78. That is more than the whole surface, with nothing left for the spacing the layout
 * section asks for in the same prompt. Nothing in the app noticed, because the two facts were stated
 * in different sections by different records and neither had ever been multiplied out.
 *
 * **It reads the compiled line, not the constants behind it.** `SHARE_RANGE` and the sheet's own
 * `scaleUnitFrame` are what produce that line, and a check that read them back would agree with
 * itself whatever the sentence said — the frame would decide both the wording and the formula. Parsing the sentence is
 * what makes the two independent: the arithmetic follows the words a generator is actually given,
 * so a range moved into the wrong frame fails here rather than passing quietly.
 *
 * **What it deliberately does not claim.** A `SHEET` sheet draws at most one of its unit, so
 * `unitsDrawn` scores it zero and no assertion here reaches it — the claim that *this* sheet may use
 * that frame is `SheetPlan.scaleUnitFrame`'s to make, argued sheet by sheet, and
 * `utils/sheetPlans.test.ts` pins the answer each one gave.
 *
 * **BACKGROUND's parallax set is where that silence used to do real work, and it no longer has to.**
 * Nine band-shaped components were priced against the sheet height, and a band is full-bleed wide and
 * short, so the square-unit approximation below would have read nine squares onto the page — a
 * shape this model cannot size, which is what issue #216 was opened to record. The answer was the
 * frame rather than a recorded aspect: a cell is `SHEET_CELL_PITCH` times its own component on each
 * axis, so a share of one carries no claim about shape at all, and the `CELL` arm below is the arm
 * with no aspect in it.
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
 * How many of the scale unit the sheet actually draws.
 *
 * `SHEET` is zero and that is the whole point of the frame: the sheet draws at most one of that
 * unit, so no number of components makes a share of the sheet height too large. The pieces on the
 * page are fractions of it, not copies of it.
 */
function unitsDrawn(plan: SheetPlan, components: number): number {
  return plan.scaleUnitFrame === 'CELL' ? components : 0;
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
  if (units === 0) return 0;
  return framedBy === 'CELL' ? share * share : (units * share * share) / aspect;
}

/**
 * What the layout section's “generously and uniformly spaced” costs, as a share of the page.
 *
 * Read off {@link SHEET_CELL_PITCH} rather than chosen here, because that constant is where the app
 * already answers this: a cell 1.5× the component on each axis is a component filling `1 / 1.5` of
 * it, which covers `(1 / 1.5)²` — 0.44 — of the page. A ceiling picked afresh would be a second
 * spacing budget in `src`, free to drift from the one `nativeGridScale` derives its own figure from.
 *
 * The top of the top rung is what it really holds: `HIGH_RESOLUTION` runs to 65% of a cell, which is
 * 0.42 of the page, so a rung nudged past 67% would breach it. Every other reading has room to
 * spare — the bottom of `HIGH_RESOLUTION` is 0.25 and `MID_RESOLUTION` runs 0.12 to 0.25.
 */
const COVERAGE_CEILING = 1 / SHEET_CELL_PITCH ** 2;

/** One sheet, with the count it asks for and the frame it prices that count in. */
interface Sheet {
  readonly plan: SheetPlan;
  readonly components: number;
}

/**
 * Every sheet a category can be asked for, which is where both halves of the arithmetic come from.
 *
 * The plan travels with its count rather than being looked up beside it, because the frame is the
 * *sheet's* answer and not the category's — see `SheetPlan.scaleUnitFrame`. Pairing a count from one
 * pairing with a frame from another is exactly the mistake that would hide the case this suite
 * exists for.
 */
function sheetsOf(category: SubjectCategory): readonly Sheet[] {
  const sheets: Sheet[] = [];
  for (const mode of modesFor(category)) {
    for (const directions of DIRECTION_SETS) {
      for (let sheetIndex = 0; sheetIndex <= SHEET_INDEX_RANGE.max; sheetIndex += 1) {
        sheets.push({
          // An index past the end of a short series resolves to the first sheet, in both of these —
          // so the plan and the count stay the same sheet's whatever the loop asks for.
          plan: sheetPlanFor(category, mode, directions, sheetIndex),
          components: componentCountFor(category, mode, directions, sheetIndex, []),
        });
      }
    }
  }
  return sheets;
}

describe('the resolution profile against the component count', () => {
  const SHARE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const;

  it('leaves the page room for the spacing the same prompt asks for', () => {
    const breaches: string[] = [];
    let scored = 0;

    for (const category of SUBJECT_CATEGORIES) {
      for (const { plan, components } of sheetsOf(category)) {
        const units = unitsDrawn(plan, components);
        for (const profile of SHARE_BEARING) {
          const { low, high, framedBy } = shareOf(
            resolutionProfileDescription(profile, false, category, plan.scaleUnitFrame),
          );
          for (const ratio of ASPECT_RATIOS) {
            for (const share of [low, high]) {
              const spent = coverage(share, framedBy, units, widthBiasFor(ratio));
              if (units > 0) scored += 1;
              if (spent <= COVERAGE_CEILING) continue;
              breaches.push(
                `${category} / ${plan.name} / ${profile} / ${ratio}: ${String(components)} components at ` +
                  `${String(Math.round(share * 100))}% of the ${framedBy === 'CELL' ? 'cell' : 'sheet'} ` +
                  `cover ${spent.toFixed(2)} of the page`,
              );
            }
          }
        }
      }
    }

    // Non-vacuous: the sheet-framed sheets score zero by construction, so a run that scored nothing
    // at all would mean the cell-framed ones had stopped being reached rather than that they all
    // fit. Run against the wording this suite was written for — every category framed by the sheet,
    // on the ranges that shipped — it reports all seven then framed that way, on all four aspect
    // ratios each.
    expect(scored, 'no sheet was scored as drawing its own scale unit').toBeGreaterThan(0);
    expect(breaches, `the stated scale does not fit:\n${breaches.join('\n')}`).toEqual([]);
  });
});
