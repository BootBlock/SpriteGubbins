import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FRAME_ALIGNMENT_GUIDANCE } from '../../constants/frameAlignment.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { AlignedFrame, SpriteSegmentation, SpriteStrip } from '../../types/quantiser.ts';
import { FrameAlignmentControls } from './FrameAlignmentControls.tsx';

/**
 * What the panel says about a reading, and which controls it offers while saying it.
 *
 * The maths is pinned in `utils/frameAlignment.test.ts`, `utils/frameLattice.test.ts` and
 * `utils/frameRegister.test.ts`, and the pipeline's use of them in `utils/quantiseImage.test.ts`.
 * What can only be checked here is the panel's agreement with the store and with the state it is
 * describing — and above all that its three empty states stay apart: a sheet that never segmented,
 * a sheet whose sprites form no row long enough, and a snap that moved nothing all look identical
 * from a count and each sends a reader somewhere different.
 */

const SEGMENTED: SpriteSegmentation = {
  kind: 'SEGMENTED',
  boxes: [{ left: 0, top: 0, width: 6, height: 6, pixels: 24 }],
  specks: 0,
};

function frameAt(left: number, drift: number, snapped = false): AlignedFrame {
  return {
    box: { left, top: 0, width: 6, height: 6, pixels: 24 },
    drift: { x: drift, y: 0 },
    slot: { x: left, y: 0 },
    snapped,
  };
}

function stripOf(...frames: readonly AlignedFrame[]): SpriteStrip {
  return { frames, pitch: { x: 20, y: 0 } };
}

function show(overrides: Partial<Parameters<typeof FrameAlignmentControls>[0]> = {}) {
  render(<FrameAlignmentControls strips={null} sprites={SEGMENTED} busy={false} {...overrides} />);
}

describe('FrameAlignmentControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('opens off, offering no tolerance and saying what the control is for', () => {
    show();

    expect(useQuantiseStore.getState().frameAlignment).toBe('OFF');
    expect(screen.queryByRole('slider', { name: /Drift tolerance/ })).not.toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.off)).toBeInTheDocument();
  });

  it('offers the tolerance only once something is being moved', async () => {
    show();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /Frame alignment/ }), 'CHECK');
    expect(screen.queryByRole('slider', { name: /Drift tolerance/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /Frame alignment/ }), 'SNAP');
    expect(screen.getByRole('slider', { name: /Drift tolerance/ })).toBeInTheDocument();
  });

  it('lists each strip with the drift of every frame in it', () => {
    useQuantiseStore.getState().setFrameAlignment('CHECK');
    show({ strips: [stripOf(frameAt(0, 0), frameAt(20, 2), frameAt(40, 0))] });

    expect(screen.getByText(/pitch 20\.0 × 0\.0 · \+0,\+0 \+2,\+0 \+0,\+0/)).toBeInTheDocument();
    expect(screen.getByText('1 strip · 3 frames')).toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.read)).toBeInTheDocument();
  });

  it('says a snap moved nothing rather than looking like a control that did nothing', () => {
    useQuantiseStore.getState().setFrameAlignment('SNAP');
    show({ strips: [stripOf(frameAt(0, 0), frameAt(20, 0), frameAt(40, 0))] });

    expect(screen.getByText('none moved')).toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.refused)).toBeInTheDocument();
  });

  it('marks the frames the move reached', () => {
    useQuantiseStore.getState().setFrameAlignment('SNAP');
    show({ strips: [stripOf(frameAt(0, 0), frameAt(20, 2, true), frameAt(40, 0))] });

    expect(screen.getByText('1 moved')).toBeInTheDocument();
    expect(screen.getByText(/\+2,\+0\*/)).toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.moved)).toBeInTheDocument();
  });

  it('blames the rows, not the keying, where the sheet did segment', () => {
    // Sprites were found and none of their rows holds three frames — a fact about this pass, whose
    // answer is the sprite gap above. Sending the reader to the keying would be the wrong control.
    useQuantiseStore.getState().setFrameAlignment('CHECK');
    show({ strips: [] });

    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.short)).toBeInTheDocument();
  });

  it('blames the segmentation where there was no sprite at all', () => {
    // The pass ran and had nothing to run on, which is a fact about the keying — and the sprite
    // panel above is the one that says why.
    useQuantiseStore.getState().setFrameAlignment('CHECK');
    show({ strips: [], sprites: { kind: 'SOLID' } });

    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.none)).toBeInTheDocument();
  });

  it('withdraws the figures while a newer result is on its way', () => {
    useQuantiseStore.getState().setFrameAlignment('CHECK');
    show({ strips: [stripOf(frameAt(0, 0), frameAt(20, 2), frameAt(40, 0))], busy: true });

    expect(screen.queryByText(/pitch 20\.0/)).not.toBeInTheDocument();
    expect(screen.getByText('Reading the rows…')).toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.pending)).toBeInTheDocument();
  });

  it('never reports a finding from the reading before the one being taken', () => {
    // Selecting SNAP marks the answer stale on the same render, before the worker has been asked for
    // anything. Judged against the readings still in hand — taken under CHECK, so none of them
    // moved — the panel would announce that nothing qualified, for as long as the sheet took.
    useQuantiseStore.getState().setFrameAlignment('SNAP');
    show({ strips: [stripOf(frameAt(0, 0), frameAt(20, 4), frameAt(40, 0))], busy: true });

    expect(screen.queryByText(FRAME_ALIGNMENT_GUIDANCE.refused)).not.toBeInTheDocument();
    expect(screen.queryByText('none moved')).not.toBeInTheDocument();
    expect(screen.getByText(FRAME_ALIGNMENT_GUIDANCE.pending)).toBeInTheDocument();
  });
});
