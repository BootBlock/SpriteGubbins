import {
  TUNE_ALIAS_PALETTES,
  TUNE_ALIAS_RUNS,
  TUNE_ALIAS_STRENGTHS,
  TUNE_ALIAS_THRESHOLDS,
} from '../constants/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import { ladder, type TuneStage } from './tuneStage.ts';

/**
 * The three stages that decide how much of a contour's staircase is softened back, last in the
 * pipeline and last in the descent.
 *
 * **The sweep shapes the anti-aliasing pass; it never decides whether to run it.** Where that control
 * is pointed — `OFF`, `INTERIOR`, `SILHOUETTE` or `BOTH` — is a statement about style rather than an
 * answer a likeness score can give, which is the same line the keying dials sit on the far side of. A
 * great deal of pixel art is aliased on purpose and the app opens with the pass off for that reason;
 * a sweep that turned it on unasked would be answering a question about taste with a measurement. So
 * all three stages skip while the reader has it off, and where the reader has turned it on they find
 * how much softening is worth its colours. See `TunedDials`, which is where the mode's absence is the
 * definition rather than an oversight.
 *
 * **Three stages rather than one grid over three dials**, which is the descent's own argument applied
 * once more: 10 × 8 × 20 is 1600 positions where 10 + 8 + 20 is 38, and the two contour dials are near
 * enough independent to descend separately — one filters a boundary by contrast and the other by
 * length. The strength and the blended-shades position *are* swept together, because they are one
 * question asked twice: how far a blend travels, and whether the far end of that travel is allowed to
 * be a colour the sheet did not hold.
 *
 * **The rounds are what recover what splitting them costs.** A contrast floor chosen against the run
 * the reader arrived with is re-chosen next round against the run this stage settled, which is the
 * whole reason the descent goes round at all — see `TUNE_ROUNDS`.
 */
export const TUNE_ALIAS_STAGES: readonly TuneStage[] = [
  {
    name: 'ALIAS_CONTOUR',
    dials: ['antiAliasThreshold'],
    plan: (settled, settings) =>
      settings.antiAlias === 'OFF'
        ? { skipped: ALIAS_OFF }
        : {
            candidates: ladder(
              TUNE_ALIAS_THRESHOLDS.map((antiAliasThreshold) => ({ ...settled, antiAliasThreshold })),
            ),
          },
    describe: (settled) =>
      settled.antiAliasThreshold === 0
        ? 'every boundary'
        : `boundaries past ${String(settled.antiAliasThreshold)}`,
  },
  {
    name: 'ALIAS_RUN',
    dials: ['antiAliasRun'],
    plan: (settled, settings) =>
      settings.antiAlias === 'OFF'
        ? { skipped: ALIAS_OFF }
        : { candidates: ladder(TUNE_ALIAS_RUNS.map((antiAliasRun) => ({ ...settled, antiAliasRun }))) },
    describe: (settled) => `runs of ${String(settled.antiAliasRun)} and longer`,
  },
  {
    name: 'ALIAS_BLEND',
    dials: ['antiAliasStrength', 'antiAliasPalette'],
    plan: (settled, settings) => {
      if (settings.antiAlias === 'OFF') return { skipped: ALIAS_OFF };
      // The blended-shades position is read only where a reduction states which colours the sheet is
      // made of — the gate `quantiseImage` keeps at the call site, and the one `AntiAliasPalette`
      // argues for. With none in force both positions produce the same pixels, so sweeping the axis
      // would double the stage to have the elbow choose between two measurements of one image.
      const palettes = settings.reduction === null ? [settled.antiAliasPalette] : TUNE_ALIAS_PALETTES;
      return {
        candidates: ladder(
          TUNE_ALIAS_STRENGTHS.flatMap((antiAliasStrength) =>
            palettes.map((antiAliasPalette): TunedDials => ({
              ...settled,
              antiAliasStrength,
              antiAliasPalette,
            })),
          ),
        ),
      };
    },
    describe: (settled) => `${String(settled.antiAliasStrength)}% ${settled.antiAliasPalette}`,
  },
];

/** Said by all three stages when the reader has pointed the pass nowhere. */
const ALIAS_OFF = 'The anti-aliasing control is off, so its dials reach nothing.';
