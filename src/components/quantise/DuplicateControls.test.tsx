import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DUPLICATE_GUIDANCE } from '../../constants/spriteDuplicates.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteBox, SpriteDuplicateGroup, SpriteSegmentation } from '../../types/quantiser.ts';
import { DuplicateControls } from './DuplicateControls.tsx';

/**
 * What the panel says about a finding, and what its two controls do to the store.
 *
 * The finding itself is pinned in `utils/duplicateSprites.test.ts` and the fold in
 * `utils/snapDuplicates.test.ts`. What can only be checked here is the panel's agreement with the
 * result it is handed: that it tells "nothing to compare" from "nothing alike", that it reports the
 * fold from the *result's* answer rather than from the dial beside it, and that the snap is refused
 * with a reason wherever it would have nothing to act on.
 */

function boxAt(left: number, top: number): SpriteBox {
  return { left, top, width: 4, height: 4, pixels: 16 };
}

const SEGMENTED: SpriteSegmentation = {
  kind: 'SEGMENTED',
  boxes: [boxAt(2, 2), boxAt(20, 2), boxAt(40, 2)],
  specks: 0,
};

const ONE_GROUP: readonly SpriteDuplicateGroup[] = [
  { canonical: boxAt(2, 2), duplicates: [{ box: boxAt(20, 2), exact: true }] },
];

function show(overrides: Partial<Parameters<typeof DuplicateControls>[0]> = {}) {
  render(
    <DuplicateControls sprites={SEGMENTED} duplicates={[]} snapped={false} busy={false} {...overrides} />,
  );
}

describe('DuplicateControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('reports a clean sheet as good news rather than as a pass that found nothing', () => {
    show();

    expect(screen.getByText('No repeated sprites')).toBeInTheDocument();
    expect(screen.getByText(DUPLICATE_GUIDANCE.none)).toBeInTheDocument();
  });

  it('separates a sheet with nothing to compare from one with nothing alike', () => {
    // Both come back with an empty group list, and they call for completely different things: one
    // is a keying problem, the other is a sheet that is already clean.
    show({ sprites: { kind: 'SOLID' } });

    expect(screen.getByText('No sprites to compare')).toBeInTheDocument();
    expect(screen.getByText(DUPLICATE_GUIDANCE.unsegmented)).toBeInTheDocument();
  });

  it('counts the groups and the repeats separately', () => {
    show({
      duplicates: [
        {
          canonical: boxAt(2, 2),
          duplicates: [
            { box: boxAt(20, 2), exact: true },
            { box: boxAt(40, 2), exact: false },
          ],
        },
      ],
    });

    expect(screen.getByText('1 group — 2 repeats')).toBeInTheDocument();
    expect(screen.getByText('1 identical')).toBeInTheDocument();
  });

  it('lists each group with its size and where its first sprite sits', () => {
    // The count alone says a sheet has repeats and not which, and the preview draws every box alike.
    show({ duplicates: ONE_GROUP });

    expect(screen.getByText(/4 × 4 at 2, 2 · 2 sprites · all identical/)).toBeInTheDocument();
  });

  it('reports the fold from the result rather than from the dial', async () => {
    // The two part company for as long as a job is in flight, and this is the direction that
    // misleads: the dial is on, and the sheet on screen is what the position before it produced.
    show({ duplicates: ONE_GROUP });
    await userEvent.click(screen.getByRole('checkbox', { name: /snap duplicates/i }));

    expect(useQuantiseStore.getState().duplicateSnap).toBe(true);
    expect(screen.queryByText('Folded into one drawing')).not.toBeInTheDocument();
    expect(screen.getByText(DUPLICATE_GUIDANCE.found)).toBeInTheDocument();
  });

  it('says the fold has happened once the result says so', () => {
    show({ duplicates: ONE_GROUP, snapped: true });

    expect(screen.getByText('Folded into one drawing')).toBeInTheDocument();
    expect(screen.getByText(DUPLICATE_GUIDANCE.snapped)).toBeInTheDocument();
  });

  it('refuses the snap with a reason while there is nothing to fold', async () => {
    show();

    const snap = screen.getByRole('checkbox', { name: /snap duplicates/i });
    expect(snap).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/nothing was grouped at the tolerance in force/i)).toBeInTheDocument();

    await userEvent.click(snap);
    expect(useQuantiseStore.getState().duplicateSnap).toBe(false);
  });

  it('spells the tolerance floor as what it does rather than as off', () => {
    // Zero still groups the frames that match pixel for pixel, so calling it off would claim
    // something the pipeline does not do.
    show();

    expect(screen.getByRole('slider', { name: 'Duplicate tolerance' })).toHaveAttribute(
      'aria-valuetext',
      'identical only',
    );
  });

  it('moves the tolerance dial through the store, so an undo can reach it', () => {
    // `fireEvent.change` rather than a keypress: happy-dom does not implement a range input's own
    // arrow-key stepping, so a keyboard drive here would assert the environment rather than the
    // wiring. The real control's arrows are the browser's, and what this is about is that the
    // change reaches the store's recorded position rather than a field written past the history.
    show();

    fireEvent.change(screen.getByRole('slider', { name: 'Duplicate tolerance' }), {
      target: { value: '6' },
    });

    expect(useQuantiseStore.getState().duplicateTolerance).toBe(6);
    useQuantiseStore.getState().undo();
    expect(useQuantiseStore.getState().duplicateTolerance).toBe(0);
  });

  it('withdraws the figures while a newer result is on its way', () => {
    show({ duplicates: ONE_GROUP, busy: true });

    expect(screen.getByText('Comparing the sprites…')).toBeInTheDocument();
    expect(screen.queryByText(/4 × 4 at 2, 2/)).not.toBeInTheDocument();
  });
});
