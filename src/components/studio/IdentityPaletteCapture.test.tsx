import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { imageFrom } from '../../test/images.ts';
import { IdentityPaletteCapture } from './IdentityPaletteCapture.tsx';

/**
 * The one thing about this control that types cannot state: **when** it reads the lock.
 *
 * Decoding is asynchronous, and the lock's own text field sits directly above the control — so the
 * gap between choosing a file and the palette landing is exactly the gap a user types into. A
 * version that captured the lock at render time passed every other test in the suite and silently
 * discarded that typing.
 */

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const CHARCOAL = { r: 30, g: 30, b: 36, a: 255 };

/** A keyed sheet: magenta field, one charcoal subject region. */
const SHEET = imageFrom(8, 4, (x) => (x < 5 ? MAGENTA : CHARCOAL));

/** Resolves the pending decode, handing the component {@link SHEET}. */
let releaseDecode: () => void;

beforeEach(() => {
  // Deliberately *not* the magenta this sheet is keyed on — the second test corrects it mid-decode,
  // and starting from the right answer would leave that test unable to fail.
  useOutputStore.setState({
    output: { ...DEFAULT_OUTPUT_CONFIG, identityLock: '', backgroundKey: 'TRANSPARENT' },
  });

  // The impure boundary, stubbed so the decode can be held open mid-flight. `createImageBitmap`
  // and a 2D canvas are the two things happy-dom does not provide, and they are precisely what
  // stands between choosing a file and `handleImport` running.
  vi.stubGlobal(
    'createImageBitmap',
    () =>
      new Promise((resolve) => {
        releaseDecode = () => {
          resolve({ width: SHEET.width, height: SHEET.height, close: () => undefined });
        };
      }),
  );
  // Typed as a Partial so the two methods are genuinely checked against the real interface, then
  // widened once — happy-dom provides no 2D context, and these are the only members the decode uses.
  const context: Partial<CanvasRenderingContext2D> = {
    drawImage: () => undefined,
    getImageData: () => SHEET,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Hands the control a file and returns once the decode is in flight but not yet finished. */
async function chooseSheet() {
  const input = screen.getByLabelText('Read the palette from an accepted sheet');
  const file = new File(['sheet'], 'accepted-sheet.png', { type: 'image/png' });
  // A `FileList`, not an array: the picker reads `files.item(0)`, which an array has no answer for.
  const files = Object.assign([file], { item: (index: number) => (index === 0 ? file : null) });
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
  await waitFor(() => {
    expect(releaseDecode).toBeTypeOf('function');
  });
}

describe('IdentityPaletteCapture', () => {
  it('keeps what the user typed while the sheet was still decoding', async () => {
    // This one is about the text, not the key, so the key is correct from the start.
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, backgroundKey: 'MAGENTA_FF00FF' },
    });
    render(<IdentityPaletteCapture />);
    await chooseSheet();

    // The user carries on writing the digest rather than watching the decode.
    act(() => {
      useOutputStore.getState().setOutputField('identityLock', 'Cyan visor across upper face');
    });

    await act(async () => {
      releaseDecode();
    });

    await waitFor(() => {
      expect(useOutputStore.getState().output.identityLock).toBe(
        'Cyan visor across upper face; Palette: #1E1E24',
      );
    });
  });

  it('keys against the background chosen when the sheet is read, not when it was picked', async () => {
    render(<IdentityPaletteCapture />);
    await chooseSheet();

    // Corrected mid-decode: this sheet is keyed on magenta, not the transparent the field held.
    act(() => {
      useOutputStore.getState().setOutputField('backgroundKey', 'MAGENTA_FF00FF');
    });

    await act(async () => {
      releaseDecode();
    });

    // Magenta excluded, so charcoal stands alone. Had the transparent key captured at pick time
    // won, magenta would have been kept — and it is the larger region, so it would lead.
    await waitFor(() => {
      expect(useOutputStore.getState().output.identityLock).toBe('Palette: #1E1E24');
    });
  });
});
