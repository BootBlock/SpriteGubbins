import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEPTH_ORDER_TEXT, describeDirections, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { batchComponentCount } from './componentSet.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetIdentity, sheetRuns } from './sheetRuns.ts';

/**
 * The batch an N-direction rig actually is, once every sheet of it has been compiled.
 *
 * `baseline-prompt-new.md` §4: eight facings of a cut-out rig is 120 pieces, far past what a
 * generation delivers, so the workflow is eight sheets of fifteen sharing one identity lock. What
 * these assertions protect is that the eight are genuinely *different sheets of the same subject* —
 * eight identical prompts would be the same failure as one oversized one, and eight unrelated ones
 * would return eight different characters.
 *
 * Which sheets the batch holds, and where in it a configuration sits, are `sheetBatch.test.ts`'s —
 * this file is about the prompts hung off that list.
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

/**
 * What a compiled prompt says its own sheet contracts for — section 0's first line.
 *
 * Read back out of the text rather than recomputed, so the batch total below is checked against what
 * the user will actually be asking for eight times over rather than against a second sum of the same
 * plans.
 */
function statedCount(promptText: string): number {
  const stated = /Exactly (\d+) components/.exec(promptText)?.[1];
  if (stated === undefined) throw new Error('every prompt states its own component count.');
  return Number(stated);
}

describe('sheetRuns', () => {
  it('turns eight facings into eight distinct prompts', () => {
    const runs = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);

    expect(runs).toHaveLength(DIRECTION_LISTS.EIGHT_COMPASS.length);
    expect(runs.map((run) => run.assembly)).toEqual([...DIRECTION_LISTS.EIGHT_COMPASS]);
    // Distinct *text*, not merely distinct labels: a split that produced the same prompt eight times
    // would be the manual workflow with extra steps.
    expect(new Set(runs.map((run) => run.promptText)).size).toBe(runs.length);
  });

  it('names its own facing and its own depth order in each prompt', () => {
    // Depth order is the thing that actually differs. The pieces are identical across the eight, and
    // which side renders in front of the body is what stops a west-facing sheet being a mirrored
    // east-facing one.
    for (const run of sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG)) {
      expect(run.promptText).toContain(`- Primary assembly direction: ${describeDirections([run.assembly])}`);
      expect(run.promptText).toContain(DEPTH_ORDER_TEXT[run.assembly]);
      expect(run.promptText).toContain(
        `- Directions required: ${run.assembly.charAt(0).toUpperCase()}${run.assembly.slice(1)}`,
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
      expect(run.output.primaryDirection).toBe(run.assembly);
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
    expect(runs[0]?.assembly).toBe('front');
  });

  it('produces the series with its run sheets expanded, one per facing', () => {
    // Both axes at once. An eight-compass character pairing is two core sheets — the cardinals and
    // the diagonals, since eight nearly adjacent views on one page is what a generator blurs — and
    // then the articulation run at each of the eight facings, because a front-facing limb cannot
    // hang on a side-facing trunk.
    const runs = sheetRuns('CHARACTER', SUBJECT, {
      ...EIGHT_WAY_RIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });

    expect(runs.map((run) => run.plan.name)).toEqual([
      'Directional core — cardinal facings',
      'Directional core — diagonal facings',
      ...Array.from({ length: 8 }, () => 'Articulation'),
    ]);
    expect(runs.map((run) => run.covered.length)).toEqual([4, 4, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(runs.slice(2).map((run) => run.assembly)).toEqual([...DIRECTION_LISTS.EIGHT_COMPASS]);
    expect(new Set(runs.map((run) => run.promptText)).size).toBe(runs.length);
    expect(runs.map((run) => run.output.sheetIndex)).toEqual([0, 1, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('gives the two sheets of a series different identities, and each the config that reproduces it', () => {
    // Same subject, same facing, same everything but which part of the inventory is on the sheet —
    // so a progress tracker keyed on anything coarser would tick both off when either was copied.
    const output = withOutput({ ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' });
    const runs = sheetRuns('CHARACTER', SUBJECT, output);

    const identities = runs.map((run) => sheetIdentity('CHARACTER', SUBJECT, run.output));
    expect(new Set(identities).size).toBe(runs.length);
    for (const run of runs) expect(generatePrompt('CHARACTER', SUBJECT, run.output)).toBe(run.promptText);
  });

  it('keeps a sheet’s identity across a change the sheet never reads', () => {
    // The false dependency that keying on the raw fields carried. A multi-view core ignores the
    // primary facing, so a user who visited a rig mode, changed it and came back would have found a
    // finished batch reported as unstarted. The direction *set* is a real dependency now — it
    // decides which views the core draws — so only the facing is exercised here.
    const output = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' });
    const moved = withOutput({ ...output, primaryDirection: 'north' });

    expect(generatePrompt('CHARACTER', SUBJECT, moved)).toBe(generatePrompt('CHARACTER', SUBJECT, output));
    expect(sheetIdentity('CHARACTER', SUBJECT, moved)).toBe(sheetIdentity('CHARACTER', SUBJECT, output));
  });

  it('changes a sheet’s identity when the direction set changes the views it draws', () => {
    // The other half of the same coin: the set steers the core now, so a four-cardinal core and an
    // eight-compass cardinal core are different sheets with different prompts — a tracker that kept
    // ticking runs off across that change would be reporting progress on a batch that no longer
    // exists.
    const output = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' });
    const moved = withOutput({ ...output, directions: 'FIVE_CLASSIC' });

    expect(sheetIdentity('CHARACTER', SUBJECT, moved)).not.toBe(sheetIdentity('CHARACTER', SUBJECT, output));
  });

  it('tells each run which sheet of the batch it is', () => {
    // The half a run used to leave unsaid: eight prompts that differed only in their facing, each
    // describing its own fifteen components as the whole deliverable. The ordinal has to be the row
    // number the drawer shows, so it is asserted here against the position in this very list.
    const runs = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);

    for (const [index, run] of runs.entries()) {
      expect(run.promptText, run.assembly).toContain(
        `**This is sheet ${String(index + 1)} of ${String(runs.length)} of one deliverable`,
      );
      expect(run.promptText, run.assembly).toContain('### The sheets in this series');
    }
  });

  it('prices the batch at the sum of what its own prompts contract for', () => {
    // The figure the app produced and never stated. It is asserted against the prompts rather than
    // against an arithmetic of its own, because that is the claim the drawer makes when it shows it:
    // this is what you are about to ask for, across these runs.
    const runs = sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG);
    const stated = runs.reduce((total, run) => total + statedCount(run.promptText), 0);
    const [first] = runs;
    if (!first) throw new Error('the rig should split into runs.');

    expect(batchComponentCount('CHARACTER', runs, [])).toBe(stated);
    // And it is emphatically not the per-sheet figure the studio reports beside the prompt, which is
    // the whole of the gap: "this sheet asks for 15" is true of all eight of them.
    expect(stated).toBeGreaterThan(statedCount(first.promptText));
  });

  it('counts a subject’s additional anatomy once per facing, as the prompts do', () => {
    // Each facing's sheet draws the tail and contracts for it, so the batch total has to carry it
    // eight times. The prompts are the arbiter: a total the runs do not add up to is a number the
    // user cannot reconcile with anything they are about to paste.
    const subject = { ...SUBJECT, additional_anatomy: 'Demon Horn ×2, Tail ×1' };
    const runs = sheetRuns('CHARACTER', subject, EIGHT_WAY_RIG);
    const anatomy = parseAdditionalAnatomy(subject.additional_anatomy);

    const total = batchComponentCount('CHARACTER', runs, anatomy);
    expect(total).toBe(runs.reduce((sum, run) => sum + statedCount(run.promptText), 0));
    expect(total).toBe(batchComponentCount('CHARACTER', runs, []) + 3 * runs.length);
  });

  it('sums the sheets of a series, which do not cost the same', () => {
    // The other axis, and the case a multiplication has no answer for: a directional core and an
    // articulation sheet are two different inventories, so there is no per-sheet figure to multiply.
    const runs = sheetRuns('CHARACTER', SUBJECT, {
      ...EIGHT_WAY_RIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });
    const stated = runs.map((run) => statedCount(run.promptText));

    expect(new Set(stated).size).toBe(2);
    expect(batchComponentCount('CHARACTER', runs, [])).toBe(
      stated.reduce((total, count) => total + count, 0),
    );
  });
});
