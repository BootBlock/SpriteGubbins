import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUIStore } from '../stores/useUIStore.ts';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { encodePng } from '../utils/encodePng.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';
import type { PngReply } from '../workers/pngWorker.ts';
import { useImageDownload } from './useImageDownload.ts';

/**
 * What actually leaves the app, read back as a file.
 *
 * The encoder has its own tests; this covers the half only the hook can reach — that the bytes the
 * encoder produced are what the anchor is handed, that the name and the confirmation describe the
 * file that was written, that a sheet past a palette still downloads, and that a failure on the
 * thread is reported rather than swallowed.
 *
 * The thread is stubbed and the **encoder is not**: the fake runs the real `encodePng` over the
 * image it was posted, so what these tests decode is a genuine file. What a worker adds — a thread —
 * is `pngSession`'s to test, and it has its own suite.
 */

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** The blob handed to `createObjectURL`, which is the file the browser would have saved. */
let saved: Blob | null = null;
let downloadName: string | null = null;
/** Set by a test that wants the thread to fail instead of answering. */
let refuse: string | null = null;

/** The encoder's thread, without the thread. */
class FakePngWorker {
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();
  terminated = false;

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  terminate(): void {
    this.terminated = true;
  }

  postMessage(image: ImageData): void {
    const answer = (reply: PngReply): void => {
      for (const listener of this.listeners.get('message') ?? []) listener({ data: reply });
    };
    if (refuse !== null) {
      answer({ kind: 'failed', reason: refuse });
      return;
    }
    void encodePng(image).then((file) => {
      answer({ kind: 'encoded', file });
    });
  }
}

beforeEach(() => {
  saved = null;
  downloadName = null;
  refuse = null;
  useUIStore.setState({ toastMessage: null });
  vi.stubGlobal('Worker', FakePngWorker);
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

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Runs the download and hands back the file it produced, once the encode has settled. */
async function download(name: string, image: ImageData, scale: number): Promise<Blob> {
  const { result } = renderHook(() => useImageDownload());
  act(() => {
    result.current.save(name, image, scale);
  });
  await waitFor(() => {
    expect(saved).not.toBeNull();
  });
  const blob = saved;
  if (blob === null) throw new Error('nothing was handed to createObjectURL');
  return blob;
}

describe('useImageDownload', () => {
  it('saves a real indexed PNG under a name derived from the source', async () => {
    const image = imageFrom(6, 4, (x, y) => ((x + y) % 2 === 0 ? CLEAR : { r: 30, g: 90, b: 60, a: 255 }));
    const file = await download('armour.webp', image, 1);

    expect(downloadName).toBe('armour-quantised.png');
    const decoded = await decodePng(new Uint8Array(await file.arrayBuffer()));
    expect(decoded.colorType).toBe(3);
    expect(decoded.palette).toHaveLength(2);
    expect([...decoded.pixels]).toEqual([...image.data]);
  });

  it('says how many entries the palette holds, transparency among them', async () => {
    // Three drawn colours and a transparent field: the caption beside the preview counts three, and
    // the file has to carry four. The wording is what keeps those two numbers from reading as one.
    const shades = [CLEAR, { r: 10, g: 0, b: 0, a: 255 }, { r: 20, g: 0, b: 0, a: 255 }];
    await download(
      'armour.png',
      imageFrom(4, 1, (x) => shades[x % 3] ?? CLEAR),
      1,
    );
    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded armour-quantised.png — indexed, 3-entry palette',
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

  it('still saves a sheet with more colours than a palette can hold, and says so', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 2, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 0,
      a: 255,
    }));
    const file = await download('painted.png', image, 1);

    const decoded = await decodePng(new Uint8Array(await file.arrayBuffer()));
    expect(decoded.colorType).toBe(6);
    expect([...decoded.pixels]).toEqual([...image.data]);
    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded painted-quantised.png — more colours than a palette can hold, so it is written truecolour',
      );
    });
  });

  it('names the reason when the encode fails, rather than saving nothing quietly', async () => {
    refuse = 'Array buffer allocation failed';
    const { result } = renderHook(() => useImageDownload());
    act(() => {
      result.current.save(
        'armour.png',
        imageFrom(2, 2, () => CLEAR),
        1,
      );
    });

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Could not write armour-quantised.png: Array buffer allocation failed',
      );
    });
    expect(saved).toBeNull();
  });

  it('refuses a second press while the first is still being written', async () => {
    const { result } = renderHook(() => useImageDownload());
    const image = imageFrom(4, 4, () => CLEAR);
    act(() => {
      result.current.save('armour.png', image, 1);
    });
    expect(result.current.saving).toBe(true);
    act(() => {
      result.current.save('armour.png', image, 2);
    });

    await waitFor(() => {
      expect(result.current.saving).toBe(false);
    });
    // The second press asked for `@2x` and would have overwritten the name had it been taken.
    expect(downloadName).toBe('armour-quantised.png');
  });
});
