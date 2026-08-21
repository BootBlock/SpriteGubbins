import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUIStore } from '../stores/useUIStore.ts';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';
import { useImageDownload } from './useImageDownload.ts';

/**
 * What actually leaves the app, read back as a file.
 *
 * The encoder has its own tests; this one covers the half only the hook can reach — that the bytes
 * the encoder produced are what the anchor is handed, that the name and the confirmation describe
 * the file that was written, and that a sheet past a palette still downloads rather than failing.
 */

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** The blob handed to `createObjectURL`, which is the file the browser would have saved. */
let saved: Blob | null = null;
let downloadName: string | null = null;

beforeEach(() => {
  saved = null;
  downloadName = null;
  useUIStore.setState({ toastMessage: null });
  // happy-dom provides neither, and both are the point of the hook rather than incidental to it.
  URL.createObjectURL = vi.fn((blob: Blob) => {
    saved = blob;
    return 'blob:sheet';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadName = this.download;
  });
});

async function download(name: string, image: ImageData, scale: number): Promise<void> {
  const { result } = renderHook(() => useImageDownload());
  act(() => {
    result.current(name, image, scale);
  });
  await waitFor(() => {
    expect(saved).not.toBeNull();
  });
}

describe('useImageDownload', () => {
  it('saves a real indexed PNG under a name derived from the source', async () => {
    const image = imageFrom(6, 4, (x, y) => ((x + y) % 2 === 0 ? CLEAR : { r: 30, g: 90, b: 60, a: 255 }));
    await download('armour.webp', image, 1);

    expect(downloadName).toBe('armour-quantised.png');
    const decoded = await decodePng(new Uint8Array(await (saved as unknown as Blob).arrayBuffer()));
    expect(decoded.colorType).toBe(3);
    expect(decoded.palette).toHaveLength(2);
    expect([...decoded.pixels]).toEqual([...image.data]);
  });

  it('says how many colours the palette holds', async () => {
    await download(
      'armour.png',
      imageFrom(4, 4, (x) => ({ r: x * 60, g: 0, b: 0, a: 255 })),
      1,
    );
    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded armour-quantised.png — indexed, 4-colour palette',
      );
    });
  });

  it('carries the magnification in the name', async () => {
    await download(
      'armour.png',
      imageFrom(2, 2, () => CLEAR),
      4,
    );
    expect(downloadName).toBe('armour-quantised@4x.png');
  });

  it('still saves a sheet with more colours than a palette can name, and says so', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 2, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 0,
      a: 255,
    }));
    await download('painted.png', image, 1);

    const decoded = await decodePng(new Uint8Array(await (saved as unknown as Blob).arrayBuffer()));
    expect(decoded.colorType).toBe(6);
    expect([...decoded.pixels]).toEqual([...image.data]);
    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded painted-quantised.png — more colours than the 256 a palette can name, so it is written truecolour',
      );
    });
  });
});
