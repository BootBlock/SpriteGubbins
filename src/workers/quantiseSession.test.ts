import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import { FakeWorker } from '../test/fakeWorker.ts';
import type { QuantiseResult, QuantiseSettings, SheetFacts } from '../types/quantiser.ts';
import { createImage } from '../utils/imageData.ts';
import { loadSheet, quantiseSheet, releaseSheet } from './quantiseSession.ts';

const FACTS: SheetFacts = { detected: 8, colors: 1024 };

function settingsAt(grid: number): QuantiseSettings {
  return { grid, key: null, reduction: { kind: 'MAX_COLORS', maxColors: 32 } };
}

function resultOf(side: number): QuantiseResult {
  return { image: createImage(side, side), colors: 32, keyedShare: 0 };
}

/** The thread the session started, which every test here has to have got one of. */
function thread(): FakeWorker {
  const started = FakeWorker.started.at(-1);
  if (started === undefined) throw new Error('the session started no thread');
  return started;
}

beforeEach(() => {
  // The session and the store it writes into are both module singletons, so a test file is one long
  // session unless each test ends the last one. `releaseSheet` is the app's own way of doing that;
  // `fatal` has no action to clear it because nothing in the app ever recovers from a dead thread,
  // which leaves `setState` as the honest way to put a fresh page back.
  releaseSheet();
  useQuantiseAnswerStore.setState({ survey: null, attempt: null, succeeded: null, fatal: null });
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
    quantiseSheet(settingsAt(4));

    expect(FakeWorker.started).toHaveLength(1);
    expect(thread().of('load')).toHaveLength(1);
    expect(thread().of('quantise')).toHaveLength(2);
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
    // to be here, where the outstanding jobs are, rather than in the hook that comes and goes.
    loadSheet(createImage(64, 64));
    quantiseSheet(settingsAt(8));
    quantiseSheet(settingsAt(8));

    expect(thread().of('quantise')).toHaveLength(1);
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

  it('reports the thread dying as the one failure nothing recovers from', () => {
    loadSheet(createImage(64, 64));
    thread().die();

    expect(useQuantiseAnswerStore.getState().fatal).toBe('The quantiser could not start in this browser');
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
