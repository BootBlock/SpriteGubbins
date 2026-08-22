import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import { FakeWorker } from '../test/fakeWorker.ts';
import type { QuantiseResult, QuantiseSettings, SheetFacts } from '../types/quantiser.ts';
import { flatDifference } from '../test/images.ts';
import { createImage } from '../utils/imageData.ts';
import { loadSheet, quantiseSheet, releaseSheet } from './quantiseSession.ts';

const FACTS: SheetFacts = { scale: { grid: 8, measurement: 'EXACT' }, colors: 1024 };

function settingsAt(grid: number): QuantiseSettings {
  return {
    grid,
    key: null,
    vote: 'DOMINANT',
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    cleanupPasses: 1,
    spriteGap: 1,
    symmetry: 'OFF' as const,
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment: 'OFF' as const,
    frameDriftTolerance: 0,
    dither: 'NONE',
    outlineExpansion: 0,
    colorMerge: 0,
    reduction: { kind: 'MAX_COLORS', maxColors: 32 },
  };
}

function resultOf(side: number): QuantiseResult {
  return {
    image: createImage(side, side),
    difference: flatDifference(side, side),
    colors: 32,
    keyedShare: 0,
    sprites: { kind: 'SEGMENTED', boxes: [], specks: 0 },
    symmetry: null,
    duplicates: [],
    snapped: false,
    strips: null,
    offset: { x: 0, y: 0 },
  };
}

/** The thread the session started, which every test here has to have got one of. */
function thread(): FakeWorker {
  const started = FakeWorker.started.at(-1);
  if (started === undefined) throw new Error('the session started no thread');
  return started;
}

beforeEach(() => {
  // The session and the store it writes into are both module singletons, so a test file is one long
  // session unless each test ends the last one. This is the pair `clear` calls, in the same order,
  // rather than a test-only back door: whatever a test leaves behind, the app can get out of.
  releaseSheet();
  useQuantiseAnswerStore.getState().reset();
  FakeWorker.started = [];
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('quantiseSession', () => {
  it('starts one thread and sends the sheet to it once', () => {
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));

    expect(FakeWorker.started).toHaveLength(1);
    expect(thread().of('load')).toHaveLength(1);
    expect(thread().of('quantise')).toHaveLength(1);
  });

  it('files what came back against the question it answered', () => {
    loadSheet(createImage(64, 64));
    thread().answer({ id: thread().lastId('load'), kind: 'loaded', facts: FACTS });
    quantiseSheet(settingsAt(8));
    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    const { survey, attempt, succeeded } = useQuantiseAnswerStore.getState();
    expect(survey).toEqual({ kind: 'facts', facts: FACTS });
    expect(attempt).toMatchObject({ kind: 'quantised', settings: settingsAt(8) });
    expect(succeeded?.settings).toEqual(settingsAt(8));
  });

  it('does not ask twice for a question already outstanding', () => {
    // The case the tab cannot see. A user who sets a grid and navigates away before the answer lands
    // comes back to a component that has no result and no memory of having asked — so the guard has
    // to be here, which is where the outstanding transform is known, rather than in the hook that
    // comes and goes.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    quantiseSheet(settingsAt(8));

    expect(thread().of('quantise')).toHaveLength(1);
  });

  it('runs one transform for a run of settings the reader passed through', () => {
    // The reported failure. A slider step outlives the 250 ms debounce, so each one reaches here; the
    // worker has a single message loop, so each would be computed to completion behind the last while
    // the reader waited for a position they had already left. Counted rather than timed: four steps
    // ask four times, and only the first and the one they stopped on are ever posted.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    quantiseSheet(settingsAt(7));
    quantiseSheet(settingsAt(6));
    quantiseSheet(settingsAt(5));

    expect(thread().of('quantise')).toHaveLength(1);

    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    const asked = thread().of('quantise');
    expect(asked).toHaveLength(2);
    expect(asked[1]?.request).toEqual({ kind: 'quantise', settings: settingsAt(5) });
  });

  it('drops the queued transform when the reader returns to the one already running', () => {
    // Stepping a slider back to where it started. The answer being computed is the answer wanted, so
    // there is nothing left to run afterwards — queueing it anyway would recompute a result the tab
    // is about to be handed.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    quantiseSheet(settingsAt(5));
    quantiseSheet(settingsAt(8));

    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    expect(thread().of('quantise')).toHaveLength(1);
  });

  it('starts the queued transform after the one before it failed', () => {
    // A failure stops the worker running just as an answer does, so it has to release the queue too.
    // Left out, one out-of-memory transform would silently end every transform for the rest of the
    // session — the tab would ask, the session would queue, and nothing would ever start it.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(1));
    quantiseSheet(settingsAt(8));

    thread().answer({ id: thread().lastId('quantise'), kind: 'failed', reason: 'Out of memory' });

    const asked = thread().of('quantise');
    expect(asked).toHaveLength(2);
    expect(asked[1]?.request).toEqual({ kind: 'quantise', settings: settingsAt(8) });
  });

  it('forgets both the running and the queued transform when the next sheet arrives', () => {
    // Two claims, because dropping only the bookkeeping passes the weaker half of each. The queued job
    // names settings the *previous* sheet was being read at, so running it would file an answer nobody
    // asked for — and the slot has to be released as well, or the new sheet's own question queues
    // behind a transform whose reply this side has already stopped recognising, for ever.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    const stale = thread().lastId('quantise');
    quantiseSheet(settingsAt(5));

    loadSheet(createImage(32, 32));
    quantiseSheet(settingsAt(3));

    const asked = thread().of('quantise');
    expect(asked).toHaveLength(2);
    expect(asked[1]?.request).toEqual({ kind: 'quantise', settings: settingsAt(3) });

    // The abandoned reply, then the one that is wanted. Neither may start the settings queued against
    // the sheet that has gone.
    thread().answer({ id: stale, kind: 'quantised', result: resultOf(8) });
    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(3) });

    expect(thread().of('quantise')).toHaveLength(2);
  });

  it('releases the slot when a reply cannot be read back, and says so', () => {
    // `messageerror` is the third way a reply never arrives, and the only one that fires no `error`
    // and no `message`. Left unanswered it holds the slot on a transform that can never reply, and
    // every later question queues behind it for the rest of the session.
    loadSheet(createImage(64, 64));
    thread().answer({ id: thread().lastId('load'), kind: 'loaded', facts: FACTS });
    quantiseSheet(settingsAt(8));

    thread().unreadable();

    expect(useQuantiseAnswerStore.getState().attempt).toEqual({
      kind: 'failed',
      settings: settingsAt(8),
      reason: 'The quantiser’s answer could not be read back from its thread',
    });
    // The thread is kept — it still holds the sheet — so the next question is asked of it as usual.
    expect(useQuantiseAnswerStore.getState().fatal).toBeNull();
    quantiseSheet(settingsAt(5));
    expect(FakeWorker.started).toHaveLength(1);
    expect(thread().of('quantise')).toHaveLength(2);
  });

  it('files an unreadable reply against the survey when that is what was outstanding', () => {
    // The event carries no correlation id, so what it is failed against is whatever was outstanding.
    // A survey is filed against the sheet rather than against any settings, which is what lets the
    // tab stop waiting on a scale reading that is never coming.
    loadSheet(createImage(64, 64));

    thread().unreadable();

    expect(useQuantiseAnswerStore.getState().survey).toEqual({
      kind: 'failed',
      reason: 'The quantiser’s answer could not be read back from its thread',
    });
  });

  it('asks again once the outstanding answer has arrived and been superseded', () => {
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(8) });
    quantiseSheet(settingsAt(8));

    // Nothing is in flight any more, so this is a fresh question rather than a duplicate. Whether it
    // is worth asking is the hook's call — it has the answer to compare against, and this does not.
    expect(thread().of('quantise')).toHaveLength(2);
  });

  it('drops an answer about the sheet before this one', () => {
    // A reply already in flight when the next sheet arrives. It carries a correlation id this side
    // was expecting, so abandoning the job is the only thing that tells the two apart.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    const stale = thread().lastId('quantise');
    loadSheet(createImage(32, 32));

    thread().answer({ id: stale, kind: 'quantised', result: resultOf(8) });

    expect(useQuantiseAnswerStore.getState().attempt).toBeNull();
  });

  it('files a failed transform against its settings and a failed survey against the sheet', () => {
    loadSheet(createImage(64, 64));
    thread().answer({ id: thread().lastId('load'), kind: 'failed', reason: 'Allocation failed' });
    quantiseSheet(settingsAt(1));
    thread().answer({ id: thread().lastId('quantise'), kind: 'failed', reason: 'Out of memory' });

    expect(useQuantiseAnswerStore.getState().survey).toEqual({ kind: 'failed', reason: 'Allocation failed' });
    expect(useQuantiseAnswerStore.getState().attempt).toEqual({
      kind: 'failed',
      settings: settingsAt(1),
      reason: 'Out of memory',
    });
    // Neither is terminal — the worker catches its own exception and carries on.
    expect(useQuantiseAnswerStore.getState().fatal).toBeNull();
  });

  it('leaves the sheet on screen when a later transform fails', () => {
    // The reason a successful transform is filed twice. A grid of 1 on a large sheet is the case
    // that runs out of memory, and reporting that should not also wipe the perfectly good result the
    // user was looking at when they typed it.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    thread().answer({ id: thread().lastId('quantise'), kind: 'quantised', result: resultOf(8) });
    quantiseSheet(settingsAt(1));
    thread().answer({ id: thread().lastId('quantise'), kind: 'failed', reason: 'Out of memory' });

    expect(useQuantiseAnswerStore.getState().attempt).toMatchObject({ kind: 'failed' });
    expect(useQuantiseAnswerStore.getState().succeeded?.settings).toEqual(settingsAt(8));
  });

  it('settles and forgets a call the browser would not clone', () => {
    // The other way a job can be recorded and never answered, and the one this bridge posts the whole
    // sheet through. A job recorded before the throw would leave the tab busy for ever and put that
    // configuration behind `quantiseSheet`'s guard for the rest of the session.
    loadSheet(createImage(64, 64));
    const refusing = thread();
    refusing.refuseToClone = new Error('The sheet could not be cloned');

    quantiseSheet(settingsAt(8));

    expect(useQuantiseAnswerStore.getState().attempt).toEqual({
      kind: 'failed',
      settings: settingsAt(8),
      reason: 'The sheet could not be cloned',
    });

    // The refused call never reached the worker at all, so the question is asked afresh rather than
    // suppressed by a guard that still believes it is outstanding.
    expect(refusing.of('quantise')).toHaveLength(0);
    refusing.refuseToClone = null;
    quantiseSheet(settingsAt(8));
    expect(refusing.of('quantise')).toHaveLength(1);
  });

  it('reports the thread dying as the one failure nothing recovers from', () => {
    loadSheet(createImage(64, 64));
    thread().die();

    expect(useQuantiseAnswerStore.getState().fatal).toBe('The quantiser could not start in this browser');
  });

  it('does not quietly reconnect for a later sheet once the thread has died', () => {
    // Both causes of a lost thread are properties of the browser rather than of the sheet, so the
    // next image meets the same failure. A session that reconnected here would put a working preview
    // under the banner saying the quantiser could not start — and `fatal` has no way back, by
    // design. It also matters that the dead thread is dropped: a terminated worker still accepts
    // `postMessage`, so a job posted to one is never answered — which would leave the slot held by a
    // transform that can never reply, and every later question queued behind it.
    loadSheet(createImage(64, 64));
    const first = thread();
    first.die();

    loadSheet(createImage(32, 32));
    quantiseSheet(settingsAt(8));

    expect(FakeWorker.started).toHaveLength(1);
    expect(first.terminated).toBe(true);
    expect(first.of('load')).toHaveLength(1);
    expect(first.of('quantise')).toHaveLength(0);
  });

  it('lets the next sheet start a new thread once the session has ended', () => {
    // The other half of the same rule. `releaseSheet` is what makes a fresh start possible, so it is
    // also what may clear the message saying one was not — and `useQuantiseStore.clear` calls it
    // beside the store's `reset` for exactly that reason.
    loadSheet(createImage(64, 64));
    thread().die();
    expect(useQuantiseAnswerStore.getState().fatal).not.toBeNull();

    releaseSheet();
    useQuantiseAnswerStore.getState().reset();
    loadSheet(createImage(32, 32));

    expect(FakeWorker.started).toHaveLength(2);
    expect(thread().of('load')).toHaveLength(1);
    expect(useQuantiseAnswerStore.getState().fatal).toBeNull();
  });

  it('reports a thread this browser will not start at all', () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('module workers are unsupported');
        }
      },
    );

    loadSheet(createImage(64, 64));

    expect(useQuantiseAnswerStore.getState().fatal).toBe('The quantiser could not start in this browser');
  });

  it('ends the thread when the sheet is released, and starts a fresh one for the next', () => {
    // Terminating is what releases the sheet the worker is holding, plus anything a running transform
    // had allocated — where a message could only ever have released the first.
    loadSheet(createImage(64, 64));
    const first = thread();

    releaseSheet();
    expect(first.terminated).toBe(true);

    loadSheet(createImage(32, 32));
    expect(FakeWorker.started).toHaveLength(2);
    expect(thread().terminated).toBe(false);
  });
});
