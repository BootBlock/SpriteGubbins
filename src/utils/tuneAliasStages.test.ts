import { describe, expect, it } from 'vitest';
import {
  TUNE_ALIAS_PALETTES,
  TUNE_ALIAS_RUNS,
  TUNE_ALIAS_STRENGTHS,
  TUNE_ALIAS_THRESHOLDS,
} from '../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { TUNE_ALIAS_STAGES } from './tuneAliasStages.ts';
import { tunedDialsOf } from './tuneStage.ts';

const DIALS: TunedDials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
const OFF: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: 4, key: null, reduction: null };
const ON: QuantiseSettings = { ...OFF, antiAlias: 'BOTH' };
const BUDGETED: QuantiseSettings = { ...ON, reduction: { kind: 'MAX_COLORS', maxColors: 16 } };

const stageNamed = (name: string) => TUNE_ALIAS_STAGES.find((stage) => stage.name === name);

describe('TUNE_ALIAS_STAGES', () => {
  it('leaves all three nothing to do while the reader has the pass off', () => {
    // The mode is the reader's, not the sweep's — see `TunedDials`. With it off these four dials
    // reach nothing, so sweeping them would have the elbow choosing between measurements of one
    // image.
    for (const stage of TUNE_ALIAS_STAGES) {
      const plan = stage.plan(DIALS, OFF);
      expect('skipped' in plan ? plan.skipped : null).toMatch(/anti-aliasing control is off/);
    }
  });

  it('sweeps each ladder end to end once the reader has pointed the pass somewhere', () => {
    for (const mode of ['INTERIOR', 'SILHOUETTE', 'BOTH'] as const) {
      const settings: QuantiseSettings = { ...OFF, antiAlias: mode };
      const contour = stageNamed('ALIAS_CONTOUR')?.plan(DIALS, settings);
      const run = stageNamed('ALIAS_RUN')?.plan(DIALS, settings);

      expect(contour && 'candidates' in contour ? contour.candidates.length : 0).toBe(
        TUNE_ALIAS_THRESHOLDS.length,
      );
      expect(run && 'candidates' in run ? run.candidates.length : 0).toBe(TUNE_ALIAS_RUNS.length);
    }
  });

  it('sweeps the blended-shades axis only where a reduction states what to keep to', () => {
    // With no reduction in force `quantiseImage` forces the snap off whatever the dial says, so both
    // positions produce the same pixels — and the stage that swept them would be twice the size for
    // nothing. The dial the reader arrived with is the one the ladder carries.
    const unbudgeted = stageNamed('ALIAS_BLEND')?.plan(DIALS, ON);
    const budgeted = stageNamed('ALIAS_BLEND')?.plan(DIALS, BUDGETED);

    expect(unbudgeted && 'candidates' in unbudgeted ? unbudgeted.candidates.length : 0).toBe(
      TUNE_ALIAS_STRENGTHS.length,
    );
    expect(budgeted && 'candidates' in budgeted ? budgeted.candidates.length : 0).toBe(
      TUNE_ALIAS_STRENGTHS.length * TUNE_ALIAS_PALETTES.length,
    );
    if (unbudgeted && 'candidates' in unbudgeted) {
      for (const candidate of unbudgeted.candidates) {
        expect(candidate.antiAliasPalette).toBe(DIALS.antiAliasPalette);
      }
    }
  });

  it('varies only its own dials, leaving the rest exactly where they were', () => {
    for (const stage of TUNE_ALIAS_STAGES) {
      const plan = stage.plan(DIALS, BUDGETED);
      if (!('candidates' in plan)) continue;
      for (const candidate of plan.candidates) {
        expect(Object.keys(candidate).sort()).toEqual(Object.keys(DIALS).sort());
        expect(candidate.vote).toBe(DIALS.vote);
        expect(candidate.colorMerge).toBe(DIALS.colorMerge);
      }
    }
  });

  it('describes where each stage left its own dials', () => {
    expect(stageNamed('ALIAS_CONTOUR')?.describe({ ...DIALS, antiAliasThreshold: 0 })).toBe('every boundary');
    expect(stageNamed('ALIAS_CONTOUR')?.describe({ ...DIALS, antiAliasThreshold: 32 })).toBe(
      'boundaries past 32',
    );
    expect(stageNamed('ALIAS_RUN')?.describe({ ...DIALS, antiAliasRun: 4 })).toBe('runs of 4 and longer');
    expect(
      stageNamed('ALIAS_BLEND')?.describe({ ...DIALS, antiAliasStrength: 60, antiAliasPalette: 'BLEND' }),
    ).toBe('60% BLEND');
  });
});
