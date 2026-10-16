import { describe, expect, it } from 'vitest';
import { sweepCorpusSheet } from './autoTuneFigures.ts';
import type { TuneOutcome } from '../src/types/autoTune.ts';

/**
 * What `constants/autoTune.ts` states about the reference sheet with the anti-aliasing at `BOTH`,
 * unkeyed and keyed. See `autoTuneFigures.ts` for why the auto-tune figure suites exist.
 *
 * The two are pinned together because the docblock compares them: keying moves the colour merge two
 * rungs, turns the cleanup on and lengthens the descent, while the anti-aliasing settles the same.
 */
function settled(outcome: TuneOutcome) {
  const {
    vote,
    colorMerge,
    fillCleanup,
    cleanupPasses,
    antiAliasThreshold,
    antiAliasRun,
    antiAliasStrength,
  } = outcome.dials;
  return {
    rounds: outcome.rounds,
    positions: outcome.candidates,
    dials: {
      vote,
      colorMerge,
      fillCleanup,
      cleanupPasses,
      antiAliasThreshold,
      antiAliasRun,
      antiAliasStrength,
    },
  };
}

describe('constants/autoTune.ts — the reference sheet with the anti-aliasing at BOTH', () => {
  it('settles the pass at a floor of 96, a run of 12 and 10%, at 0.5575 for 73 from 0.5406 for 4755', async () => {
    const outcome = await sweepCorpusSheet('armour.png', false, { antiAlias: 'BOTH' });
    expect(settled(outcome)).toEqual({
      rounds: 3,
      positions: 229,
      dials: {
        vote: 'K_CENTROID',
        colorMerge: 15,
        fillCleanup: 0,
        cleanupPasses: 1,
        antiAliasThreshold: 96,
        antiAliasRun: 12,
        antiAliasStrength: 10,
      },
    });
    expect([outcome.reading.fidelity.toFixed(4), outcome.reading.colors]).toEqual(['0.5575', 73]);
    expect([outcome.baseline.fidelity.toFixed(4), outcome.baseline.colors]).toEqual(['0.5406', 4755]);
    expect(outcome.price.perColor.toFixed(6)).toBe('0.000171');
  }, 300_000);

  it('keyed, moves the merge two rungs, turns the cleanup to 32 and takes 372 positions over four rounds', async () => {
    const outcome = await sweepCorpusSheet('armour.png', true, { antiAlias: 'BOTH' });
    expect(settled(outcome)).toEqual({
      rounds: 4,
      positions: 372,
      dials: {
        vote: 'K_CENTROID',
        colorMerge: 21,
        fillCleanup: 32,
        cleanupPasses: 4,
        antiAliasThreshold: 96,
        antiAliasRun: 12,
        antiAliasStrength: 10,
      },
    });
  }, 300_000);
});
