import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../src/constants/categories/index.ts';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { SHEET_CELL_PITCH } from '../src/constants/sheetCanvas.ts';
import { modesFor, SHEET_INDEX_RANGE } from '../src/constants/sheetPlans/index.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * Whether section 2's resolution profile asks for artwork the sheet can actually hold, on every sheet
 * the app compiles.
 *
 * **Two defects, one frame.** The two share-bearing profiles once stated their range as a share of the
 * sheet height, and on every kind of sheet something else in the same prompt decided that figure
 * before the line was read:
 *
 * - **The component count, where a sheet draws its unit once per component.** A default ICON sheet
 *   compiled “Exactly 28 components” and “one icon occupies 25–35% of the sheet height”, and
 *   twenty-eight squares at the *bottom* of that range need 1.75 sheet heights squared against a 16:9
 *   page measuring 1.78 — more than the whole surface, with nothing left for the spacing the layout
 *   section asks for (issue #178).
 * - **The layout, where a sheet draws the parts of one whole.** A CHARACTER directional core compiled
 *   “a full figure occupies 25–35% of the sheet height” beside an exploded grid of head, torso and
 *   pelvis rows. Those rows are disjoint pieces of one figure at one scale, so the figure is at least
 *   as tall as the rows stacked, and a grid laid across the page makes that most of the sheet. All
 *   eighteen character sheets measured for issue #245 drew the head and the pelvis alone at 40–73% of
 *   the sheet height. The count never entered it — which is why the version of this suite that
 *   multiplied the count out scored those sheets zero and passed every one of them.
 *
 * **So a share of the sheet height is not priced here at all**: a sentence stating one fails, whatever
 * its numbers. A share of the largest component's own cell is the frame neither can argue with. Cells
 * tile the page by construction, so the largest piece filling `f` of its cell spends at most `f²` of it
 * whatever the count, the aspect or the number of rows — and every other piece, drawn to that scale,
 * spends less. It has to be the *largest*: a share of any other piece leaves the bigger ones free to
 * overrun their cells, which is the bound failing by another route.
 *
 * **It reads the compiled prompt, not the constants behind it.** `SHARE_RANGE` is what produces the
 * line, and a check that read it back would agree with itself whatever the sentence said. Compiling
 * every sheet is also what would catch a per-sheet answer creeping back: the sheet-height wording
 * reached the six whole-subject categories through a field on each plan, which a check calling the
 * composer directly could never have seen.
 */

/** The line itself, wherever section 2 puts it. */
const RESOLUTION_LINE = /^- Resolution profile: (.*)$/gm;

/**
 * The only share this suite knows how to price.
 *
 * A reworded share — or one stated against anything but the largest component's cell — fails to
 * match rather than being scored some other way, because the frame is what decides the arithmetic and
 * guessing it wrong is the failure this suite is named after.
 */
const CELL_SHARE = /the largest component occupies (\d+)–(\d+)% of its cell height in the exploded grid/;

/**
 * What the layout section's “generously and uniformly spaced” costs, as a share of the page.
 *
 * Read off {@link SHEET_CELL_PITCH} rather than chosen here, because that constant is where the app
 * already answers this: a cell 1.5× the component on each axis is a component filling `1 / 1.5` of
 * it, which covers `(1 / 1.5)²` — 0.44 — of the page. A ceiling picked afresh would be a second
 * spacing budget in `src`, free to drift from the one `nativeGridScale` derives its own figure from.
 *
 * The top of the top rung is what it really holds: `HIGH_RESOLUTION` runs to 65% of a cell, which is
 * 0.42 of the page, so a rung nudged past 67% would breach it.
 */
const COVERAGE_CEILING = 1 / SHEET_CELL_PITCH ** 2;

describe('the resolution profile against the page it is drawn on', () => {
  const SHARE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const;

  it('states every share against the largest component’s cell, and leaves room for the spacing', () => {
    const unpriceable: string[] = [];
    const breaches: string[] = [];
    const scored = new Set<string>();

    for (const category of SUBJECT_CATEGORIES) {
      const subject = defaultSubjectFor(category);
      for (const directionalMode of modesFor(category)) {
        // Every direction set the category offers and every sheet index, because the set and the
        // index decide which plan compiles — an eight-compass core is two sheets and an articulation
        // run after them, and the defect this suite exists for was on every one of the three.
        for (const directions of CATEGORY_DIRECTION_SETS[category]) {
          for (let sheetIndex = 0; sheetIndex <= SHEET_INDEX_RANGE.max; sheetIndex += 1) {
            for (const resolutionProfile of SHARE_BEARING) {
              const where = `${category} / ${directionalMode} / ${directions} / ${String(sheetIndex)} / ${resolutionProfile}`;
              const prompt = generatePrompt(category, subject, {
                ...DEFAULT_OUTPUT_CONFIG,
                directionalMode,
                directions,
                sheetIndex,
                resolutionProfile,
              });
              const lines = [...prompt.matchAll(RESOLUTION_LINE)].map((match) => match[1] ?? '');
              expect(lines, where).toHaveLength(1);
              const line = lines[0] ?? '';

              const found = CELL_SHARE.exec(line);
              if (found === null) {
                unpriceable.push(`${where}: ${line}`);
                continue;
              }
              scored.add(`${category} / ${directionalMode}`);
              const top = Number(found[2]) / 100;
              if (top * top > COVERAGE_CEILING) {
                breaches.push(
                  `${where}: ${String(found[2])}% of a cell covers ${(top * top).toFixed(2)} of the page`,
                );
              }
            }
          }
        }
      }
    }

    // Non-vacuous, and on the pairing the defect was reported against: a run that scored nothing
    // would mean the line had stopped being reached rather than that every sheet fits. Run against
    // the plans as they stood before issue #245 — the six whole-subject categories, INTERFACE and
    // BACKGROUND's layer library each stating a share of the sheet height — it reports every sheet of
    // all eighteen of those pairings as unpriceable.
    expect(scored.has('CHARACTER / CORE_DIRECTIONAL_VARIANTS'), 'the reported pairing was never scored').toBe(
      true,
    );
    expect(
      unpriceable,
      `a share is stated in a frame the layout decides:\n${unpriceable.join('\n')}`,
    ).toEqual([]);
    expect(breaches, `the stated scale does not fit:\n${breaches.join('\n')}`).toEqual([]);
  });
});
