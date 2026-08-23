import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KEY_OFFER_NOTICE } from '../../constants/keyOffer.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { KeyingControls } from './KeyingControls.tsx';

/**
 * The offer, which is the one thing on this panel that is about the sheet rather than the setting.
 *
 * The measurement behind it is pinned in `utils/borderKeyShare.test.ts`, and what can only be
 * checked here is what the panel does with it: that the offer appears only where there is something
 * to offer, that pressing it switches the pass on rather than doing anything to the artwork itself,
 * and that it stands aside once keying is running.
 */

function show(overrides: Partial<Parameters<typeof KeyingControls>[0]> = {}) {
  render(<KeyingControls keying={null} keyedShare={null} busy={false} offered={false} {...overrides} />);
}

describe('KeyingControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('offers to key a sheet that arrived with its field still on it', () => {
    show({ offered: true });

    expect(screen.getByRole('button', { name: 'Key the background' })).toBeInTheDocument();
    expect(screen.getByText(KEY_OFFER_NOTICE)).toBeInTheDocument();
  });

  it('says nothing about a sheet it has no reason to', () => {
    show();

    expect(screen.queryByRole('button', { name: 'Key the background' })).not.toBeInTheDocument();
  });

  it('switches the pass on when the offer is taken, and changes nothing else', async () => {
    // The press is the reader's, which is the whole argument for an offer rather than a default:
    // nothing on this tab alters artwork unasked, and this asks.
    show({ offered: true });
    const tolerance = useQuantiseStore.getState().keyTolerance;
    expect(useQuantiseStore.getState().keyingEnabled).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Key the background' }));

    expect(useQuantiseStore.getState().keyingEnabled).toBe(true);
    // At the tolerance the control already held: the press runs the pass the reader was shown a
    // measurement of, and moving a dial they did not touch would be a second, unasked change.
    expect(useQuantiseStore.getState().keyTolerance).toBe(tolerance);
  });

  it('stands aside once the pass is running', () => {
    // An offer to do what is being done is noise, and the tolerance row below it is the control that
    // matters at that point.
    show({ keying: { color: { r: 255, g: 0, b: 255, a: 255 }, tolerance: 24 }, offered: true });

    expect(screen.queryByRole('button', { name: 'Key the background' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Key colour tolerance')).toBeInTheDocument();
  });

  it('offers the edge hardening with the key off, which is the state it exists for', async () => {
    // The control this panel holds that is not about the key colour at all. It reads the sheet's own
    // coverage, so the reader wants it precisely when keying is off — a sheet that arrived carrying
    // its own alpha — and hiding it behind the toggle would put it out of reach in the one state it
    // exists for.
    show();

    expect(screen.getByLabelText('Silhouette coverage threshold')).toBeInTheDocument();
    expect(useQuantiseStore.getState().silhouetteThreshold).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: '50%' }));

    expect(useQuantiseStore.getState().silhouetteThreshold).toBe(50);
  });

  it('offers it with the key on as well, which is the half a `!isKeying` guard would pass', () => {
    // The inverse of the case above, and the one the sibling test cannot catch: wrapping the row in
    // the negation of the toggle leaves that test green and takes the control away here.
    show({ keying: { color: { r: 255, g: 0, b: 255, a: 255 }, tolerance: 24 } });

    expect(screen.getByLabelText('Silhouette coverage threshold')).toBeInTheDocument();
  });
});
