import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MAX_IMAGE_PIXELS } from '../constants/quantiser.ts';
import { useUIStore } from '../stores/useUIStore.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { useImageFile } from './useImageFile.ts';

/**
 * What the reader is told when a file does not become pixels.
 *
 * The decode is four steps and three of them can fail, so what this covers is that each failure
 * arrives as a sentence rather than as nothing: the browser refusing the format, the sheet being
 * past the app's own ceiling, and the canvas refusing to hand its pixels back. That last one is the
 * one worth a suite — it throws rather than returning, so before the `catch` it rejected the
 * promise the hook never awaited, and a reader with a large sheet saw the drop zone accept their
 * file and then do nothing at all.
 *
 * happy-dom implements neither `createImageBitmap` nor a 2D canvas, so both are stubbed. The stub is
 * the browser's part of the contract, never the hook's.
 */

/** A decoded bitmap of the given size, and the spy that says whether the hook released it. */
function fakeBitmap(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width, height, close }));
  return close;
}

/**
 * A 2D context that reads back however the test says.
 *
 * Typed as a Partial so the two methods are genuinely checked against the real interface, then
 * widened once — happy-dom provides no 2D context, and these are the only members the decode uses.
 */
function stubContext(getImageData: () => ImageData) {
  const context: Partial<CanvasRenderingContext2D> = {
    drawImage: () => undefined,
    getImageData,
  };
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as CanvasRenderingContext2D);
}

/** What an engine with no room for a 67 MB read does: it throws rather than returning short. */
function outOfMemory(): never {
  throw new RangeError('Out of memory');
}

function accept(file: File) {
  const onImport = vi.fn<(imported: ImportedImage) => void>();
  const { result } = renderHook(() => useImageFile(onImport));
  act(() => {
    result.current(file);
  });
  return onImport;
}

const SHEET = new File([], 'armour.png', { type: 'image/png' });

beforeEach(() => {
  useUIStore.setState({ toastMessage: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useImageFile', () => {
  it('says so when the canvas will not hand its pixels back', async () => {
    const close = fakeBitmap(1254, 1254);
    stubContext(outOfMemory);

    const onImport = accept(SHEET);

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toMatch(/armour\.png/);
    });
    expect(useUIStore.getState().toastMessage).toMatch(/1254 × 1254/);
    expect(onImport).not.toHaveBeenCalled();
    // The bitmap is still released — the `finally` the new branch sits beside, not instead of.
    expect(close).toHaveBeenCalledOnce();
  });

  it('imports the sheet the canvas did read', async () => {
    fakeBitmap(2, 1);
    const image = new ImageData(2, 1);
    stubContext(() => image);

    const onImport = accept(SHEET);

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith({ name: 'armour.png', image });
    });
    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('says so when the browser will not read the file as an image', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.reject(new Error('unsupported'))),
    );

    const onImport = accept(new File([], 'notes.pdf', { type: 'application/pdf' }));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Could not read notes.pdf as an image');
    });
    expect(onImport).not.toHaveBeenCalled();
  });

  it('declines a sheet past the pixel ceiling without touching a canvas', async () => {
    const close = fakeBitmap(MAX_IMAGE_PIXELS, 2);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');

    const onImport = accept(SHEET);

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toMatch(/past this app’s limit/);
    });
    expect(getContext).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does nothing at all when a picker is dismissed', () => {
    const onImport = vi.fn<(imported: ImportedImage) => void>();
    const { result } = renderHook(() => useImageFile(onImport));

    act(() => {
      result.current(null);
    });

    expect(useUIStore.getState().toastMessage).toBeNull();
    expect(onImport).not.toHaveBeenCalled();
  });
});
