import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QUANTISE_DEBOUNCE_MS } from '../constants/quantiser.ts';
import type {
  BackgroundKeying,
  ImportedImage,
  PixelGrid,
  Quantised,
  QuantiseResult,
  QuantiseSettings,
  SheetFacts,
} from '../types/quantiser.ts';
import { sameQuantiseSettings } from '../utils/quantiseSettings.ts';
import type { QuantiseCall, QuantiseRequest } from '../workers/quantiseProtocol.ts';
import { isQuantiseReply } from '../workers/quantiseProtocol.ts';

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

/** What the worker made of a sheet when it was handed one, or why it could not. */
type Survey =
  | { readonly kind: 'facts'; readonly image: ImageData; readonly facts: SheetFacts }
  | { readonly kind: 'failed'; readonly image: ImageData; readonly reason: string };

/** An answer, and the exact question it answered — kept together so staleness is decidable. */
type Attempt =
  | {
      readonly kind: 'quantised';
      readonly image: ImageData;
      readonly settings: QuantiseSettings;
      readonly result: QuantiseResult;
    }
  | {
      readonly kind: 'failed';
      readonly image: ImageData;
      readonly settings: QuantiseSettings;
      readonly reason: string;
    };

/** What a call was asking about, so its reply can be filed against the right sheet and settings. */
type Job =
  | { readonly kind: 'load'; readonly image: ImageData }
  | { readonly kind: 'quantise'; readonly image: ImageData; readonly settings: QuantiseSettings };

/**
 * The quantiser's pipeline, run somewhere it cannot freeze the page.
 *
 * The tab used to compute all of this in a `useMemo`, which is the right shape for a pure derivation
 * and the wrong thread for this one: every pass is linear in a pixel count that reaches 16.8 million,
 * so a keystroke in the grid box blocked the main thread for as long as 28 seconds — no paint, no
 * scroll, and no way to show that anything was happening. See `src/workers/quantiseWorker.ts`.
 *
 * **Only what changed is sent.** The sheet crosses once, on load, and the worker keeps it; a settings
 * change is three small numbers. The two figures that depend on the image alone — the detected scale
 * and the colour count of the sheet as it arrived — come back from that one load. Detection was
 * already measured once per sheet; the colour count was not, and was being recomputed alongside every
 * transform over an image of up to 16.8 million pixels.
 *
 * **The grid is resolved here**, from the user's override and what detection found, because this is
 * the only place that knows both: the override is the caller's, and detection is the worker's answer.
 * A caller that had to wait for `facts` before it could say what to compute would have to run the
 * rule itself, and the rule would then live in two places.
 *
 * `key` must keep its identity between renders — memoise it, as `QuantiseTab` does. A fresh object
 * every render restarts the debounce every render, and the transform never runs.
 */
export function useQuantiseWorker(
  source: ImportedImage | null,
  gridOverride: PixelGrid | null,
  key: BackgroundKeying | null,
  maxColors: number | null,
): QuantiseWork {
  const worker = useRef<Worker | null>(null);
  /** Calls awaiting a reply, by correlation id. */
  const jobs = useRef(new Map<number, Job>());
  const nextId = useRef(0);

  const [survey, setSurvey] = useState<Survey | null>(null);
  /** The latest reply of any kind, which is what decides whether the tab is up to date. */
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  /**
   * The latest reply that produced a sheet, which is what stays on screen.
   *
   * Separate from {@link attempt} because a transform that runs out of memory at a grid of 1 should
   * report itself without also wiping the perfectly good result the user was looking at.
   */
  const [succeeded, setSucceeded] = useState<{
    readonly image: ImageData;
    readonly settings: QuantiseSettings;
    readonly result: QuantiseResult;
  } | null>(null);
  /**
   * The worker itself failed to start or died.
   *
   * Terminal, and the only thing here that is: the thread is gone, so nothing it is asked will ever
   * answer and no later sheet can recover. A job that *failed* is a different matter entirely — the
   * worker survives its own `catch` — so those are filed against the sheet or the settings they were
   * about, and stop applying when those change.
   */
  const [fatal, setFatal] = useState<string | null>(null);

  // React's documented adjustment of state to a changed input, and the reason it is worth the
  // strangeness of a `setState` during render: **every answer here is about one particular sheet**,
  // so a new sheet — or no sheet, after Clear — makes all of them meaningless at once. Left in place
  // they would keep the old sheet's pixels reachable long after the store let go of them, which for
  // a 4096 × 4096 sheet is 67 megabytes the user pressed Clear to be rid of.
  const [answeredFor, setAnsweredFor] = useState<ImportedImage | null>(source);
  if (answeredFor !== source) {
    setAnsweredFor(source);
    setSurvey(null);
    setAttempt(null);
    setSucceeded(null);
  }

  useEffect(() => {
    const instance = new Worker(new URL('../workers/quantiseWorker.ts', import.meta.url), {
      type: 'module',
    });
    // Read once, here, rather than through the ref in the cleanup below: the ref's *identity* is
    // stable for the life of the hook, so the two are the same object — but `exhaustive-deps` cannot
    // know that, and the pattern it is warning about (a ref repointed between setup and teardown) is
    // a real one worth not spelling ambiguously.
    const outstanding = jobs.current;

    // State is set from the message and error handlers rather than from the effect body, which is
    // what they are: events arriving later, not a value this render could have derived.
    instance.addEventListener('message', (event: MessageEvent<unknown>) => {
      const reply = event.data;
      if (!isQuantiseReply(reply)) return;
      const job = jobs.current.get(reply.id);
      if (job === undefined) return;
      jobs.current.delete(reply.id);

      if (reply.kind === 'loaded') {
        setSurvey({ kind: 'facts', image: job.image, facts: reply.facts });
        return;
      }
      if (reply.kind === 'quantised' && job.kind === 'quantise') {
        const answered = { image: job.image, settings: job.settings, result: reply.result };
        setAttempt({ kind: 'quantised', ...answered });
        setSucceeded(answered);
        return;
      }
      // Every failure is filed against what it was a failure *of* — a transform against its settings,
      // a survey against its sheet — so that changing the thing it was about is what clears it.
      // Neither is terminal: the worker catches its own exception and carries on, and the realistic
      // cause is memory on one very large image, which says nothing about the next one.
      if (reply.kind === 'failed') {
        if (job.kind === 'quantise') {
          setAttempt({ kind: 'failed', image: job.image, settings: job.settings, reason: reply.reason });
        } else {
          setSurvey({ kind: 'failed', image: job.image, reason: reply.reason });
        }
      }
    });

    instance.addEventListener('error', () => {
      setFatal('The quantiser could not start in this browser');
    });

    worker.current = instance;
    return () => {
      instance.terminate();
      worker.current = null;
      outstanding.clear();
    };
  }, []);

  const send = useCallback((request: QuantiseRequest, job: Job | null) => {
    if (worker.current === null) return;
    const id = nextId.current++;
    if (job !== null) jobs.current.set(id, job);
    const call: QuantiseCall = { id, request };
    worker.current.postMessage(call);
  }, []);

  useEffect(() => {
    if (source === null) {
      // Not merely tidying: the worker is holding the only other copy of the sheet, and a cleared tab
      // has no use for it.
      send({ kind: 'release' }, null);
      return;
    }
    send({ kind: 'load', image: source.image }, { kind: 'load', image: source.image });
  }, [source, send]);

  // Every read below is guarded on the sheet the answer was about, as well as being reset when the
  // sheet changes: the reset covers the state, and the guard covers a reply for the previous sheet
  // that is still in flight when the new one arrives.
  const surveyed = source !== null && survey !== null && survey.image === source.image ? survey : null;
  // What detection found — a `facts` still describing the previous image would put its scale in the
  // grid box and its colour count under the preview.
  const facts = surveyed?.kind === 'facts' ? surveyed.facts : null;
  // The user's answer wins where they gave one; clearing the box falls back to detection, which may
  // itself have found nothing — in which case there is no result to compute, and the panel says so.
  const grid = gridOverride ?? facts?.detected ?? null;

  const settings = useMemo<QuantiseSettings | null>(
    () => (grid === null ? null : { grid, key, maxColors }),
    [grid, key, maxColors],
  );

  useEffect(() => {
    if (source === null || settings === null) return;

    // The debounce is what stops the intermediate states of a typed number being computed at all. The
    // grid box passes through 1 on the way to 16, and 1 is the most expensive scale there is — every
    // pixel its own cell, and no downscale before the palette step. Holding the spinner arrow down
    // repeats at about thirty a second, and never leaves a quiet moment for one to be sent in.
    const timer = setTimeout(() => {
      send({ kind: 'quantise', settings }, { kind: 'quantise', image: source.image, settings });
    }, QUANTISE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [source, settings, send]);

  // The one comparison the rest of this is derived from: is the answer in hand an answer to the
  // question being asked?
  const current =
    source !== null &&
    attempt !== null &&
    settings !== null &&
    attempt.image === source.image &&
    sameQuantiseSettings(attempt.settings, settings)
      ? attempt
      : null;

  return {
    facts,
    grid,
    // Held against the *image* rather than the settings, which is what lets it outlive a settings
    // change and keep the preview up while the next one is computed — but only while there is a
    // newer one coming. With no scale in force there is nothing being computed and nothing to lag
    // behind, so a result from the scale the user has just deleted would be presented as settled:
    // captioned without the "updating…", offered to the Download button, and contradicting the panel
    // above it, which is at that moment asking for a grid.
    quantised:
      source !== null && settings !== null && succeeded !== null && succeeded.image === source.image
        ? { result: succeeded.result, grid: succeeded.settings.grid }
        : null,
    // Working, unless there is nothing to work on, nothing to work towards, or nothing left working.
    busy:
      source !== null &&
      fatal === null &&
      surveyed?.kind !== 'failed' &&
      (facts === null || (settings !== null && current === null)),
    error:
      fatal ??
      (surveyed?.kind === 'failed' ? surveyed.reason : null) ??
      (current?.kind === 'failed' ? current.reason : null),
  };
}
