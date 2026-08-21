import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AUTO_TUNE_GUIDANCE, TUNE_STAGE_LABELS } from '../../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../../constants/quantiseDials.ts';
import { useAutoTuneStore } from '../../stores/useAutoTuneStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { FakeAutoTuneWorker } from '../../test/fakeAutoTuneWorker.ts';
import type { TuneOutcome } from '../../types/autoTune.ts';
import type { QuantiseSettings } from '../../types/quantiser.ts';
import { createImage } from '../../utils/imageData.ts';
import { abandonSweep } from '../../workers/autoTuneSession.ts';
import { AutoTuneControls } from './AutoTuneControls.tsx';

/**
 * What the panel offers, what a press does to the dials, and what it says afterwards.
 *
 * The sweep itself is pinned in `utils/autoTune.test.ts` and the bridge in
 * `workers/autoTuneSession.test.ts`. What can only be checked here is the panel's own contract: that
 * the answer lands on the dials as **one** step a single undo reverses, that the ten dials the sweep
 * does not touch are untouched, and that the button refuses where there is nothing to sweep against.
 */

const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: 4,
  key: null,
  reduction: null,
};

const OUTCOME: TuneOutcome = {
  dials: {
    vote: 'INK_WEIGHTED',
    outlineExpansion: 2,
    lineStrength: 2.5,
    trimStrength: 1,
    inkThreshold: 76,
    colorMerge: 12,
    fillCleanup: 0,
    cleanupPasses: 1,
  },
  crops: 3,
  cropEdge: 160,
  candidates: 60,
  reading: { fidelity: 0.9412, colors: 24 },
  baseline: { fidelity: 0.8137, colors: 31 },
  stages: [
    { stage: 'READING', candidates: 15, skipped: null, settled: 'INK_WEIGHTED, expansion 2' },
    { stage: 'INK_BLEND', candidates: 20, skipped: null, settled: 'line 2.5, trim 1.0' },
    { stage: 'INK_THRESHOLD', candidates: 5, skipped: null, settled: 'ink below 76' },
    { stage: 'COLOUR_MERGE', candidates: 8, skipped: null, settled: 'merge 12' },
    { stage: 'FILL_CLEANUP', candidates: 7, skipped: null, settled: 'cleanup off' },
    {
      stage: 'CLEANUP_PASSES',
      candidates: 0,
      skipped: 'The fill cleanup settled at off, so a second pass has nothing to run over.',
      settled: '1 pass',
    },
  ],
};

function show(overrides: Partial<Parameters<typeof AutoTuneControls>[0]> = {}) {
  render(<AutoTuneControls image={createImage(8, 8)} settings={SETTINGS} {...overrides} />);
}

function thread(): FakeAutoTuneWorker {
  const started = FakeAutoTuneWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

beforeEach(() => {
  FakeAutoTuneWorker.reset();
  useQuantiseStore.getState().clear();
  useAutoTuneStore.setState({ run: 0, tuning: false, outcome: null, error: null });
  vi.stubGlobal('Worker', FakeAutoTuneWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AutoTuneControls', () => {
  it('offers the sweep, and explains what it is for before it has run', () => {
    show();

    expect(screen.getByRole('button', { name: /Auto/ })).toBeEnabled();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.idle)).toBeInTheDocument();
  });

  it('refuses, with a reason, until a pixel scale is settled', () => {
    show({ settings: null });

    expect(screen.getByRole('button', { name: /Auto/ })).toBeDisabled();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.waiting)).toBeInTheDocument();
  });

  it('moves the dials the sweep swept, and leaves every other dial alone', async () => {
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(useQuantiseStore.getState().vote).toBe('INK_WEIGHTED');
    });
    const dials = useQuantiseStore.getState();
    expect(dials.outlineExpansion).toBe(2);
    expect(dials.lineStrength).toBe(2.5);
    expect(dials.colorMerge).toBe(12);
    // The ten it must not reach — a keying setting deletes pixels, a dither trades likeness away on
    // purpose, and the rest change what the tab reports rather than what it draws.
    expect(dials.keyingEnabled).toBe(QUANTISE_DEFAULT_DIALS.keyingEnabled);
    expect(dials.keyTolerance).toBe(QUANTISE_DEFAULT_DIALS.keyTolerance);
    expect(dials.dither).toBe(QUANTISE_DEFAULT_DIALS.dither);
    expect(dials.paletteSnap).toBe(QUANTISE_DEFAULT_DIALS.paletteSnap);
    expect(dials.spriteGap).toBe(QUANTISE_DEFAULT_DIALS.spriteGap);
    expect(dials.symmetry).toBe(QUANTISE_DEFAULT_DIALS.symmetry);
    expect(dials.symmetryTolerance).toBe(QUANTISE_DEFAULT_DIALS.symmetryTolerance);
    expect(dials.symmetryConfidence).toBe(QUANTISE_DEFAULT_DIALS.symmetryConfidence);
    expect(dials.duplicateTolerance).toBe(QUANTISE_DEFAULT_DIALS.duplicateTolerance);
    expect(dials.duplicateSnap).toBe(QUANTISE_DEFAULT_DIALS.duplicateSnap);
  });

  it('lands the whole answer as one step a single undo reverses', async () => {
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));
    await waitFor(() => {
      expect(useQuantiseStore.getState().vote).toBe('INK_WEIGHTED');
    });

    useQuantiseStore.getState().undo();

    const dials = useQuantiseStore.getState();
    expect(dials.vote).toBe(QUANTISE_DEFAULT_DIALS.vote);
    expect(dials.outlineExpansion).toBe(QUANTISE_DEFAULT_DIALS.outlineExpansion);
    expect(dials.lineStrength).toBe(QUANTISE_DEFAULT_DIALS.lineStrength);
    expect(dials.colorMerge).toBe(QUANTISE_DEFAULT_DIALS.colorMerge);
  });

  it('says what it is doing while it runs, and disables the button', async () => {
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    expect(screen.getByRole('button', { name: /Tuning/ })).toBeDisabled();
    expect(screen.getByText('Sweeping the dials…')).toBeInTheDocument();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.running)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sweeping the quantiser’s dials.');
  });

  it('reports what the sweep cost and what it was worth', async () => {
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(screen.getByText('60 positions · 3 crops of 160 px')).toBeInTheDocument();
    });
    expect(screen.getByText('likeness 0.814 → 0.941')).toBeInTheDocument();
    expect(screen.getByText('31 → 24 colours')).toBeInTheDocument();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.settled)).toBeInTheDocument();
  });

  it('names each stage, and says which of them had nothing to try', async () => {
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(
        screen.getByText(`${TUNE_STAGE_LABELS.READING} · INK_WEIGHTED, expansion 2 · 15 positions tried`),
      ).toBeInTheDocument();
    });
    // A skipped stage is listed rather than left out: an unmoved dial that was never swept and one
    // that was swept and left alone are different facts about the sheet.
    expect(
      screen.getByText(
        `${TUNE_STAGE_LABELS.CLEANUP_PASSES} · 1 pass · The fill cleanup settled at off, so a second pass has nothing to run over.`,
      ),
    ).toBeInTheDocument();
  });

  it('shows what went wrong, and offers the sweep again', async () => {
    FakeAutoTuneWorker.respond = () =>
      Promise.resolve({ kind: 'failed', reason: 'Array buffer allocation failed' });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Array buffer allocation failed');
    });
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.failed)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto/ })).toBeEnabled();
  });

  it('leaves the dials where they were when the sweep is disowned by a new sheet', async () => {
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));
    // What `setSource` does while a sweep is in flight: the thread ends and the answer is dropped.
    abandonSweep();
    thread().answer({ kind: 'tuned', outcome: OUTCOME });

    await waitFor(() => {
      expect(useAutoTuneStore.getState().tuning).toBe(false);
    });
    expect(useQuantiseStore.getState().vote).toBe(QUANTISE_DEFAULT_DIALS.vote);
    expect(useAutoTuneStore.getState().outcome).toBeNull();
  });

  it('retires the report the moment a dial moves, rather than leaving it asserting where they are', async () => {
    // Every line of the report is a statement about where the dials stand, and the paragraph beside
    // it says they have just moved and that one undo puts them back. An undo — or a hand on a
    // slider — makes all of that false while it is still on screen.
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));
    await waitFor(() => {
      expect(screen.getByText('60 positions · 3 crops of 160 px')).toBeInTheDocument();
    });

    useQuantiseStore.getState().undo();

    await waitFor(() => {
      expect(screen.queryByText('60 positions · 3 crops of 160 px')).not.toBeInTheDocument();
    });
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.idle)).toBeInTheDocument();
  });

  it('keeps its own report when the sweep applies it, which is the one write that must not retire it', async () => {
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(useQuantiseStore.getState().vote).toBe('INK_WEIGHTED');
    });
    expect(useAutoTuneStore.getState().outcome).toEqual(OUTCOME);
  });

  it('says why the button is unavailable beside the report rather than instead of it', async () => {
    // Reachable by clearing the grid box after a sweep: the report is still true about the dials,
    // and the button is still unavailable, and both sentences are needed.
    FakeAutoTuneWorker.respond = () => Promise.resolve({ kind: 'tuned', outcome: OUTCOME });
    const { rerender } = render(<AutoTuneControls image={createImage(8, 8)} settings={SETTINGS} />);

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));
    await waitFor(() => {
      expect(screen.getByText('60 positions · 3 crops of 160 px')).toBeInTheDocument();
    });

    rerender(<AutoTuneControls image={createImage(8, 8)} settings={null} />);

    expect(screen.getByText('60 positions · 3 crops of 160 px')).toBeInTheDocument();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.settled)).toBeInTheDocument();
    expect(screen.getByText(AUTO_TUNE_GUIDANCE.waiting)).toBeInTheDocument();
  });

  it('does not repeat the failure text its alert already carries', async () => {
    // Both regions change in one render, so a reason in each is announced twice.
    FakeAutoTuneWorker.respond = () =>
      Promise.resolve({ kind: 'failed', reason: 'Array buffer allocation failed' });
    show();

    await userEvent.click(screen.getByRole('button', { name: /Auto/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Array buffer allocation failed');
    });
    expect(screen.getByRole('status')).toHaveTextContent('The sweep produced nothing.');
    expect(screen.getByRole('status')).not.toHaveTextContent('Array buffer allocation');
  });
});
