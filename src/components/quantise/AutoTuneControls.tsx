import { AUTO_TUNE_GUIDANCE, TUNE_STAGE_LABELS } from '../../constants/autoTune.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useAutoTuneStore } from '../../stores/useAutoTuneStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { TuneOutcome } from '../../types/autoTune.ts';
import type { QuantiseSettings } from '../../types/quantiser.ts';
import { tuneOffThread } from '../../workers/autoTuneSession.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface AutoTuneControlsProps {
  /** The sheet as it was dropped, which is what the sweep reads its crops out of. */
  readonly image: ImageData | null;
  /**
   * Everything the pipeline is being asked for right now, or `null` while no grid is settled.
   *
   * The whole settings object rather than the dials alone: the sweep holds the grid, the keying and
   * the colour reduction fixed and varies the dials inside them, so a candidate is only meaningful
   * against the same surroundings the preview is being computed in. `null` is what disables the
   * button, and it is the one state where there is genuinely nothing to sweep against.
   */
  readonly settings: QuantiseSettings | null;
}

/**
 * Where this sheet's dials want to be, found by running them.
 *
 * The one panel on this tab that answers a question instead of asking one. Every other control here
 * is a position for the reader to find; this reads three busy crops of their sheet at up to
 * sixty combinations and says which came closest to the artwork for the fewest colours.
 *
 * **Directly under the grid, and above every dial it moves.** It cannot run without a pixel scale —
 * a candidate is judged by re-drawing its result at that scale and comparing it with the artwork it
 * came from — so it sits below the panel that settles one, and its own guidance sends a reader back
 * up there when none is. Above the dials because it moves several of them at once, and a reader who
 * has set the ink blend by hand should meet this before that work rather than after it.
 *
 * **It seeds, it does not lock.** The answer lands through `autoTuned`, which is one entry on the
 * undo stack, so a single press of Undo puts every dial back. Nothing here is remembered by a preset
 * or written to the database; what the sweep produces is dial positions, which the tab already knows
 * how to carry, save and step back through.
 */
export function AutoTuneControls({ image, settings }: AutoTuneControlsProps) {
  const tuning = useAutoTuneStore((state) => state.tuning);
  const outcome = useAutoTuneStore((state) => state.outcome);
  const error = useAutoTuneStore((state) => state.error);
  const autoTuned = useQuantiseStore((state) => state.autoTuned);

  const unavailable = image === null || settings === null || tuning;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      {/* Its own live region rather than a line added to the tab's, and the two never overlap: that
          one speaks about the transform of the whole sheet, this about a sweep that runs on a
          separate thread and can take seconds while the transform sits idle. A reader who cannot see
          the button change to "Tuning…" has nothing else to tell them a press did anything. */}
      <p role="status" className="sr-only">
        {spokenState(tuning, outcome, error)}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Auto-tune</p>
        {tuning && <Badge tone="live">Sweeping the dials…</Badge>}
        {!tuning && outcome !== null && (
          <>
            {/* Each chip's text is one string rather than a row of interpolations, because a chip
                is read as a sentence: broken into nodes it is announced a fragment at a time and
                cannot be matched as what it says. */}
            <Badge tone="valid">{costLabel(outcome)}</Badge>
            <Badge tone={outcome.reading.fidelity > outcome.baseline.fidelity ? 'valid' : 'neutral'}>
              {`likeness ${outcome.baseline.fidelity.toFixed(3)} → ${outcome.reading.fidelity.toFixed(3)}`}
            </Badge>
            <Badge tone="neutral">
              {`${String(Math.round(outcome.baseline.colors))} → ${String(Math.round(outcome.reading.colors))} colours`}
            </Badge>
          </>
        )}
        {!tuning && error !== null && <Badge tone="attention">Nothing to report</Badge>}

        <ControlTooltip
          className="relative ml-auto inline-flex"
          hint="Auto"
          text={QUANTISE_ACTION_TOOLTIPS.autoTune}
        >
          <button
            type="button"
            disabled={unavailable}
            onClick={() => {
              if (image === null || settings === null) return;
              // Nothing to catch: the session settles every path, files whatever went wrong on the
              // store this panel is reading, and answers `null` for a sweep whose sheet has since
              // been replaced. See `autoTuneSession`, which says why it never rejects.
              void tuneOffThread({ image, settings }).then((found) => {
                if (found !== null) autoTuned(found.dials);
              });
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">✧</span> {tuning ? 'Tuning…' : 'Auto'}
          </button>
        </ControlTooltip>
      </div>

      {/* Withdrawn while a sweep runs, as every figure on this tab is withdrawn while a newer answer
          is coming: these lines name dial positions, and the dials are about to move. */}
      {!tuning && outcome !== null && (
        <ul className="mt-3 space-y-1 font-mono text-2xs text-ink-faint">
          {outcome.stages.map((stage) => (
            <li key={stage.stage}>
              {`${TUNE_STAGE_LABELS[stage.stage]} · ${stage.settled} · ${stage.skipped ?? `${String(stage.candidates)} positions tried`}`}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {guidanceFor(settings, tuning, outcome, error)}
      </p>
      {!tuning && error !== null && (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-rose">
          {error}
        </p>
      )}
    </section>
  );
}

/** What the sweep cost, as one chip: `60 positions · 3 crops of 160 px`. */
function costLabel(outcome: TuneOutcome): string {
  const crops = `${String(outcome.crops)} ${outcome.crops === 1 ? 'crop' : 'crops'}`;
  return `${String(outcome.candidates)} positions · ${crops} of ${String(outcome.cropEdge)} px`;
}

/** The panel's state as one sentence, for the live region above. */
function spokenState(tuning: boolean, outcome: TuneOutcome | null, error: string | null): string {
  if (tuning) return 'Sweeping the quantiser’s dials.';
  if (error !== null) return `The sweep produced nothing. ${error}`;
  if (outcome === null) return '';
  return `Swept ${String(outcome.candidates)} positions and moved the dials. Likeness ${outcome.reading.fidelity.toFixed(3)} at ${String(Math.round(outcome.reading.colors))} colours, from ${outcome.baseline.fidelity.toFixed(3)} at ${String(Math.round(outcome.baseline.colors))}.`;
}

/** Which paragraph the state calls for — see `AUTO_TUNE_GUIDANCE`, which holds all five. */
function guidanceFor(
  settings: QuantiseSettings | null,
  tuning: boolean,
  outcome: TuneOutcome | null,
  error: string | null,
): string {
  if (tuning) return AUTO_TUNE_GUIDANCE.running;
  if (settings === null) return AUTO_TUNE_GUIDANCE.waiting;
  if (error !== null) return AUTO_TUNE_GUIDANCE.failed;
  return outcome === null ? AUTO_TUNE_GUIDANCE.idle : AUTO_TUNE_GUIDANCE.settled;
}
