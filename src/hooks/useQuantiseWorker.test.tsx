import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QUANTISE_DEBOUNCE_MS } from '../constants/quantiser.ts';
import type { ImportedImage, QuantiseResult, SheetFacts } from '../types/quantiser.ts';
import { createImage } from '../utils/imageData.ts';
import type { QuantiseCall, QuantiseReply, QuantiseRequest } from '../workers/quantiseProtocol.ts';
import { useQuantiseWorker } from './useQuantiseWorker.ts';

/**
 * The conversation, without the thread.
 *
 * A stub rather than the real worker because what is under test is the *bridge* — which call is
 * posted when, which reply is believed, and what the tab is told while it waits. The transform on the
 * other end is pure and tested directly in `src/utils/`; running it here would only make these tests
 * slow and non-deterministic about the one thing they exist to pin down.
 */
class FakeWorker {
  static started: FakeWorker[] = [];

  readonly calls: QuantiseCall[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    FakeWorker.started.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(call: QuantiseCall): void {
    this.calls.push(call);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Answer as the real worker does — a `message` event carrying the reply. */
  answer(reply: QuantiseReply): void {
    act(() => {
      for (const listener of this.listeners.get('message') ?? []) listener({ data: reply });
    });
  }

  /** The thread itself failing, which is the one thing no later sheet recovers from. */
  die(): void {
    act(() => {
      for (const listener of this.listeners.get('error') ?? []) listener(new Event('error'));
    });
  }

  of(kind: QuantiseRequest['kind']): QuantiseCall[] {
    return this.calls.filter((call) => call.request.kind === kind);
  }

  /** The id of the most recent call of a kind, which is what its reply has to carry back. */
  lastId(kind: QuantiseRequest['kind']): number {
    return this.of(kind).at(-1)?.id ?? -1;
  }
}

/** A stable reference, as `colorPlanFor`'s memo gives the hook — see the note on `key`. */
const REDUCTION = { kind: 'MAX_COLORS', maxColors: 32 } as const;

const FACTS: SheetFacts = { scale: { grid: 8, measurement: 'EXACT' }, colors: 1024 };
const NO_SCALE: SheetFacts = { scale: null, colors: 1024 };
/** A sheet whose scale was read through its softening — a candidate, never the grid in force. */
const ESTIMATED: SheetFacts = { scale: { grid: 8, measurement: 'ESTIMATED' }, colors: 1024 };

function resultOf(side: number): QuantiseResult {
  return { image: createImage(side, side), colors: 32, keyedShare: 0 };
}

function sheet(name: string): ImportedImage {
  return { name, image: createImage(64, 64) };
}

interface Props {
  readonly source: ImportedImage | null;
  readonly gridOverride: number | null;
}

function drive(initialProps: Props) {
  const view = renderHook(
    ({ source, gridOverride }: Props) => useQuantiseWorker(source, gridOverride, null, REDUCTION),
    {
      initialProps,
    },
  );
  const worker = FakeWorker.started[0];
  if (worker === undefined) throw new Error('the hook started no worker');
  return { ...view, worker };
}

/** Let the debounce elapse, so whatever settings are in force are actually asked for. */
function settle(): void {
  act(() => {
    vi.advanceTimersByTime(QUANTISE_DEBOUNCE_MS);
  });
}

beforeEach(() => {
  FakeWorker.started = [];
  vi.stubGlobal('Worker', FakeWorker);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useQuantiseWorker', () => {
  it('sends the sheet once and reports what came back about it', () => {
    const { result, worker } = drive({ source: sheet('a.png'), gridOverride: null });

    expect(worker.of('load')).toHaveLength(1);
    // Nothing is known yet, and the tab has to say so rather than show an empty measurement.
    expect(result.current.busy).toBe(true);
    expect(result.current.facts).toBeNull();

    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

    expect(result.current.facts).toEqual(FACTS);
    expect(result.current.grid).toBe(8);
    // Still working: the measurement is in, the transform it implies is not.
    expect(result.current.busy).toBe(true);
  });

  it('asks for nothing until the controls have settled', () => {
    const { worker } = drive({ source: sheet('a.png'), gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

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
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });

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
      settings: { grid: 16, key: null, reduction: REDUCTION },
    });
  });

  it('stops saying it is working once the answer matches the question', () => {
    const { result, worker } = drive({ source: sheet('a.png'), gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    worker.answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    expect(result.current.busy).toBe(false);
    expect(result.current.quantised).toEqual({ result: expect.objectContaining({ colors: 32 }), grid: 8 });
    expect(result.current.error).toBeNull();
  });

  it('keeps the last sheet up while a newer one is computed, and says so', () => {
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    worker.answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    rerender({ source, gridOverride: 4 });
    settle();

    // Blanking the pane would throw away what the tab exists to show — and the reader's pan position
    // with it — so the previous result stays, at the grid it was actually computed at.
    expect(result.current.busy).toBe(true);
    expect(result.current.quantised?.grid).toBe(8);
  });

  it('shows no result at all once there is no scale to compute one at', () => {
    // The state a cleared grid box reaches on a sheet detection could not measure. There is nothing
    // coming, so `busy` is false — which means a result left on screen here would be presented as
    // settled: captioned without "updating…", and offered to the Download button, while the panel
    // above it asks for a grid.
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: 8 });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: NO_SCALE });
    settle();
    worker.answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });
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
    const source = sheet('resampled.png');
    const { result, worker } = drive({ source, gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: ESTIMATED });
    settle();

    expect(result.current.facts).toEqual(ESTIMATED);
    expect(result.current.grid).toBeNull();
    expect(worker.of('quantise')).toHaveLength(0);
    expect(result.current.busy).toBe(false);
  });

  it('takes an estimated scale once the user clicks it', () => {
    // The other half of the same rule: nothing about an estimate is unusable, it simply has to be
    // chosen. Once it is, it is an override like any other and the transform runs at it.
    const source = sheet('resampled.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: ESTIMATED });
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
    worker.answer({ id: worker.lastId('load'), kind: 'failed', reason: 'Array buffer allocation failed' });

    expect(result.current.error).toBe('Array buffer allocation failed');
    expect(result.current.busy).toBe(false);

    rerender({ source: sheet('small.png'), gridOverride: null });

    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(true);
    expect(worker.of('load')).toHaveLength(2);
  });

  it('lets a different grid recover from a transform that failed', () => {
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: 1 });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    worker.answer({ id: worker.lastId('quantise'), kind: 'failed', reason: 'Out of memory' });
    expect(result.current.error).toBe('Out of memory');

    rerender({ source, gridOverride: 16 });

    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(true);
  });

  it('never reports the thread dying as something a new sheet fixes', () => {
    // The one genuinely terminal failure, and the reason the two are told apart: the thread is gone,
    // so nothing it is asked will answer.
    const { result, rerender, worker } = drive({ source: sheet('a.png'), gridOverride: null });
    worker.die();

    rerender({ source: sheet('b.png'), gridOverride: null });

    expect(result.current.error).toBe('The quantiser could not start in this browser');
    expect(result.current.busy).toBe(false);
  });

  it('forgets everything about a sheet that has been cleared, and says so to the worker', () => {
    // The release is the half worth pinning: the worker holds the only other copy of the sheet, and a
    // cleared tab has no use for it. The hook dropping its own answers is the other half of the same
    // fix — it is what stops 67 megabytes of a 4096 x 4096 sheet staying reachable from state — but
    // that is a property of the heap rather than of the return value, so nothing here can observe it.
    const source = sheet('a.png');
    const { result, rerender, worker } = drive({ source, gridOverride: null });
    worker.answer({ id: worker.lastId('load'), kind: 'loaded', facts: FACTS });
    settle();
    worker.answer({ id: worker.lastId('quantise'), kind: 'quantised', result: resultOf(8) });

    rerender({ source: null, gridOverride: null });

    expect(result.current.facts).toBeNull();
    expect(result.current.quantised).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(worker.of('release')).toHaveLength(1);
  });

  it('ignores an answer about the sheet before this one', () => {
    // A reply already in flight when the next sheet arrives. It carries a correlation id the hook is
    // still expecting, so only the image it was about can tell it apart.
    const { result, rerender, worker } = drive({ source: sheet('a.png'), gridOverride: null });
    const stale = worker.lastId('load');
    rerender({ source: sheet('b.png'), gridOverride: null });

    worker.answer({ id: stale, kind: 'loaded', facts: FACTS });

    expect(result.current.facts).toBeNull();
    expect(result.current.busy).toBe(true);
  });

  it('takes the thread with it when the tab goes', () => {
    const { unmount, worker } = drive({ source: sheet('a.png'), gridOverride: null });

    unmount();

    expect(worker.terminated).toBe(true);
  });
});
