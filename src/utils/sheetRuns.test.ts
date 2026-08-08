import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEPTH_ORDER_TEXT, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetIdentity, sheetRunCount, sheetRuns, splitsIntoFacingRuns } from './sheetRuns.ts';

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

describe('splitsIntoFacingRuns', () => {
  it('is true only for a run list: one facing at a time, over a set naming more than one', () => {
    expect(splitsIntoFacingRuns(EIGHT_WAY_RIG)).toBe(true);
    expect(splitsIntoFacingRuns({ ...EIGHT_WAY_RIG, directions: 'SINGLE_FRONT' })).toBe(false);
    // The mode names its own five facings, so the chosen set buys no runs at all — whatever it says.
    // That mode still splits, by the *other* axis: two sheets of one series, counted below.
    expect(splitsIntoFacingRuns({ ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' })).toBe(
      false,
    );
  });
});

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
    // which arm renders in front of the torso is what stops a west-facing sheet being a mirrored
    // east-facing one.
    for (const run of sheetRuns('CHARACTER', SUBJECT, EIGHT_WAY_RIG)) {
      expect(run.promptText).toContain(`- Primary assembly direction: ${run.assembly}`);
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

  it('produces one run per sheet of the plan’s own series, on one facing', () => {
    // The second axis. `CORE_DIRECTIONAL_VARIANTS` covers its own five facings, so the direction set
    // buys no runs at all — and a CHARACTER's five-view core plus its thirty-four limb variants is
    // forty-nine components, past what one generation returns, so the pairing is two sheets. The
    // facing labels are the mode's own: reading the chosen set's first would report `south`.
    const runs = sheetRuns('CHARACTER', SUBJECT, {
      ...EIGHT_WAY_RIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });

    expect(runs.map((run) => run.name)).toEqual(['Directional core', 'Articulation']);
    expect(runs.map((run) => run.assembly)).toEqual(['front', 'front']);
    expect(new Set(runs.map((run) => run.promptText)).size).toBe(2);
    expect(runs.map((run) => run.output.sheetIndex)).toEqual([0, 1]);
    // The two sheets assemble towards the same facing and do *not* cover the same ones, which is why
    // a row cannot be labelled from the assembly direction alone: both would read `front` while one
    // draws five views and the other draws one.
    expect(runs.map((run) => run.covered.length)).toEqual([5, 1]);
  });

  it('resolves the mode on both axes, so an unsupported pairing cannot be split by a set it discards', () => {
    // An ITEM has no cut-out rig, so the compiler resolves the pairing to that category's default —
    // which covers its own facings and ignores `primaryDirection` entirely. Counting the facings from
    // the *stored* mode while counting the sheets from the resolved one offered eight runs whose
    // prompts were byte-identical, and one copy ticked all eight off.
    const unsupported = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
    });

    expect(sheetRunCount('ITEM', unsupported)).toBe(1);
    const runs = sheetRuns('ITEM', SUBJECT, unsupported);
    expect(runs).toHaveLength(1);
    expect(sheetRunCount('ITEM', unsupported)).toBe(runs.length);
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
    // The false dependency that keying on the raw fields carried. `CORE_DIRECTIONAL_VARIANTS`
    // discards both the direction set and the primary facing, so a user who visited a rig mode,
    // changed the set and came back would have found a finished batch reported as unstarted.
    const output = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' });
    const moved = withOutput({ ...output, directions: 'EIGHT_COMPASS', primaryDirection: 'north-east' });

    expect(generatePrompt('CHARACTER', SUBJECT, moved)).toBe(generatePrompt('CHARACTER', SUBJECT, output));
    expect(sheetIdentity('CHARACTER', SUBJECT, moved)).toBe(sheetIdentity('CHARACTER', SUBJECT, output));
  });

  it('multiplies the two axes, and counts them without compiling anything', () => {
    // A rig is one sheet over eight facings; a character's directional core is two sheets over one.
    // The count is what the studio's split button reads on every keystroke, so it has to agree with
    // the list without paying to compile it.
    const series = { ...EIGHT_WAY_RIG, directionalMode: 'CORE_DIRECTIONAL_VARIANTS' as const };

    expect(sheetRunCount('CHARACTER', EIGHT_WAY_RIG)).toBe(DIRECTION_LISTS.EIGHT_COMPASS.length);
    expect(sheetRunCount('CHARACTER', series)).toBe(2);
    // An OBJECT's five views are thirty components, which fits one sheet — so the same mode is a
    // batch for one category and a single generation for another.
    expect(sheetRunCount('OBJECT', series)).toBe(1);

    for (const config of [EIGHT_WAY_RIG, series]) {
      expect(sheetRuns('CHARACTER', SUBJECT, config)).toHaveLength(sheetRunCount('CHARACTER', config));
    }
  });
});
