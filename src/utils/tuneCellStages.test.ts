import { describe, expect, it } from 'vitest';
import {
  TUNE_CLEANUP_PASSES,
  TUNE_COLOR_MERGES,
  TUNE_FILL_CLEANUPS,
  TUNE_INK_THRESHOLDS,
  TUNE_LINE_STRENGTHS,
  TUNE_OUTLINE_EXPANSIONS,
  TUNE_TRIM_STRENGTHS,
} from '../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';
import { TUNE_CELL_STAGES } from './tuneCellStages.ts';
import { tunedDialsOf } from './tuneStage.ts';

const DIALS: TunedDials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: 4, key: null, reduction: null };

const stageNamed = (name: string) => TUNE_CELL_STAGES.find((stage) => stage.name === name);

describe('TUNE_CELL_STAGES', () => {
  it('sweeps the reading across every vote and every expansion', () => {
    const plan = stageNamed('READING')?.plan(DIALS, SETTINGS);

    expect(plan && 'candidates' in plan ? plan.candidates.length : 0).toBe(
      VOTE_METHODS.length * TUNE_OUTLINE_EXPANSIONS.length,
    );
  });

  it('varies only its own dials, leaving the rest exactly where they were', () => {
    for (const stage of TUNE_CELL_STAGES) {
      const plan = stage.plan({ ...DIALS, vote: 'INK_WEIGHTED', fillCleanup: 16 }, SETTINGS);
      if (!('candidates' in plan)) continue;
      for (const candidate of plan.candidates) {
        // Whatever a stage changes, the twelve fields it hands on are still the twelve it was given.
        expect(Object.keys(candidate).sort()).toEqual(Object.keys(DIALS).sort());
      }
    }
  });

  it('leaves the two ink stages nothing to do under a reading that blends no ink', () => {
    for (const vote of ['DOMINANT', 'K_CENTROID'] as const) {
      for (const name of ['INK_BLEND', 'INK_THRESHOLD']) {
        const plan = stageNamed(name)?.plan({ ...DIALS, vote }, SETTINGS);
        expect(plan && 'skipped' in plan ? plan.skipped : null).toMatch(/blends no ink/);
      }
    }
  });

  it('sweeps the two ink stages under the ink-weighted reading', () => {
    const inked: TunedDials = { ...DIALS, vote: 'INK_WEIGHTED' };
    const blend = stageNamed('INK_BLEND')?.plan(inked, SETTINGS);
    const threshold = stageNamed('INK_THRESHOLD')?.plan(inked, SETTINGS);

    expect(blend && 'candidates' in blend ? blend.candidates.length : 0).toBe(
      TUNE_LINE_STRENGTHS.length * TUNE_TRIM_STRENGTHS.length,
    );
    expect(threshold && 'candidates' in threshold ? threshold.candidates.length : 0).toBe(
      TUNE_INK_THRESHOLDS.length,
    );
  });

  it('sweeps the two colour stages whatever the reading', () => {
    const merge = stageNamed('COLOUR_MERGE')?.plan(DIALS, SETTINGS);
    const cleanup = stageNamed('FILL_CLEANUP')?.plan(DIALS, SETTINGS);

    expect(merge && 'candidates' in merge ? merge.candidates.length : 0).toBe(TUNE_COLOR_MERGES.length);
    expect(cleanup && 'candidates' in cleanup ? cleanup.candidates.length : 0).toBe(
      TUNE_FILL_CLEANUPS.length,
    );
  });

  it('leaves the passes stage nothing to do while the fill cleanup is off', () => {
    const off = stageNamed('CLEANUP_PASSES')?.plan({ ...DIALS, fillCleanup: 0 }, SETTINGS);
    const on = stageNamed('CLEANUP_PASSES')?.plan({ ...DIALS, fillCleanup: 24 }, SETTINGS);

    expect(off && 'skipped' in off ? off.skipped : null).toMatch(/nothing to run over/);
    expect(on && 'candidates' in on ? on.candidates.length : 0).toBe(TUNE_CLEANUP_PASSES.length);
  });

  it('describes where each stage left its own dials', () => {
    expect(stageNamed('READING')?.describe({ ...DIALS, vote: 'INK_WEIGHTED', outlineExpansion: 2 })).toBe(
      'INK_WEIGHTED, expansion 2',
    );
    expect(stageNamed('INK_BLEND')?.describe({ ...DIALS, lineStrength: 2.5, trimStrength: 1 })).toBe(
      'line 2.5, trim 1.0',
    );
    expect(stageNamed('INK_THRESHOLD')?.describe({ ...DIALS, inkThreshold: 72 })).toBe('ink below 72');
    expect(stageNamed('COLOUR_MERGE')?.describe({ ...DIALS, colorMerge: 0 })).toBe('merge off');
    expect(stageNamed('COLOUR_MERGE')?.describe({ ...DIALS, colorMerge: 12 })).toBe('merge 12');
    expect(stageNamed('FILL_CLEANUP')?.describe({ ...DIALS, fillCleanup: 0 })).toBe('cleanup off');
    expect(stageNamed('CLEANUP_PASSES')?.describe({ ...DIALS, cleanupPasses: 1 })).toBe('1 pass');
    expect(stageNamed('CLEANUP_PASSES')?.describe({ ...DIALS, cleanupPasses: 3 })).toBe('3 passes');
  });
});
