import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QUANTISE_DEBOUNCE_MS } from '../constants/quantiser.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import { FakeWorker } from '../test/fakeWorker.ts';
import type { ImportedImage, QuantiseResult, SheetFacts } from '../types/quantiser.ts';
import { flatDifference } from '../test/images.ts';
import { createImage } from '../utils/imageData.ts';
import type { QuantiseReply } from '../workers/quantiseProtocol.ts';
import { useQuantiseWork } from './useQuantiseWork.ts';

/** A stable reference, as `colorPlanFor`'s memo gives the hook — see the note on `key`. */
const TUNING = {
  silhouetteThreshold: 0,
  vote: 'DOMINANT',
  lineStrength: 1.5,
  trimStrength: 0,
  inkThreshold: 64,
  colorMerge: 0,
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
  antiAlias: 'OFF' as const,
  antiAliasThreshold: 24,
  antiAliasStrength: 100,
  antiAliasRun: 2,
  antiAliasPalette: 'SNAP' as const,
  dither: 'NONE' as const,
  outlineExpansion: 0,
} as const;

const REDUCTION = { kind: 'MAX_COLORS', maxColors: 32 } as const;

const FACTS: SheetFacts = { scale: { grid: 8, measurement: 'EXACT' }, colors: 1024 };
const NO_SCALE: SheetFacts = { scale: null, colors: 1024 };
/** A sheet whose scale was read through its softening — a candidate, never the grid in force. */
const ESTIMATE: SheetFacts = { scale: { grid: 8, measurement: 'REPEAT_DISTANCE' }, colors: 1024 };

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

function sheet(name: string): ImportedImage {
  return { name, image: createImage(64, 64) };
}

interface Props {
  readonly source: ImportedImage | null;
  readonly gridOverride: number | null;
}

/**
 * Render the hook over the store the tab reads, with a sheet already dropped.
 *
 * The source goes in through `setSource` rather than straight into the hook, because that is where
 * the sheet now reaches the worker — the hook asks for transforms and reads answers, and never sends
 * an image. Driving it any other way would test an arrangement the app does not have.
 */
function drive(initialProps: Props) {
  const dropped = initialProps.source;
  if (dropped !== null) {
    act(() => {
      useQuantiseStore.getState().setSource(dropped);
    });
  }

  const view = renderHook(
    ({ source, gridOverride }: Props) => useQuantiseWork(source, gridOverride, null, REDUCTION, TUNING),
    { initialProps },
  );
  return { ...view, worker: thread() };
}

/** The thread the session started, which every test here has to have got one of. */
function thread(): FakeWorker {
  const started = FakeWorker.started.at(-1);
  if (started === undefined) throw new Error('the session started no thread');
  return started;
}

/** Answer as the worker does, inside React's `act` so the store's subscribers see it. */
function answer(reply: QuantiseReply): void {
  act(() => {
    thread().answer(reply);
  });
}

/** Let the debounce elapse, so whatever settings are in force are actually asked for. */
function settle(): void {
  act(() => {
    vi.advanceTimersByTime(QUANTISE_DEBOUNCE_MS);
  });
}

beforeEach(() => {
  // `clear` ends the previous test's session and drops everything it answered — including a thread
  // it recorded as lost, which is the whole point of `clear` resetting rather than forgetting. It is
  // exactly what the app does when the user is finished with a sheet, so nothing here is a back door.
  useQuantiseStore.getState().clear();
  FakeWorker.started = [];
  vi.stubGlobal('Worker', FakeWorker);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useQuantiseWork', () => {
  it('reports what came back about the sheet the store sent', () => {
    const { result, worker } = drive({ source: sheet('a.png'), gridOverride: null });

    expect(worker.of('load')).toHaveLength(1);
    // Nothing is known yet, and the tab has to say so rather than show an empty measurement.
    expect(result.current.busy).toBe(true);
    expect(result.current.facts).toBeNull();

    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

    expect(result.current.facts).toEqual(FACTS);
    expect(result.current.grid).toBe(8);
    // Still working: the measurement is in, the transform it implies is not.
    expect(result.current.busy).toBe(true);
  });

  it('asks for nothing until the controls have settled', () => {
    const { worker } = drive({ source: sheet('a.png'), gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

    act(() => {
      vi.advanceTimersByTime(QUANTISE_DEBOUNCE_MS - 1);
    });
    expect(worker.of('quantise')).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(worker.of('quantise')).toHaveLength(1);
  });

  it('computes the number that was typed, never the digits on the way to it', () => {
    // The whole reason the debounce exists. Reaching 16 through the keyboard passes through 1, and a
    // grid of 1 is the most expensive scale there is — every pixel its own cell, and no downscale
    // before the palette step. On the largest sheet the app admits that intermediate state was 28
    // seconds of work nobody asked for.
    const source = sheet('a.png');
    const { rerender, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

    rerender({ source, gridOverride: 1 });
    act(() => {
      vi.advanceTimersByTime(QUANTISE_DEBOUNCE_MS / 2);
    });
    rerender({ source, gridOverride: 16 });
    settle();

    const asked = worker.of('quantise');
    expect(asked).toHaveLength(1);
    expect(asked[0]?.request).toEqual({
      kind: 'quantise',
      settings: {
        grid: 16,
        key: null,
        silhouetteThreshold: 0,
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
        antiAlias: 'OFF' as const,
        antiAliasThreshold: 24,
        antiAliasStrength: 100,
        antiAliasRun: 2,
        antiAliasPalette: 'SNAP' as const,
        dither: 'NONE' as const,
        outlineExpansion: 0,
        colorMerge: 0,
        reduction: REDUCTION,
      },
    });
  });

  it('stops saying it is working once the answer matches the question', () => {
    const { result, worker } = drive({ source: sheet('a.png'), gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    expect(result.current.busy).toBe(false);
    expect(result.current.quantised).toEqual({ result: expect.objectContaining({ colors: 32 }), grid: 8 });
    expect(result.current.error).toBeNull();
  });

  it('keeps the last sheet up while a newer one is computed, and says so', () => {
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    rerender({ source, gridOverride: 4 });
    settle();

    // Blanking the pane would throw away what the tab exists to show — and the reader's pan position
    // with it — so the previous result stays, at the grid it was actually computed at.
    expect(result.current.busy).toBe(true);
    expect(result.current.quantised?.grid).toBe(8);
  });

  it('keeps its answers when the tab is left and returned to', () => {
    // The regression this arrangement exists for. Navigating to the studio to change the colour
    // budget the quantiser reads is the ordinary way this feature is used, and `App` unmounts the
    // view to do it — so a pipeline owned by the component sent a sheet of up to 67 megabytes to a
    // fresh thread and re-ran a transform of up to 16.8 million pixels, both to arrive back at the
    // answer it had just discarded.
    const source = sheet('a.png');
    const { unmount, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    unmount();
    const returned = renderHook(() => useQuantiseWork(source, null, null, REDUCTION, TUNING));
    settle();

    // Nothing was started, nothing was sent, and nothing was asked for a second time.
    expect(FakeWorker.started).toHaveLength(1);
    expect(worker.terminated).toBe(false);
    expect(worker.of('load')).toHaveLength(1);
    expect(worker.of('quantise')).toHaveLength(1);
    // …and the tab is showing the sheet it was showing when it left, settled rather than working.
    expect(returned.result.current.busy).toBe(false);
    expect(returned.result.current.facts).toEqual(FACTS);
    expect(returned.result.current.quantised).toEqual({
      result: expect.objectContaining({ colors: 32 }),
      grid: 8,
    });
  });

  it('does not ask a second time for a transform it left running', () => {
    // The same trip, taken before the answer landed. The returning tab has no result to compare
    // against, so nothing here can tell it the question is already in flight — the session can, and
    // that is why the guard lives there.
    const source = sheet('a.png');
    const { unmount, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    expect(worker.of('quantise')).toHaveLength(1);

    unmount();
    renderHook(() => useQuantiseWork(source, null, null, REDUCTION, TUNING));
    settle();

    // Counted across every thread rather than on the one `drive` returned. The arrangement this
    // replaced started a *second* worker on remount and posted the duplicate to that, which leaves
    // the first thread's tally at one — so an assertion naming a single thread would have passed
    // against the very code this is here to catch.
    expect(FakeWorker.started).toHaveLength(1);
    expect(FakeWorker.started.flatMap((started) => started.of('quantise'))).toHaveLength(1);
    expect(worker.of('quantise')).toHaveLength(1);
  });

  it('stops reporting a dead thread once the tab is cleared and a new sheet works', () => {
    // The pairing that has to hold between the session and the store. `clear` ends the session, and
    // ending the session is what lets a thread be built again — so the message saying one could not
    // be has to go at the same moment. Kept apart, the tab captions a preview it has just produced
    // with "The quantiser could not start in this browser", for the rest of the page's life: the
    // component state that used to be discarded on unmount was the only thing clearing it.
    const { result, rerender } = drive({ source: sheet('a.png'), gridOverride: null });
    act(() => {
      thread().die();
    });
    expect(result.current.error).toBe('The quantiser could not start in this browser');

    act(() => {
      useQuantiseStore.getState().clear();
    });
    const next = sheet('b.png');
    act(() => {
      useQuantiseStore.getState().setSource(next);
    });
    rerender({ source: next, gridOverride: null });
    answer({ id: thread().lastId('load'), kind: 'loaded', facts: FACTS });

    expect(FakeWorker.started).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(result.current.facts).toEqual(FACTS);
  });

  it('shows no result at all once there is no scale to compute one at', () => {
    // The state a cleared grid box reaches on a sheet detection could not measure. There is nothing
    // coming, so `busy` is false — which means a result left on screen here would be presented as
    // settled: captioned without "updating…", and offered to the Download button, while the panel
    // above it asks for a grid.
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: 8 });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: NO_SCALE });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });
    expect(result.current.quantised).not.toBeNull();

    rerender({ source, gridOverride: null });

    expect(result.current.grid).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(result.current.quantised).toBeNull();
  });

  it('does not adopt an estimated scale, and computes nothing until one is chosen', () => {
    // The rule the estimate exists under: it is read through the resampling that destroyed the
    // sheet's edges, so it carries a tolerance the exact reading does not. Adopted here it would
    // reduce the sheet by a factor nobody chose and nobody was asked to check, while the panel
    // beside the preview described it as an estimate. `GridControls` offers it to click instead.
    const { result, worker } = drive({ source: sheet('resampled.png'), gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: ESTIMATE });
    settle();

    expect(result.current.facts).toEqual(ESTIMATE);
    expect(result.current.grid).toBeNull();
    expect(worker.of('quantise')).toHaveLength(0);
    expect(result.current.busy).toBe(false);
  });

  it('takes an estimated scale once the user clicks it', () => {
    // The other half of the same rule: nothing about an estimate is unusable, it simply has to be
    // chosen. Once it is, it is an override like any other and the transform runs at it.
    const source = sheet('resampled.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: ESTIMATE });
    settle();

    rerender({ source, gridOverride: 8 });
    settle();

    expect(result.current.grid).toBe(8);
    expect(worker.of('quantise')).toHaveLength(1);
  });

  it('lets a new sheet recover from a survey that failed', () => {
    // A `failed` reply to a load is per-image — the worker catches its own exception and carries on,
    // and the realistic cause is memory on one very large sheet, which says nothing about the next
    // one. Treated as terminal it would pin the error banner above every later sheet and hold every
    // busy indicator off for the rest of the session, while the transform ran and the preview
    // changed underneath.
    const { result, rerender, worker } = drive({ source: sheet('huge.png'), gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'failed', reason: 'Array buffer allocation failed' });

    expect(result.current.error).toBe('Array buffer allocation failed');
    expect(result.current.busy).toBe(false);

    const next = sheet('small.png');
    act(() => {
      useQuantiseStore.getState().setSource(next);
    });
    rerender({ source: next, gridOverride: null });

    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(true);
    expect(worker.of('load')).toHaveLength(2);
  });

  it('lets a different grid recover from a transform that failed', () => {
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: 1 });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'failed', reason: 'Out of memory' });
    expect(result.current.error).toBe('Out of memory');

    rerender({ source, gridOverride: 16 });

    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(true);
  });

  it('never reports the thread dying as something a new sheet fixes', () => {
    // The one genuinely terminal failure, and the reason the two are told apart: the thread is gone,
    // so nothing it is asked will answer.
    const { result, rerender } = drive({ source: sheet('a.png'), gridOverride: null });
    act(() => {
      thread().die();
    });

    const next = sheet('b.png');
    act(() => {
      useQuantiseStore.getState().setSource(next);
    });
    rerender({ source: next, gridOverride: null });

    expect(result.current.error).toBe('The quantiser could not start in this browser');
    expect(result.current.busy).toBe(false);
  });

  it('forgets everything about a sheet that has been cleared, and takes the thread with it', () => {
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    act(() => {
      useQuantiseStore.getState().clear();
    });
    rerender({ source: null, gridOverride: null });

    expect(result.current.facts).toBeNull();
    expect(result.current.quantised).toBeNull();
    expect(result.current.busy).toBe(false);
    // The thread was holding the only other copy of the sheet, and a cleared tab has no use for it.
    expect(worker.terminated).toBe(true);
  });
});
