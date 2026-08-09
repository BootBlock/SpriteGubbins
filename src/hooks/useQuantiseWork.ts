import { useEffect, useMemo } from 'react';
import { QUANTISE_DEBOUNCE_MS } from '../constants/quantiser.ts';
import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import type {
  BackgroundKeying,
  ColorReduction,
  ImportedImage,
  PixelGrid,
  Quantised,
  QuantiseSettings,
  SheetFacts,
} from '../types/quantiser.ts';
import { sameQuantiseSettings } from '../utils/quantiseSettings.ts';
import { quantiseSheet } from '../workers/quantiseSession.ts';

/**
 * What the tab knows about the sheet it is showing, at this instant.
 *
 * Deliberately not "the result, and a `busy` flag beside it". Both of the states that used to be
 * spelled as flags are **derived** here from whether an answer matches the question — `busy` is "the
 * settings in force are not the settings the answer came back for", and it is impossible for it to
 * disagree with what is on screen, because it is computed from the same comparison the result is.
 */
export interface QuantiseWork {
  /** Detection and the source colour count, or `null` while the worker is still looking. */
  readonly facts: SheetFacts | null;
  /** The scale in force — the user's, or the detected one behind it. `null` when there is neither. */
  readonly grid: PixelGrid | null;
  /**
   * The most recent transform of the sheet on screen, **which may lag the settings in force**.
   *
   * Deliberately not "the answer for the current settings, or nothing". Blanking the preview for the
   * few hundred milliseconds a new grid takes would throw away the thing the tab exists to show, and
   * would take the reader's pan position with it — the pane collapses to a placeholder, and the
   * scroll offset it was holding is clamped to nothing. So the previous sheet stays up, {@link busy}
   * says a newer one is coming, and the grid this was computed at travels with it so it is still
   * drawn at the right size while the two disagree.
   */
  readonly quantised: Quantised | null;
  /** Whether the worker owes an answer for the settings in force right now. */
  readonly busy: boolean;
  /** What went wrong, in a sentence the tab shows. */
  readonly error: string | null;
}

/**
 * The tab's reading of a pipeline that is neither on this thread nor inside this component.
 *
 * The transform runs on a worker because every pass in it is linear in a pixel count that reaches
 * 16.8 million: on the main thread a keystroke in the grid box blocked the page for as long as 28
 * seconds. See `src/workers/quantiseWorker.ts` for that measurement, and `quantiseSession.ts` for why
 * the thread is owned outside React — in short, because `App` unmounts this view whenever the user
 * goes to change one of the studio settings the quantiser reads, and a pipeline owned by an effect
 * starts again from nothing on the way back.
 *
 * So what is left here is the reading and the asking: resolve the grid, settle the controls, ask for
 * anything not already answered, and turn the answers into the five things the tab renders.
 *
 * **The grid is resolved here**, from the user's override and what detection found, because this is
 * the only place that knows both: the override is the caller's, and detection is the worker's answer.
 * A caller that had to wait for `facts` before it could say what to compute would have to run the
 * rule itself, and the rule would then live in two places.
 *
 * `key` and `reduction` must keep their identity between renders — memoise them, as `QuantiseTab`
 * does. A fresh object every render restarts the debounce every render, and the transform never runs.
 */
export function useQuantiseWork(
  source: ImportedImage | null,
  gridOverride: PixelGrid | null,
  key: BackgroundKeying | null,
  reduction: ColorReduction | null,
): QuantiseWork {
  const survey = useQuantiseAnswerStore((state) => state.survey);
  const attempt = useQuantiseAnswerStore((state) => state.attempt);
  const succeeded = useQuantiseAnswerStore((state) => state.succeeded);
  const fatal = useQuantiseAnswerStore((state) => state.fatal);

  // What detection found. Guarded on there being a sheet rather than on which one: the session drops
  // replies about a superseded sheet, and `setSource` forgets the answers to the old one, so anything
  // in the store is about whatever is loaded now.
  const facts = source !== null && survey?.kind === 'facts' ? survey.facts : null;
  // The user's answer wins where they gave one; clearing the box falls back to detection, which may
  // itself have found nothing — in which case there is no result to compute, and the panel says so.
  const grid = gridOverride ?? facts?.detected ?? null;

  const settings = useMemo<QuantiseSettings | null>(
    () => (grid === null ? null : { grid, key, reduction }),
    [grid, key, reduction],
  );

  // The one comparison the rest of this is derived from: is the answer in hand an answer to the
  // question being asked?
  const current =
    source !== null &&
    attempt !== null &&
    settings !== null &&
    sameQuantiseSettings(attempt.settings, settings)
      ? attempt
      : null;
  const answered = current !== null;

  useEffect(() => {
    if (source === null || settings === null || answered) return;

    // The debounce is what stops the intermediate states of a typed number being computed at all. The
    // grid box passes through 1 on the way to 16, and 1 is the most expensive scale there is — every
    // pixel its own cell, and no downscale before the palette step. Holding the spinner arrow down
    // repeats at about thirty a second, and never leaves a quiet moment for one to be sent in.
    const timer = setTimeout(() => {
      quantiseSheet(settings);
    }, QUANTISE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
    // `answered` rather than the answer itself, and it is what stops the tab re-asking a question the
    // session has already answered — which is every remount, because this effect runs again on each
    // one while the settings behind it have not moved since the last.
  }, [source, settings, answered]);

  return {
    facts,
    grid,
    // Held against the *sheet* rather than the settings, which is what lets it outlive a settings
    // change and keep the preview up while the next one is computed — but only while there is a
    // newer one coming. With no scale in force there is nothing being computed and nothing to lag
    // behind, so a result from the scale the user has just deleted would be presented as settled:
    // captioned without the "updating…", offered to the Download button, and contradicting the panel
    // above it, which is at that moment asking for a grid.
    quantised:
      source !== null && settings !== null && succeeded !== null
        ? { result: succeeded.result, grid: succeeded.settings.grid }
        : null,
    // Working, unless there is nothing to work on, nothing to work towards, or nothing left working.
    busy:
      source !== null &&
      fatal === null &&
      survey?.kind !== 'failed' &&
      (facts === null || (settings !== null && !answered)),
    error:
      fatal ??
      (source !== null && survey?.kind === 'failed' ? survey.reason : null) ??
      (current?.kind === 'failed' ? current.reason : null),
  };
}
