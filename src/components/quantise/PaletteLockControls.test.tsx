import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PALETTE_LOCK_GUIDANCE } from '../../constants/paletteLock.ts';
import { DEFAULT_PALETTE_SNAP } from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { Rgba } from '../../types/quantiser.ts';
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

/**
 * The colours a settled result was read to hold, in the order the transform reports them.
 *
 * The reading itself is `paletteEntriesFrom` and is tested there. What this panel is answerable
 * for is holding exactly the list it was handed, in the order it arrived.
 */
const RESULT: readonly Rgba[] = [
  { r: 40, g: 160, b: 60, a: 255 },
  { r: 200, g: 100, b: 50, a: 255 },
];

type Props = Partial<Parameters<typeof PaletteLockControls>[0]>;

function panel(overrides: Props = {}) {
  return (
    <PaletteLockControls
      resultPalette={RESULT}
      sheetName="armour.png"
      studioSetting="RESTRAINED_64_COLOR"
      superseded={null}
      busy={false}
      {...overrides}
    />
  );
}

/** The panel, and the handle to hand it a new result without mounting a second copy of it. */
function show(overrides: Props = {}) {
  return render(panel(overrides));
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
    expect(lock?.entries).toEqual(RESULT);
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
    show({ resultPalette: null });

    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeDisabled();
  });

  it('refuses to lock while a newer result is on its way', () => {
    // The preview keeps the previous sheet up while the next is computed, so the image beside this
    // button is not the one the settings describe — holding its colours would hold the sheet from
    // before the dial moved.
    show({ busy: true });

    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeDisabled();
  });

  it('holds the button shut on a result with no colours in it, and says why', () => {
    // The state this panel used to answer with silence: the button was live, the press held
    // nothing, and no badge, notice or announcement changed. A sheet the keying took whole is a
    // likely first result of a series, so it is a state a reader meets this control in.
    show({ resultPalette: [] });

    expect(screen.getByRole('button', { name: 'Lock this palette' })).toBeDisabled();
    expect(screen.getByText(PALETTE_LOCK_GUIDANCE.noColours)).toBeInTheDocument();
  });

  it('says nothing about an empty sheet while there is no result at all', () => {
    // Waiting for a sheet is not the same finding as a sheet with nothing in it, and a notice
    // naming the keying before anything had been keyed would be the panel inventing a diagnosis.
    show({ resultPalette: null });

    expect(screen.queryByText(PALETTE_LOCK_GUIDANCE.noColours)).toBeNull();
  });

  it('leaves a held palette alone when the sheet beside it empties', async () => {
    // Worse than a silent press: a lock dropped because a *later* sheet came back blank would throw
    // away the colours the rest of the series is being held to.
    const { rerender } = show();
    await userEvent.click(screen.getByRole('button', { name: 'Lock this palette' }));

    rerender(panel({ resultPalette: [] }));

    expect(useQuantiseStore.getState().lockedPalette?.entries).toEqual(RESULT);
    // The badge still names what is held, the re-lock is shut, and the reason is stated — a held
    // palette does not suppress the notice, which is the reader most likely to want it.
    expect(screen.getByText(/2 entries held from armour.png/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-lock from this sheet' })).toBeDisabled();
    expect(screen.getByText(PALETTE_LOCK_GUIDANCE.noColours)).toBeInTheDocument();
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
