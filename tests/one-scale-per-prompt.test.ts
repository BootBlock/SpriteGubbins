import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { PRESETS } from '../src/constants/presets/index.ts';
import { UNSUNG_SAVIOUR_HUMANOID_RIG } from '../src/constants/presets/unsungSaviourRig.ts';
import { modesFor } from '../src/constants/sheetPlans/index.ts';
import { assemblyBaseSubjectsOf, standardSubjectOf } from '../src/test/assemblyBaseSubjects.ts';
import { RESOLUTION_PROFILES } from '../src/types/output.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import { withCompanionOutputs } from '../src/utils/imageConfig.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * Whether a compiled prompt states one scale, or two a line apart (issue #405).
 *
 * `HIGH_RESOLUTION`, `MID_RESOLUTION` and `RETRO_16_BIT` each state a scale of their own — a share of
 * the largest component's cell, or a height in pixels — and `CUSTOM` is the profile that defers to a
 * stated size. The target-size line was once printed under all four, so nineteen shipped presets
 * compiled a share or a retro height directly above a pixel size: the Unsung Saviour tileset asked
 * for its largest tile at 50–65% of a 256 px cell beside “48 × 48 px per tile”, 2.7 to 3.5 times the
 * size it stated. Nothing compared the two lines, because each was right on its own.
 *
 * **It reads the compiled prompt**, for the reason `resolution-profile-fit.test.ts` does: the gate
 * is one function, and a check calling that function would agree with itself whatever the prompt
 * said.
 */

/** Section 2's profile line, wherever it is. */
const PROFILE_LINE = /^- Resolution profile: (.*)$/m;

/** Either wording of section 2's target-size line. */
const TARGET_LINE = /^- Target (?:component|assembled) size/m;

/** Whether the profile line states a scale of its own, which every profile but `CUSTOM` does. */
function statesOwnScale(prompt: string): boolean {
  const line = PROFILE_LINE.exec(prompt)?.[1] ?? '';
  expect(line).not.toBe('');
  return !line.startsWith('Custom — ');
}

describe('one scale per prompt', () => {
  it('prints a target size only under CUSTOM, on every sheet mode of every category', () => {
    const clashes: string[] = [];
    const missing: string[] = [];

    for (const category of SUBJECT_CATEGORIES) {
      for (const subject of assemblyBaseSubjectsOf(category)) {
        for (const directionalMode of modesFor(category, subject)) {
          const directions = CATEGORY_DIRECTION_SETS[category][0];
          for (const resolutionProfile of RESOLUTION_PROFILES) {
            const where = `${category} / ${subject.anatomy} / ${directionalMode} / ${resolutionProfile}`;
            const prompt = generatePrompt(category, subject, {
              ...DEFAULT_OUTPUT_CONFIG,
              renderStyle: 'PIXEL_ART',
              directionalMode,
              directions,
              resolutionProfile,
              spriteTargetSize: '16 × 16 px',
            });
            const hasTarget = TARGET_LINE.test(prompt);

            if (statesOwnScale(prompt) && hasTarget) clashes.push(where);
            if (resolutionProfile === 'CUSTOM' && !hasTarget) missing.push(where);
          }
        }
      }
    }

    expect(clashes).toStrictEqual([]);
    // The other half, so the first cannot pass by the line never being printed at all.
    expect(missing).toStrictEqual([]);
  });

  it('holds for every shipped preset, in the studio a reader loads it into', () => {
    const clashes = PRESETS.filter((preset) => {
      const prompt = generatePrompt(
        preset.category,
        preset.subject,
        withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG),
      );
      return statesOwnScale(prompt) && TARGET_LINE.test(prompt);
    }).map((preset) => preset.name);

    expect(clashes).toStrictEqual([]);
  });

  it('lets a rig contract, not the stored profile, state the scale of the sheet it describes', () => {
    // The engine's frame and every piece's size are a scale, so a stock profile stored beside a
    // loaded rig would be a second one; the contract resolves the profile to `CUSTOM` on its sheet.
    for (const resolutionProfile of RESOLUTION_PROFILES) {
      const prompt = generatePrompt('CHARACTER', standardSubjectOf('CHARACTER'), {
        ...DEFAULT_OUTPUT_CONFIG,
        renderStyle: 'PIXEL_ART',
        directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
        rigMode: 'CUTOUT_RIG',
        resolutionProfile,
        rigContract: UNSUNG_SAVIOUR_HUMANOID_RIG,
      });

      expect(statesOwnScale(prompt), resolutionProfile).toBe(false);
      expect(prompt, resolutionProfile).toMatch(TARGET_LINE);
    }
  });
});
