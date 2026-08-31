import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { useAutoTuneStore } from '../stores/useAutoTuneStore.ts';
import { FakeAutoTuneWorker } from '../test/fakeAutoTuneWorker.ts';
import type { TuneOutcome } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { createImage } from '../utils/imageData.ts';
import { tunedDialsOf } from '../utils/tuneStage.ts';
import { abandonSweep, tuneOffThread } from './autoTuneSession.ts';
import type { AutoTuneRequest } from './autoTuneWorker.ts';

/**
 * The bridge, without the thread: what is posted, which reply is believed, and — the property this
 * file exists for — that every way out ends the thread and settles the promise.
 *
 * A thread per press only stays cheap if every exit that started one ends it: an answer, a refusal
 * from the sweep itself, a reply that will not deserialise, a thread that will not evaluate, a
 * message that will not be sent, and a sheet arriving to replace the one it was about. Two more
 * settle without a thread to end — a browser that will not build a worker, and a press arriving
 * while the last sweep is still running. Each of the eight missed is a leaked thread holding a
 * sheet, or a promise nobody settles, which leaves the button reading "Tuning…" for the rest of the
 * session — across every view, since the flag is a store.
 *
 * The last of those is this file's own, and it is two properties rather than one: the sweep is
 * **disowned**, so its report never captions an image it was not about, *and* the thread is
 * **ended**, so it is not still holding that sheet beside a button its cleared flag re-enabled.
 */

function thread(): FakeAutoTuneWorker {
  const started = FakeAutoTuneWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: 4,
  key: null,
  reduction: null,
};

const OUTCOME: TuneOutcome = {
  dials: {
    ...tunedDialsOf(QUANTISE_DEFAULT_DIALS),
    vote: 'INK_WEIGHTED',
    outlineExpansion: 1,
    lineStrength: 2,
    colorMerge: 12,
  },
  crops: 5,
  cropEdge: 160,
  candidates: 323,
  rounds: 2,
  reading: { fidelity: 0.94, colors: 24 },
  baseline: { fidelity: 0.81, colors: 31 },
  stages: [],
};

function request(): AutoTuneRequest {
  return { image: createImage(2, 2), settings: SETTINGS };
}

/** What the store is holding, split back into the two things the panel reads off it. */
function filedOutcome(): TuneOutcome | null {
  const report = useAutoTuneStore.getState().report;
  return report?.kind === 'settled' ? report.outcome : null;
}

function filedReason(): string | null {
  const report = useAutoTuneStore.getState().report;
  return report?.kind === 'failed' ? report.reason : null;
}

beforeEach(() => {
  FakeAutoTuneWorker.reset();
  useAutoTuneStore.setState({ run: 0, tuning: false, report: null });
  vi.stubGlobal('Worker', FakeAutoTuneWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tuneOffThread', () => {
  it('posts the sheet and the settings, and resolves with what came back', async () => {
    const sweeping = tuneOffThread(request());
    expect(thread().posted).toEqual([request()]);

    thread().answer({ kind: 'tuned', outcome: OUTCOME });
    await expect(sweeping).resolves.toEqual(OUTCOME);
    expect(thread().terminated).toBe(true);
    expect(filedOutcome()).toEqual(OUTCOME);
  });

  it('files the reason the sweep gave, resolves with nothing, and still ends the thread', async () => {
    const sweeping = tuneOffThread(request());
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(sweeping).resolves.toBeNull();
    expect(thread().terminated).toBe(true);
    expect(filedReason()).toBe('Array buffer allocation failed');
    expect(useAutoTuneStore.getState().tuning).toBe(false);
  });

  it('settles when the thread itself fails, which no reply can report', async () => {
    const sweeping = tuneOffThread(request());
    thread().die();

    await expect(sweeping).resolves.toBeNull();
    expect(thread().terminated).toBe(true);
    expect(filedReason()).toMatch(/could not start/);
  });

  it('settles when a reply arrives but will not deserialise', async () => {
    // No `message` follows one of these, so without its own listener the promise is never settled
    // and the flag below is never cleared — the button stays disabled for good.
    const sweeping = tuneOffThread(request());
    thread().garble();

    await expect(sweeping).resolves.toBeNull();
    expect(thread().terminated).toBe(true);
    expect(filedReason()).toMatch(/could not be read back/);
  });

  it('settles and ends the thread when the sheet will not cross the boundary', async () => {
    FakeAutoTuneWorker.refusePost = true;
    const sweeping = tuneOffThread(request());
    // A clone the browser would not make. It throws where no listener can see it, so the thread is
    // left running with nothing to answer unless the post is guarded.
    expect(thread().terminated).toBe(true);
    await expect(sweeping).resolves.toBeNull();
    expect(filedReason()).toBe('the sheet would not clone');
  });

  it('settles rather than falling back to the main thread where a browser has no workers', async () => {
    FakeAutoTuneWorker.refuseToStart = true;

    await expect(tuneOffThread(request())).resolves.toBeNull();
    expect(FakeAutoTuneWorker.started).toHaveLength(0);
    expect(useAutoTuneStore.getState().tuning).toBe(false);
    expect(filedReason()).toMatch(/would not start the thread/);
  });

  it('holds the tuning flag for exactly as long as the thread runs', async () => {
    const sweeping = tuneOffThread(request());
    expect(useAutoTuneStore.getState().tuning).toBe(true);

    thread().answer({ kind: 'tuned', outcome: OUTCOME });
    await sweeping;
    expect(useAutoTuneStore.getState().tuning).toBe(false);
  });

  it('refuses a second sweep while one is running, rather than starting a second thread', async () => {
    const first = tuneOffThread(request());

    await expect(tuneOffThread(request())).resolves.toBeNull();
    expect(FakeAutoTuneWorker.started).toHaveLength(1);
    // And the refusal leaves the flag it found set, so the panel keeps saying a sweep is running.
    expect(useAutoTuneStore.getState().tuning).toBe(true);
    expect(filedReason()).toBeNull();

    thread().answer({ kind: 'tuned', outcome: OUTCOME });
    await first;
    // The refusal is not permanent: the next press starts a thread as the first one did.
    void tuneOffThread(request());
    expect(FakeAutoTuneWorker.started).toHaveLength(2);
  });

  it('ends the thread and settles the caller when the sheet it was about is replaced', async () => {
    // What `setSource` does. Terminating is the half a store cannot do, and the half that matters:
    // a disowned thread left running holds its own copy of the sheet for the rest of its several
    // seconds, and the flag it cleared has re-enabled the button beside it.
    const sweeping = tuneOffThread(request());

    abandonSweep();

    expect(thread().terminated).toBe(true);
    await expect(sweeping).resolves.toBeNull();
    expect(filedOutcome()).toBeNull();
    expect(useAutoTuneStore.getState().tuning).toBe(false);
  });

  it('leaves the next press free to start exactly one thread', async () => {
    // The defect this pair guards: clearing the flag without ending the thread let a second sweep
    // start beside the first, so two threads held two sheets and burned two cores.
    const first = tuneOffThread(request());
    abandonSweep();
    await first;

    void tuneOffThread(request());

    expect(FakeAutoTuneWorker.started).toHaveLength(2);
    expect(FakeAutoTuneWorker.started[0]?.terminated).toBe(true);
    expect(FakeAutoTuneWorker.started[1]?.terminated).toBe(false);
  });

  it('does nothing where no sweep is running, which is every ordinary sheet drop', () => {
    expect(() => {
      abandonSweep();
    }).not.toThrow();
    expect(FakeAutoTuneWorker.started).toHaveLength(0);
  });

  it('drops an answer that was already on its way when the sheet was replaced', async () => {
    // Terminating stops the worker, not a message this thread has already dispatched — which is
    // what the run number is still there to catch.
    const sweeping = tuneOffThread(request());
    const worker = thread();
    abandonSweep();

    worker.answer({ kind: 'tuned', outcome: OUTCOME });

    await expect(sweeping).resolves.toBeNull();
    expect(filedOutcome()).toBeNull();
  });

  it('files the settings each answer was asked at, a refusal as much as a report', async () => {
    // What the panel withdraws a report by: the sweep holds the grid, the keying and the colour
    // reduction fixed, so its figures are only true in those surroundings and neither the store nor
    // the panel can reconstruct them afterwards — the grid in force has moved by then, which is the
    // whole reason the question is being asked.
    const sweeping = tuneOffThread(request());
    thread().answer({ kind: 'tuned', outcome: OUTCOME });
    await sweeping;

    expect(useAutoTuneStore.getState().report?.surroundings).toEqual({ grid: 4, key: null, reduction: null });

    useAutoTuneStore.setState({ run: 0, tuning: false, report: null });
    FakeAutoTuneWorker.reset();
    const failing = tuneOffThread(request());
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });
    await failing;

    expect(useAutoTuneStore.getState().report?.surroundings).toEqual({ grid: 4, key: null, reduction: null });
  });

  it('disowns a failure the same way, rather than reporting it against the new sheet', async () => {
    const sweeping = tuneOffThread(request());
    const worker = thread();
    abandonSweep();

    worker.answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(sweeping).resolves.toBeNull();
    expect(filedReason()).toBeNull();
  });
});
