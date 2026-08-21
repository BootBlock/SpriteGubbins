import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SYMMETRY_GUIDANCE } from '../../constants/spriteSymmetry.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteSegmentation, SpriteSymmetry } from '../../types/quantiser.ts';
import { SymmetryControls } from './SymmetryControls.tsx';

/**
 * What the panel says about a reading, and which controls it offers while saying it.
 *
 * The maths is pinned in `utils/symmetryAxis.test.ts` and `utils/symmetrySnap.test.ts`, and the
 * pipeline's use of both in `utils/quantiseImage.test.ts`. What can only be checked here is the
 * panel's agreement with the store and with the state it is describing: that the two dials appear
 * exactly where they can act, that an empty reading over a sheet that never segmented is not
 * reported as "no symmetry found", and that a snap nothing qualified for says so rather than looking
 * like a control that did nothing.
 */

const SEGMENTED: SpriteSegmentation = {
  kind: 'SEGMENTED',
  boxes: [{ left: 0, top: 0, width: 6, height: 6, pixels: 24 }],
  specks: 0,
};

function reading(confidence: number, snapped: boolean): SpriteSymmetry {
  return { box: { left: 0, top: 0, width: 6, height: 6, pixels: 24 }, axis: 2.5, confidence, snapped };
}

function show(overrides: Partial<Parameters<typeof SymmetryControls>[0]> = {}) {
  render(<SymmetryControls symmetry={null} sprites={SEGMENTED} busy={false} {...overrides} />);
}

describe('SymmetryControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('opens off, offering neither dial and saying what the control is for', () => {
    show();

    expect(useQuantiseStore.getState().symmetry).toBe('OFF');
    expect(screen.queryByRole('slider', { name: /Symmetry tolerance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /Confidence floor/ })).not.toBeInTheDocument();
    expect(screen.getByText(SYMMETRY_GUIDANCE.off)).toBeInTheDocument();
  });

  it('offers the tolerance once a reading is being taken, and the floor only once one is acted on', async () => {
    show();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /Symmetry/ }), 'CHECK');
    expect(screen.getByRole('slider', { name: /Symmetry tolerance/ })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /Confidence floor/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /Symmetry/ }), 'SNAP');
    expect(screen.getByRole('slider', { name: /Confidence floor/ })).toBeInTheDocument();
  });

  it('lists each sprite it was given an axis and a share for', () => {
    useQuantiseStore.getState().setSymmetry('CHECK');
    show({ symmetry: [reading(0.92, false), reading(1, false)] });

    expect(screen.getByText(/x 2\.5 · 92% mirrored/)).toBeInTheDocument();
    expect(screen.getByText('2 sprites scored')).toBeInTheDocument();
    expect(screen.getByText(SYMMETRY_GUIDANCE.read)).toBeInTheDocument();
  });

  it('says a snap settled nothing rather than looking like a control that did nothing', () => {
    useQuantiseStore.getState().setSymmetry('SNAP');
    show({ symmetry: [reading(0.6, false)] });

    expect(screen.getByText('none settled')).toBeInTheDocument();
    expect(screen.getByText(SYMMETRY_GUIDANCE.refused)).toBeInTheDocument();
  });

  it('names the sprites the snap reached', () => {
    useQuantiseStore.getState().setSymmetry('SNAP');
    show({ symmetry: [reading(0.98, true), reading(0.6, false)] });

    expect(screen.getByText('1 settled')).toBeInTheDocument();
    expect(screen.getByText(/x 2\.5 · 98% mirrored · settled/)).toBeInTheDocument();
    expect(screen.getByText(SYMMETRY_GUIDANCE.snapped)).toBeInTheDocument();
  });

  it('blames the segmentation, not symmetry, where there was no sprite to score', () => {
    // The pass ran and had nothing to run on, which is a fact about the keying — and the panel above
    // is the one that says why. Reporting it as "no symmetry found" would send a reader to the wrong
    // control.
    useQuantiseStore.getState().setSymmetry('CHECK');
    show({ symmetry: [], sprites: { kind: 'SOLID' } });

    expect(screen.getByText(SYMMETRY_GUIDANCE.none)).toBeInTheDocument();
  });

  it('withdraws the figures while a newer result is on its way', () => {
    // The previous job's axes are numbers about a sheet the dials have already moved on from, and a
    // line of bare figures has nothing to say it is the old one.
    useQuantiseStore.getState().setSymmetry('CHECK');
    show({ symmetry: [reading(0.92, false)], busy: true });

    expect(screen.queryByText(/% mirrored/)).not.toBeInTheDocument();
    expect(screen.getByText('Reading the sprites…')).toBeInTheDocument();
    // The paragraph stays, and it stays the one for the mode in force: falling back to the off
    // paragraph here told a reader to go and read the sheet before settling anything, in the middle
    // of a snap they had just asked for.
    expect(screen.getByText(SYMMETRY_GUIDANCE.read)).toBeInTheDocument();
  });
});
