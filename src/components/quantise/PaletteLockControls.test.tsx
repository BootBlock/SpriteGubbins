import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PALETTE_SNAP } from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { imageFrom } from '../../test/images.ts';
import { PaletteLockControls } from './PaletteLockControls.tsx';

/**
 * Taking a palette off a result, and what the panel says while one is held.
 *
 * The pipeline's half of this is pinned in `utils/lockedPalette.test.ts` and `colorReduction`'s.
 * What can only be checked here is the panel's agreement with the store: that pressing the button
 * holds the colours of the sheet beside it rather than of some earlier one, that a re-lock records
 * the studio setting in force rather than the lock it replaces, and that the notice about a studio
 * setting the lock has overtaken appears exactly when the plan says it should.
 */

/** Twelve of one colour and four of another, so the held order is a fact and not a coincidence. */
const RESULT = imageFrom(4, 4, (_x, y) =>
  y === 0 ? { r: 200, g: 100, b: 50, a: 255 } : { r: 40, g: 160, b: 60, a: 255 },
);

function show(overrides: Partial<Parameters<typeof PaletteLockControls>[0]> = {}) {
  render(
    <PaletteLockControls
      resultImage={RESULT}
      sheetName="armour.png"
      studioSetting="RESTRAINED_64_COLOR"
      superseded={null}
      busy={false}
      {...overrides}
    />,
  );
}

describe('PaletteLockControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('holds nothing until it is asked to, and says so', () => {
    show();

    expect(screen.getByText('No palette held')).toBeInTheDocument();
    expect(useQuantiseStore.getState().lockedPalette).toBeNull();
  });

  it('locks the colours of the sheet beside it, stamped with the studio setting in force', async () => {
    show();

    await userEvent.click(screen.getByRole('button', { name: 'Lock this palette' }));

    const lock = useQuantiseStore.getState().lockedPalette;
    // Most-used first: the twelve-pixel green leads the four-pixel orange.
    expect(lock?.entries).toEqual([
      { r: 40, g: 160, b: 60, a: 255 },
      { r: 200, g: 100, b: 50, a: 255 },
    ]);
    expect(lock?.sheetName).toBe('armour.png');
    expect(lock?.setting).toBe('RESTRAINED_64_COLOR');
  });

  it('offers the snap distance only once a palette is held', async () => {
    show();

    expect(screen.queryByLabelText('Snap distance')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Lock this palette' }));

    expect(screen.getByLabelText('Snap distance')).toHaveValue(String(DEFAULT_PALETTE_SNAP));
  });

  it('records the studio setting a re-lock is taken under, not the one it replaces', async () => {
    // The failure this is here for: the panel is looking at a plan whose `setting` is already the
    // lock's, so a re-lock reading that would stamp the new palette "Locked palette" — and the
    // notice below could then never fire again, whatever the studio did.
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Lock this palette' }));

    await userEvent.click(screen.getByRole('button', { name: 'Re-lock from this sheet' }));

    expect(useQuantiseStore.getState().lockedPalette?.setting).toBe('RESTRAINED_64_COLOR');
  });

  it('lets the palette go, and offers to take one again', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Lock this palette' }));

    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(useQuantiseStore.getState().lockedPalette).toBeNull();
    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeInTheDocument();
  });

  it('refuses to lock while there is no result to take one from', () => {
    show({ resultImage: null });

    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeDisabled();
  });

  it('refuses to lock while a newer result is on its way', () => {
    // The preview keeps the previous sheet up while the next is computed, so the image beside this
    // button is not the one the settings describe — holding its colours would hold the sheet from
    // before the dial moved.
    show({ busy: true });

    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeDisabled();
  });

  it('names the studio setting the held palette has overtaken, and only then', () => {
    show({ superseded: 'GAME_BOY_DMG' });

    expect(screen.getByText(/is now GAME_BOY_DMG/)).toBeInTheDocument();
  });

  it('says nothing about a superseded setting while the plan reports none', () => {
    show();

    expect(screen.queryByText(/is not the one this palette was locked under/)).toBeNull();
  });
});
