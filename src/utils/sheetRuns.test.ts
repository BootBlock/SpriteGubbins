import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEPTH_ORDER_TEXT, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetIdentity, sheetRuns, splitsIntoRuns } from './sheetRuns.ts';

/**
 * The batch an N-direction rig actually is.
 *
 * `baseline-prompt-new.md` §4: eight facings of a cut-out rig is 120 pieces, far past what a
 * generation delivers, so the workflow is eight sheets of fifteen sharing one identity lock. What
 * these assertions protect is that the eight are genuinely *different sheets of the same subject* —
 * eight identical prompts would be the same failure as one oversized one, and eight unrelated ones
 * would return eight different characters.
 */
const SUBJECT = defaultSubjectFor('CHARACTER');

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

/** A cut-out rig over all eight compass points: the case the splitter exists for. */
const EIGHT_WAY_RIG = withOutput({
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  rigMode: 'CUTOUT_RIG',
  directions: 'EIGHT_COMPASS',
  identityLock: 'Cyan visor across the upper face, three amber chest lights in a vertical row.',
});

const runsCount = DIRECTION_LISTS.EIGHT_COMPASS.length;

describe('splitsIntoRuns', () => {
  it('is true only for a run list: one facing at a time, over a set naming more than one', () => {
    expect(splitsIntoRuns(EIGHT_WAY_RIG)).toBe(true);
    expect(splitsIntoRuns({ ...EIGHT_WAY_RIG, directions: 'SINGLE_FRONT' })).toBe(false);
    // The mode already draws three facings on one sheet, so its inventory covers them all — there
    // is nothing here to split, whatever the direction control says.
    expect(splitsIntoRuns({ ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' })).toBe(false);
  });
});

describe('sheetRuns', () => {
  it('turns eight facings into eight distinct prompts', () => {
    const runs = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);

    expect(runs).toHaveLength(DIRECTION_LISTS.EIGHT_COMPASS.length);
    expect(runs.map((run) => run.direction)).toEqual([...DIRECTION_LISTS.EIGHT_COMPASS]);
    // Distinct *text*, not merely distinct labels: a split that produced the same prompt eight times
    // would be the manual workflow with extra steps.
    expect(new Set(runs.map((run) => run.promptText)).size).toBe(runs.length);
  });

  it('names its own facing and its own depth order in each prompt', () => {
    // Depth order is the thing that actually differs. The pieces are identical across the eight, and
    // which arm renders in front of the torso is what stops a west-facing sheet being a mirrored
    // east-facing one.
    for (const run of sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG)) {
      expect(run.promptText).toContain(`- Primary assembly direction: ${run.direction}`);
      expect(run.promptText).toContain(DEPTH_ORDER_TEXT[run.direction]);
      expect(run.promptText).toContain(
        `- Directions required: ${run.direction.charAt(0).toUpperCase()}${run.direction.slice(1)}`,
      );
    }
  });

  it('carries one identity lock across all eight', () => {
    // §5: the hardest part is not sheet one, it is sheet two matching sheet one. Eight sheets that
    // did not share the lock would return eight different characters in similar colours.
    for (const run of sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG)) {
      expect(run.output.identityLock).toBe(EIGHT_WAY_RIG.identityLock);
      expect(run.promptText).toContain(EIGHT_WAY_RIG.identityLock);
    }
  });

  it('gives each run the configuration that reproduces it', () => {
    // What makes a logged run restorable *as itself*. The run's output differs from the batch's in
    // exactly one field, and compiling the studio from it has to return that run's own text —
    // otherwise a history entry would show one prompt and restore to another.
    //
    // Restoring one does *not* collapse the batch: the direction set is still the run list, so the
    // splitter reopens on all eight with this facing pinned as the studio's current sheet.
    for (const run of sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG)) {
      expect(run.output.primaryDirection).toBe(run.direction);
      expect(generatePrompt('CHARACTER', SUBJECT, run.output)).toBe(run.promptText);
      expect(sheetRuns('CHARACTER', SUBJECT, run.output)).toHaveLength(runsCount);
    }
  });

  it('keeps a run’s identity when the identity lock is added part-way through the batch', () => {
    // The case that killed the obvious implementation. §5 advises writing the lock from the first
    // sheet you accept, and the lock is compiled into every run — so matching progress on prompt
    // text declared all eight runs unstarted at exactly the moment the user followed that advice.
    const unlocked = withOutput({ ...EIGHT_WAY_RIG, identityLock: '' });
    const [firstUnlocked] = sheetRuns('CHARACTER', SUBJECT, unlocked);
    const [firstLocked] = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);
    if (!firstUnlocked || !firstLocked) throw new Error('the rig should split into runs.');

    // The prompts genuinely differ...
    expect(firstUnlocked.promptText).not.toBe(firstLocked.promptText);
    // ...and it is still the same sheet of the same batch.
    expect(sheetIdentity('CHARACTER', SUBJECT, firstUnlocked.output)).toBe(
      sheetIdentity('CHARACTER', SUBJECT, firstLocked.output),
    );
  });

  it('gives every facing its own identity, and a different subject a different one', () => {
    const identities = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG).map((run) =>
      sheetIdentity('CHARACTER', SUBJECT, run.output),
    );
    expect(new Set(identities).size).toBe(runsCount);

    // Editing the subject makes these different sheets of a different character, and progress
    // against them should not carry over.
    const [first] = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);
    if (!first) throw new Error('the rig should split into runs.');
    expect(sheetIdentity('CHARACTER', { ...SUBJECT, species: 'Something else' }, first.output)).not.toBe(
      sheetIdentity('CHARACTER', SUBJECT, first.output),
    );
  });

  it('produces one run for a single-facing set', () => {
    const runs = sheetRuns('CHARACTER', SUBJECT, { ...EIGHT_WAY_RIG, directions: 'SINGLE_FRONT' });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.direction).toBe('front');
  });

  it('produces one run for a mode that already covers its own facings', () => {
    // And labels it with the facing that mode assembles towards — `CORE_DIRECTIONAL_VARIANTS` draws
    // front-three-quarter however the direction control is set, so reading the chosen set's first
    // facing here would report `south`.
    const runs = sheetRuns('CHARACTER', SUBJECT, {
      ...EIGHT_WAY_RIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.direction).toBe('front-three-quarter');
  });
});
