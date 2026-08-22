import { ANTI_ALIAS_GUIDANCE } from '../../constants/antiAlias.ts';
import {
  ANTI_ALIAS_MODE_CHOICES,
  ANTI_ALIAS_PALETTE_CHOICES,
  ANTI_ALIAS_RUN_RANGE,
  ANTI_ALIAS_STRENGTH_RANGE,
  ANTI_ALIAS_THRESHOLD_RANGE,
  QUANTISE_TOOLTIPS,
} from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { AntiAliasMode } from '../../types/quantiser.ts';
import { RangeField } from '../common/RangeField.tsx';
import { SelectField } from '../common/SelectField.tsx';

interface AntiAliasControlsProps {
  /**
   * Whether a colour setting is constraining this sheet, and therefore whether a blend has anything
   * to be kept to.
   *
   * A prop rather than a sixth store read, for the reason `DownscaleControls` takes `dithers` as
   * one: the answer is the studio's colour setting resolved against a palette locked on this tab,
   * which `colorPlanFor` decides once and every panel here is handed rather than re-deriving.
   */
  readonly constrained: boolean;
}

/**
 * Anti-aliasing, and the four dials that shape it: how much of the sheet is softened, what counts as
 * a contour, how hard, and how short a step is worth softening.
 *
 * **The only panel on this tab whose pass puts smooth colour back.** Every other control here works
 * toward the flat result that turns a returned render into pixel art; this one softens the staircase
 * that leaves behind, which is the edit a pixel artist makes by hand once the shape is settled. It is
 * last of the dial panels for the same reason its pass is last in the pipeline.
 *
 * **It reports nothing, and that is deliberate rather than a gap.** Every panel above it holds a
 * *reading* — a keyed share, a sprite count, an axis, a strip — that a reader has no other way to
 * get. What this pass does is visible in the preview beside it at the magnification the control
 * offers, which is also the only place it can honestly be judged: a count of softened pixels would be
 * a number nobody could act on, and it would invite reading a fringe as a score.
 *
 * **The dials are withdrawn where they would change nothing**, which is the conditional every panel
 * on this tab uses. The three shaping dials appear only once the pass is on, and the palette control
 * only once a colour setting is constraining the sheet — with none in force there is no statement of
 * which colours the sheet is made of, so there is nothing for a blend to be kept to.
 */
export function AntiAliasControls({ constrained }: AntiAliasControlsProps) {
  const mode = useQuantiseStore((state) => state.antiAlias);
  const threshold = useQuantiseStore((state) => state.antiAliasThreshold);
  const strength = useQuantiseStore((state) => state.antiAliasStrength);
  const run = useQuantiseStore((state) => state.antiAliasRun);
  const palette = useQuantiseStore((state) => state.antiAliasPalette);
  const setAntiAlias = useQuantiseStore((state) => state.setAntiAlias);
  const setAntiAliasThreshold = useQuantiseStore((state) => state.setAntiAliasThreshold);
  const setAntiAliasStrength = useQuantiseStore((state) => state.setAntiAliasStrength);
  const setAntiAliasRun = useQuantiseStore((state) => state.setAntiAliasRun);
  const setAntiAliasPalette = useQuantiseStore((state) => state.setAntiAliasPalette);

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <p className="text-xs font-semibold text-ink-muted">Anti-aliasing</p>

      <div className="mt-4 space-y-3">
        <div className="max-w-md">
          <SelectField
            label="Anti-aliasing"
            tooltip={QUANTISE_TOOLTIPS.antiAlias}
            value={mode}
            choices={ANTI_ALIAS_MODE_CHOICES}
            onChange={setAntiAlias}
          />
        </div>

        {mode !== 'OFF' && (
          <>
            <RangeField
              label="Contrast floor"
              tooltip={QUANTISE_TOOLTIPS.antiAliasThreshold}
              value={threshold}
              min={ANTI_ALIAS_THRESHOLD_RANGE.min}
              max={ANTI_ALIAS_THRESHOLD_RANGE.max}
              step={ANTI_ALIAS_THRESHOLD_RANGE.step}
              // `every edge` rather than `off`, because zero here is the loosest position rather than
              // the pass not running — the select above is what switches it off.
              format={(value) => (value === 0 ? 'every edge' : String(value))}
              onChange={setAntiAliasThreshold}
            />
            <RangeField
              label="Strength"
              tooltip={QUANTISE_TOOLTIPS.antiAliasStrength}
              value={strength}
              min={ANTI_ALIAS_STRENGTH_RANGE.min}
              max={ANTI_ALIAS_STRENGTH_RANGE.max}
              step={ANTI_ALIAS_STRENGTH_RANGE.step}
              format={(value) => `${String(value)}%`}
              onChange={setAntiAliasStrength}
            />
            <RangeField
              label="Shortest run"
              tooltip={QUANTISE_TOOLTIPS.antiAliasRun}
              value={run}
              min={ANTI_ALIAS_RUN_RANGE.min}
              max={ANTI_ALIAS_RUN_RANGE.max}
              step={ANTI_ALIAS_RUN_RANGE.step}
              // The floor keeps every run the reconstruction blends at all, so it is named for what
              // it does rather than by its number — see `DEFAULT_ANTI_ALIAS_RUN`.
              format={(value) => (value === ANTI_ALIAS_RUN_RANGE.min ? 'every run' : `${String(value)} px`)}
              onChange={setAntiAliasRun}
            />
            {constrained && (
              <div className="max-w-md">
                <SelectField
                  label="Blended shades"
                  tooltip={QUANTISE_TOOLTIPS.antiAliasPalette}
                  value={palette}
                  choices={ANTI_ALIAS_PALETTE_CHOICES}
                  onChange={setAntiAliasPalette}
                />
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidanceFor(mode, constrained)}</p>
    </section>
  );
}

/** Which paragraph the state calls for — see `ANTI_ALIAS_GUIDANCE`, which holds all five. */
function guidanceFor(mode: AntiAliasMode, constrained: boolean): string {
  if (mode === 'OFF') return ANTI_ALIAS_GUIDANCE.off;
  // The unconstrained sheet is the one state where a control the reader has seen here is absent, so
  // it takes precedence over the three that describe what is being softened: those are visible in
  // the preview, and a missing control is not.
  if (!constrained) return ANTI_ALIAS_GUIDANCE.unconstrained;
  if (mode === 'INTERIOR') return ANTI_ALIAS_GUIDANCE.interior;
  return mode === 'SILHOUETTE' ? ANTI_ALIAS_GUIDANCE.silhouette : ANTI_ALIAS_GUIDANCE.both;
}
