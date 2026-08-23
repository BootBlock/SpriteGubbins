import { AUTO_TUNE_GUIDANCE, TUNE_STAGE_LABELS } from '../../constants/autoTune.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useAutoTuneStore } from '../../stores/useAutoTuneStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { TuneOutcome, TuneStageReport } from '../../types/autoTune.ts';
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
 * is a position for the reader to find; this reads five busy crops of their sheet at several hundred
 * combinations and says which came closest to the artwork for the fewest colours.
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
            <li key={stage.stage}>{stageLine(stage)}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidanceFor(tuning, outcome, error)}</p>
      {/* A second sentence rather than a branch above it, because the two are independent facts and
          both can be true at once: a report describes where the dials stand, and this describes why
          the button is disabled. Deciding between them left a full report sitting under a paragraph
          that said a scale had not been settled yet. */}
      {settings === null && (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{AUTO_TUNE_GUIDANCE.waiting}</p>
      )}
      {!tuning && error !== null && (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-rose">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * One stage's line: what it is, where its dials stand, and what it did.
 *
 * **A stage can have both a count and a reason, and the line says both.** The descent goes round, so
 * a stage that swept under one reading and was set aside when a later round moved off it has spent
 * positions *and* has nothing to do now — see `TuneStageReport`. Showing only the reason left the
 * chip's total unaccountable: on the reference sheet at its opening dials the chip reads 403
 * positions while the lines beneath it added to 282, with the missing 121 in two stages that
 * reported a sentence instead.
 */
function stageLine(stage: TuneStageReport): string {
  const label = `${TUNE_STAGE_LABELS[stage.stage]} · ${stage.settled}`;
  const tried = stage.candidates === 0 ? null : `${String(stage.candidates)} positions tried`;
  return [label, tried, stage.skipped].filter((part) => part !== null).join(' · ');
}

/** What the sweep cost, as one chip: `323 positions · 5 crops of 160 px · 2 rounds`. */
function costLabel(outcome: TuneOutcome): string {
  const crops = `${String(outcome.crops)} ${outcome.crops === 1 ? 'crop' : 'crops'}`;
  // The rounds are on the chip rather than left to the stage list, because they are what the
  // position count is a multiple of: a reader comparing two sweeps of the same sheet is otherwise
  // looking at two figures with no shared unit.
  const rounds = `${String(outcome.rounds)} ${outcome.rounds === 1 ? 'round' : 'rounds'}`;
  return `${String(outcome.candidates)} positions · ${crops} of ${String(outcome.cropEdge)} px · ${rounds}`;
}

/** The panel's state as one sentence, for the live region above. */
function spokenState(tuning: boolean, outcome: TuneOutcome | null, error: string | null): string {
  if (tuning) return 'Sweeping the quantiser’s dials.';
  // The reason is deliberately not repeated here: the paragraph below the button carries it in a
  // `role="alert"` region, and both change in the same render — so saying it twice is heard twice.
  // `QuantiseTab`'s own live region is built the same way.
  if (error !== null) return 'The sweep produced nothing.';
  if (outcome === null) return '';
  return `Swept ${String(outcome.candidates)} positions and moved the dials. Likeness ${outcome.reading.fidelity.toFixed(3)} at ${String(Math.round(outcome.reading.colors))} colours, from ${outcome.baseline.fidelity.toFixed(3)} at ${String(Math.round(outcome.baseline.colors))}.`;
}

/**
 * Which paragraph the sweep's own state calls for — see `AUTO_TUNE_GUIDANCE`, which holds all five.
 *
 * `waiting` is not among them: it answers a different question — why the button is disabled — and is
 * rendered beside whichever of these applies rather than in place of it.
 */
function guidanceFor(tuning: boolean, outcome: TuneOutcome | null, error: string | null): string {
  if (tuning) return AUTO_TUNE_GUIDANCE.running;
  if (error !== null) return AUTO_TUNE_GUIDANCE.failed;
  return outcome === null ? AUTO_TUNE_GUIDANCE.idle : AUTO_TUNE_GUIDANCE.settled;
}
