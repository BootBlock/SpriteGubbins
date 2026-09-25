import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { isPlanView, OBJECT_YAW } from '../src/constants/promptText/index.ts';
import { modesFor, sheetSeriesFor } from '../src/constants/sheetPlans/index.ts';
import { assemblyBaseSubjectsOf } from '../src/test/assemblyBaseSubjects.ts';
import { PROJECTIONS } from '../src/types/output.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { DirectionSet, OutputConfig } from '../src/types/output.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';
import { sheetFacts } from '../src/utils/promptFacts.ts';

/**
 * No rotation check names a view the sheet's own yaws do not include (issue #325).
 *
 * The directional audit told the `EIGHT_COMPASS` diagonal sheet — 45°, 135°, 225° and 315°, every
 * view a three-quarter view — to confirm its side view was "not a second three-quarter view" and its
 * rear view hid what its front view presented, then to fail the sheet when it could not. A
 * generator that obeyed redrew a view towards a yaw section 3 forbids it. Section 3's rotation rules
 * and its list of failed rotations named the same views. Both are read here on every sheet of every
 * category, mode and direction set, at an ordinary camera and from directly overhead, against the
 * yaws that sheet actually covers.
 */

/** Section 3's rotation rules through its list of failed rotations, and section 9's directional audit. */
const ROTATION_CHECKS = [
  /### Silhouette and rotation carry the direction[\s\S]*?stays put\./,
  /### Directional audit[\s\S]*?If two views of one component/,
];

/** A mention of each view, quoted or not, as a check comparing against it would make one. */
const SIDE_VIEW = /\bside”? views?\b/i;
const FRONT_OR_REAR_VIEW = /\b(?:front|rear)”? views?\b/i;

/** One compiled multi-view sheet, with what it is a sheet of and the yaws it covers. */
interface Sheet {
  readonly where: string;
  readonly category: SubjectCategory;
  readonly directions: DirectionSet;
  readonly plan: boolean;
  readonly prompt: string;
  readonly yaws: readonly number[];
}

/** Every configuration that compiles a distinct multi-view sheet, at every projection. */
function* multiViewSheets(): Generator<Sheet> {
  for (const category of SUBJECT_CATEGORIES) {
    for (const subject of assemblyBaseSubjectsOf(category)) {
      for (const directionalMode of modesFor(category, subject)) {
        for (const directions of CATEGORY_DIRECTION_SETS[category]) {
          const series = sheetSeriesFor(category, subject, directionalMode, directions);
          for (let sheetIndex = 0; sheetIndex < series.length; sheetIndex += 1) {
            for (const projection of PROJECTIONS) {
              for (const cameraElevation of [DEFAULT_OUTPUT_CONFIG.cameraElevation, 90]) {
                const output: OutputConfig = {
                  ...DEFAULT_OUTPUT_CONFIG,
                  directionalMode,
                  directions,
                  sheetIndex,
                  projection,
                  cameraElevation,
                };
                const facts = sheetFacts(category, subject, output);
                if (facts.coveredDirections.length < 2) continue;
                const plan = isPlanView(facts.cameraElevation);
                yield {
                  where: `${category} / ${subject.anatomy} / ${directionalMode} / ${directions} #${sheetIndex} / ${plan ? 'plan' : 'elevated'}`,
                  category,
                  directions,
                  plan,
                  prompt: generatePrompt(category, subject, output),
                  yaws: facts.coveredDirections.map((direction) => OBJECT_YAW[direction]),
                };
              }
            }
          }
        }
      }
    }
  }
}

const SHEETS = [...multiViewSheets()];

/** The text of every rotation check a prompt carries, which a missing one would make vacuous. */
function checksOf(prompt: string): string {
  return ROTATION_CHECKS.map((pattern) => {
    const found = pattern.exec(prompt)?.[0];
    expect(found, pattern.source).toBeDefined();
    return found ?? '';
  }).join('\n');
}

describe('the rotation checks against the views a sheet draws', () => {
  it('names a side view only on a sheet with a 90° or 270° yaw', () => {
    const wrong = SHEETS.filter(
      ({ prompt, yaws }) =>
        SIDE_VIEW.test(checksOf(prompt)) && !yaws.some((yaw) => yaw === 90 || yaw === 270),
    ).map(({ where }) => where);

    expect(wrong).toStrictEqual([]);
  });

  it('names a front or rear view only on a sheet with both 0° and 180°', () => {
    const wrong = SHEETS.filter(
      ({ prompt, yaws }) =>
        FRONT_OR_REAR_VIEW.test(checksOf(prompt)) && !(yaws.includes(0) && yaws.includes(180)),
    ).map(({ where }) => where);

    expect(wrong).toStrictEqual([]);
  });

  it('still states the side-view and rear-view checks wherever the sheet has those views', () => {
    const missing = SHEETS.filter(({ prompt, yaws }) => {
      const checks = checksOf(prompt);
      const side = yaws.some((yaw) => yaw === 90 || yaw === 270);
      const frontAndRear = yaws.includes(0) && yaws.includes(180);
      return (side && !SIDE_VIEW.test(checks)) || (frontAndRear && !FRONT_OR_REAR_VIEW.test(checks));
    }).map(({ where }) => where);

    expect(missing).toStrictEqual([]);
  });

  it('gives an all-diagonal sheet the check it does need, at every elevation', () => {
    const diagonal = SHEETS.filter(({ yaws }) => yaws.every((yaw) => yaw % 90 === 45));

    // Six categories split `EIGHT_COMPASS` into a cardinal and a diagonal core; the sweep has to
    // reach every one of them, from overhead as well as from an elevated camera, or the assertions
    // below pass by never meeting the sheet at issue.
    expect(new Set(diagonal.map(({ category }) => category))).toStrictEqual(
      new Set(['CHARACTER', 'CREATURE', 'OBJECT', 'ITEM', 'BUILDING', 'VEHICLE']),
    );
    expect(diagonal.some(({ plan }) => plan)).toBe(true);
    expect(diagonal.some(({ plan }) => !plan)).toBe(true);
    for (const { where, prompt } of diagonal) {
      expect(checksOf(prompt), where).toContain('Every view sits on a diagonal, 45° from the nearest');
      expect(checksOf(prompt), where).toContain('a diagonal view drifted square to the front');
    }
  });

  it('states the occlusion checks between views turned towards and away where no front and rear pair exists', () => {
    const oblique = SHEETS.filter(
      ({ plan, yaws }) =>
        !plan &&
        !(yaws.includes(0) && yaws.includes(180)) &&
        yaws.some((yaw) => yaw < 90 || yaw > 270) &&
        yaws.some((yaw) => yaw > 90 && yaw < 270),
    );

    expect(new Set(oblique.map(({ directions }) => directions))).toStrictEqual(
      new Set(['THREE_CLASSIC', 'EIGHT_COMPASS']),
    );
    for (const { where, prompt } of oblique) {
      const checks = checksOf(prompt);
      expect(checks, where).toContain('A view turned away from the camera gives the rear surfaces the room');
      expect(checks, where).toContain('a view turned away from the camera that is a view turned towards it');
      expect(checks, where).toContain('Every view turned away from the camera lets rear surfaces dominate');
    }
  });

  it('never names a view turned towards or away from a camera that is directly overhead', () => {
    // From overhead a turn hides nothing, so section 3 says there is no such view to fail.
    const wrong = SHEETS.filter(
      ({ plan, prompt }) => plan && /turned (?:away from|towards) the camera/.test(checksOf(prompt)),
    ).map(({ where }) => where);

    expect(wrong).toStrictEqual([]);
  });
});
