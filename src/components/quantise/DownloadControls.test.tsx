import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSheetWriteStore } from '../../stores/useSheetWriteStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { FakeSheetWriteWorker } from '../../test/fakeSheetWriteWorker.ts';
import type { SpriteSegmentation } from '../../types/quantiser.ts';
import type { SheetFormat } from '../../types/sheetFormat.ts';
import type { SpriteCellChoice } from '../../types/spriteCell.ts';
import { createImage } from '../../utils/imageData.ts';
import { encodePng } from '../../utils/encodePng.ts';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../../constants/spriteCell.ts';
import { DownloadControls } from './DownloadControls.tsx';

/**
 * What the press looks like while it is happening, which is the half no unit of the encoder covers.
 *
 * A write has a duration now, and the two things that follow from that are here: the button says so
 * and refuses a second press, and a keyboard reader gets their place back when it returns. The
 * second is the one worth a test — a button that disables under its own press hands focus to the
 * body, and nothing in the platform brings it back.
 */

/** Held open until a test releases it, so the writing state can be observed rather than raced. */
let release: (() => void) | null = null;

beforeEach(() => {
  useUIStore.setState({ toastMessage: null });
  useSheetWriteStore.setState({ writing: false });
  FakeSheetWriteWorker.reset();
  FakeSheetWriteWorker.respond = ({ image }) =>
    new Promise((resolve) => {
      release = () => {
        void encodePng(image).then((file) => {
          resolve({ kind: 'written', file });
        });
      };
    });
  vi.stubGlobal('Worker', FakeSheetWriteWorker);
  URL.createObjectURL = vi.fn(() => 'blob:sheet');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  release = null;
  vi.unstubAllGlobals();
});

function draw(
  resultImage: ImageData | null = createImage(4, 4),
  downloadFormat: SheetFormat = 'PNG',
  sprites: SpriteSegmentation | null = null,
  cellChoice: SpriteCellChoice = DEFAULT_SPRITE_CELL_CHOICE,
) {
  render(
    <DownloadControls
      downloadScale={1}
      onDownloadScaleChange={() => undefined}
      downloadFormat={downloadFormat}
      onDownloadFormatChange={() => undefined}
      sourceName="armour.png"
      resultImage={resultImage}
      duplicates={[]}
      sprites={sprites}
      cellChoice={cellChoice}
      onCellChoiceChange={() => undefined}
      target={null}
    />,
  );
}

const downloadButton = () => screen.getByRole('button', { name: /download png|download aseprite|writing/i });

async function finish(): Promise<void> {
  await act(async () => {
    release?.();
    await Promise.resolve();
  });
  await waitFor(() => {
    expect(useSheetWriteStore.getState().writing).toBe(false);
  });
}

describe('DownloadControls', () => {
  it('says it is writing and refuses another press until the file is done', async () => {
    draw();
    await userEvent.click(downloadButton());

    expect(downloadButton()).toHaveTextContent('Writing…');
    expect(downloadButton()).toBeDisabled();

    await finish();
    expect(downloadButton()).toHaveTextContent('Download PNG');
    expect(downloadButton()).toBeEnabled();
  });

  it('gives the keyboard its place back when the button returns', async () => {
    draw();
    downloadButton().focus();
    await userEvent.keyboard('{Enter}');

    // The browser moves focus to the body when a control disables under it — confirmed in Edge,
    // where the button is what the reader loses. happy-dom does not model that, so it is spelled out
    // here: what is under test is the *return*, not the platform's half of it.
    act(() => {
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
    });
    expect(downloadButton()).not.toHaveFocus();
    await finish();
    expect(downloadButton()).toHaveFocus();
  });

  it('leaves focus alone for a press that never had it', async () => {
    draw();
    // A pointer press on a platform that does not focus the button it activates. The body is where
    // that leaves the reader, and it is also where every other route leaves them — so restoring on
    // the body alone would pull people back to a control they never used.
    const button = downloadButton();
    act(() => {
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
      button.click();
    });

    await finish();
    expect(downloadButton()).not.toHaveFocus();
  });

  it('leaves focus where a reader moved it during the write', async () => {
    draw();
    downloadButton().focus();
    await userEvent.keyboard('{Enter}');
    const elsewhere = screen.getByRole('button', { name: '2×' });
    act(() => {
      elsewhere?.focus();
    });

    await finish();
    expect(elsewhere).toHaveFocus();
  });

  it('names the format it would write, and sends the sprites it would cut it into', async () => {
    const sprites: SpriteSegmentation = {
      kind: 'SEGMENTED',
      boxes: [{ left: 0, top: 0, width: 2, height: 2, pixels: 4 }],
      specks: 0,
    };
    draw(createImage(4, 4), 'ASEPRITE', sprites);
    expect(downloadButton()).toHaveTextContent('Download Aseprite');

    await userEvent.click(downloadButton());
    // The boxes reach the writer, at 1:1 — without them the document would be one frame of the
    // whole sheet, which is a working file that has quietly lost what the tab found on it.
    expect(FakeSheetWriteWorker.started[0]?.posted[0]).toMatchObject({
      format: 'ASEPRITE',
      boxes: sprites.boxes,
    });
    await finish();
  });

  it('sends no boxes for a sheet nothing was separated on', async () => {
    draw(createImage(4, 4), 'ASEPRITE', { kind: 'SOLID' });
    await userEvent.click(downloadButton());

    expect(FakeSheetWriteWorker.started[0]?.posted[0]?.boxes).toEqual([]);
    await finish();
  });

  it('offers no download at all until a grid is settled', () => {
    draw(null);
    expect(downloadButton()).toBeDisabled();
    expect(downloadButton()).toHaveTextContent('Download PNG');
  });
});

describe('DownloadControls, cutting into a cell', () => {
  /** A sheet that came apart into one sprite, which is enough for a cut to be about something. */
  const SEGMENTED: SpriteSegmentation = {
    kind: 'SEGMENTED',
    boxes: [{ left: 0, top: 0, width: 2, height: 2, pixels: 4 }],
    specks: 0,
  };

  it('offers the cut only under the formats that describe sprites', () => {
    // A control that changed nothing would be a lie on screen: a PNG and an Aseprite document read
    // no cell, so neither offers one.
    draw(createImage(4, 4), 'PNG', SEGMENTED);
    expect(screen.queryByRole('group', { name: 'Sprite cut' })).toBeNull();
  });

  it('offers it under the sprite pack', () => {
    draw(createImage(4, 4), 'SPRITE_PACK', SEGMENTED);

    expect(screen.getByRole('group', { name: 'Sprite cut' })).toBeInTheDocument();
  });

  it('offers it under the manifest, which states the same rects without the artwork', () => {
    draw(createImage(4, 4), 'MANIFEST', SEGMENTED);

    expect(screen.getByRole('group', { name: 'Sprite cut' })).toBeInTheDocument();
  });

  it('sends the resolved cell to the writer', async () => {
    draw(createImage(4, 4), 'SPRITE_PACK', SEGMENTED, {
      ...DEFAULT_SPRITE_CELL_CHOICE,
      source: 'FIXED',
      fixed: { width: 8, height: 8 },
    });

    await userEvent.click(screen.getByRole('button', { name: /download sprite pack/i }));

    expect(FakeSheetWriteWorker.started[0]?.posted[0]?.cell).toStrictEqual({
      width: 8,
      height: 8,
      anchor: { x: 'CENTRE', y: 'BOTTOM' },
    });
    await finish();
  });

  it('sends no cell under a format that does not cut, whatever was last set', async () => {
    // Otherwise a cell left set from an earlier press reaches a writer with no controls on screen
    // for it.
    draw(createImage(4, 4), 'PNG', SEGMENTED, {
      ...DEFAULT_SPRITE_CELL_CHOICE,
      source: 'FIXED',
      fixed: { width: 8, height: 8 },
    });

    await userEvent.click(screen.getByRole('button', { name: /download png/i }));

    expect(FakeSheetWriteWorker.started[0]?.posted[0]?.cell).toBeNull();
    await finish();
  });
});
