import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSheetWriteStore } from '../stores/useSheetWriteStore.ts';
import { useUIStore } from '../stores/useUIStore.ts';
import { decodePng } from '../test/decodePng.ts';
import { FakeSheetWriteWorker } from '../test/fakeSheetWriteWorker.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import type { SheetFormat } from '../types/sheetFormat.ts';
import { encodeAseprite } from '../utils/encodeAseprite.ts';
import { encodePng } from '../utils/encodePng.ts';
import { scaleBoxes } from '../utils/sheetLayout.ts';
import { upscaleNearest } from '../utils/upscaleNearest.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';
import { spriteSegments } from '../utils/spriteSegments.ts';
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
 * image it was posted, so what these tests decode is a genuine file. What a worker adds — a thread,
 * and the seven ways a request for one can settle — is `sheetWriteSession`'s to test, and it has its own
 * suite over the same fake.
 */

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Every toast raised during a test, in order — a single final reading hides an intermediate one. */
let toasts: string[] = [];
let unsubscribe: (() => void) | null = null;

/** The blob handed to `createObjectURL`, which is the file the browser would have saved. */
let saved: Blob | null = null;
let downloadName: string | null = null;
beforeEach(() => {
  saved = null;
  downloadName = null;
  useUIStore.setState({ toastMessage: null });
  toasts = [];
  unsubscribe = useUIStore.subscribe((state) => {
    if (state.toastMessage !== null) toasts.push(state.toastMessage);
  });
  useSheetWriteStore.setState({ writing: false });
  FakeSheetWriteWorker.reset();
  // The thread is stubbed and the encoder is not: what these tests decode is a genuine file.
  FakeSheetWriteWorker.respond = ({ image, scale, format, boxes }) => {
    const sheet = scale === 1 ? image : upscaleNearest(image, scale);
    const writing = format === 'PNG' ? encodePng(sheet) : encodeAseprite(sheet, scaleBoxes(boxes, scale));
    return writing.then((file) => ({ kind: 'written', file }) as const);
  };
  vi.stubGlobal('Worker', FakeSheetWriteWorker);
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
  unsubscribe?.();
  unsubscribe = null;
  vi.unstubAllGlobals();
});

/**
 * The three fields a manifest is built from, empty — the state of a sheet nothing has been read off
 * and no studio configuration stands behind. Every test here is about the *file*, so this is the
 * default and the manifest suites are where those fields carry anything.
 */
const NOTHING_READ = { duplicates: [], names: [], sheet: null } as const;

/** Runs the download and hands back the file it produced, once the encode has settled. */
async function download(
  name: string,
  image: ImageData,
  scale: number,
  format: SheetFormat = 'PNG',
  boxes: readonly SpriteBox[] = [],
): Promise<Blob> {
  const { result } = renderHook(() => useImageDownload());
  act(() => {
    result.current.save({ sourceName: name, image, scale, format, boxes, ...NOTHING_READ });
  });
  await waitFor(() => {
    expect(saved).not.toBeNull();
  });
  const blob = saved;
  if (blob === null) throw new Error('nothing was handed to createObjectURL');
  return blob;
}

/** The segmentation the tab itself would arrive at, which is what a press hands the writer. */
function boxesIn(image: ImageData): readonly SpriteBox[] {
  const found = spriteSegments(image, 0);
  return found.kind === 'SEGMENTED' ? found.boxes : [];
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
    FakeSheetWriteWorker.respond = () =>
      Promise.resolve({ kind: 'failed', reason: 'Array buffer allocation failed' } as const);
    const { result } = renderHook(() => useImageDownload());
    act(() => {
      result.current.save({
        sourceName: 'armour.png',
        image: imageFrom(2, 2, () => CLEAR),
        scale: 1,
        format: 'PNG',
        boxes: [],
        ...NOTHING_READ,
      });
    });

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Could not write armour-quantised.png: Array buffer allocation failed',
      );
    });
    expect(saved).toBeNull();
  });

  it('names an Aseprite document by the sprites it was cut into', async () => {
    // Two sprites in one row of a keyed sheet — so the file is two frames under one tag, and the
    // confirmation has to count both and say "tag" rather than "tags".
    const image = imageFrom(9, 4, (x, y) =>
      (x < 2 || (x > 4 && x < 7)) && y > 0 ? { r: 30, g: 90, b: 60, a: 255 } : CLEAR,
    );
    await download('armour.png', image, 1, 'ASEPRITE', boxesIn(image));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded armour-quantised.aseprite — indexed, 2-entry palette, 2 frames in 1 tag',
      );
    });
  });

  it('says a single sprite is one frame in one tag, not the whole sheet', async () => {
    // The wording that was wrong: one sprite also comes to one frame, but that frame is a *crop* of
    // it and the rest of the sheet is gone — so the sentence for an uncut sheet would be a lie. The
    // tag count is what tells the two apart, and this sheet has one.
    const image = imageFrom(6, 4, (x, y) =>
      x > 1 && x < 4 && y > 0 ? { r: 8, g: 9, b: 10, a: 255 } : CLEAR,
    );
    await download('armour.png', image, 1, 'ASEPRITE', boxesIn(image));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded armour-quantised.aseprite — indexed, 2-entry palette, 1 frame in 1 tag',
      );
    });
  });

  it('says a sheet with nothing separable on it arrived whole', async () => {
    const image = imageFrom(4, 4, (x) => ({ r: x * 20, g: 0, b: 0, a: 255 }));
    await download('armour.png', image, 1, 'ASEPRITE', []);

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded armour-quantised.aseprite — indexed, 4-entry palette, the whole sheet in one frame',
      );
    });
  });

  it('names the RGB fallback and carries the magnification in an Aseprite name too', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 2, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 3,
      a: 255,
    }));
    await download('painted.png', image, 2, 'ASEPRITE', []);

    expect(downloadName).toBe('painted-quantised@2x.aseprite');
    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        'Downloaded painted-quantised@2x.aseprite — more colours than a palette can hold, so it is written in RGB colour mode, the whole sheet in one frame',
      );
    });
  });

  it('refuses a second press while the first is still being written', async () => {
    const { result } = renderHook(() => useImageDownload());
    const image = imageFrom(4, 4, () => CLEAR);
    act(() => {
      result.current.save({
        sourceName: 'armour.png',
        image,
        scale: 1,
        format: 'PNG',
        boxes: [],
        ...NOTHING_READ,
      });
    });
    expect(result.current.saving).toBe(true);
    act(() => {
      result.current.save({
        sourceName: 'armour.png',
        image,
        scale: 2,
        format: 'PNG',
        boxes: [],
        ...NOTHING_READ,
      });
    });

    await waitFor(() => {
      expect(result.current.saving).toBe(false);
    });
    // The second press asked for `@2x` and would have overwritten the name had it been taken.
    expect(downloadName).toBe('armour-quantised.png');
    // And it was refused *quietly*. `writeSheetOffThread` refuses a concurrent write too, so without
    // the hook's own guard the reader would be told a file could not be written — a failure they did
    // not cause, for a press that was never going to do anything. Every toast is collected rather
    // than the last one read, because the success that follows would hide it.
    expect(toasts).toEqual(['Downloaded armour-quantised.png — indexed, 1-entry palette']);
  });
});
