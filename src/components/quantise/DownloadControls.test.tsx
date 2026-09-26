import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuantiseDownloadStore } from '../../stores/useQuantiseDownloadStore.ts';
import { useSheetWriteStore } from '../../stores/useSheetWriteStore.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
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
  // A decision is pinned to a place on one sheet, so it must not survive into the next test's.
  useSpriteAssignmentStore.getState().forget();
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
  useQuantiseDownloadStore.setState({ downloadScale: 1, downloadFormat, cellChoice });
  render(
    <DownloadControls sourceName="armour.png" resultImage={resultImage} duplicates={[]} sprites={sprites} />,
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
    const user = userEvent.setup({ delay: null });
    draw();
    await user.click(downloadButton());

    expect(downloadButton()).toHaveTextContent('Writing…');
    expect(downloadButton()).toBeDisabled();

    await finish();
    expect(downloadButton()).toHaveTextContent('Download PNG');
    expect(downloadButton()).toBeEnabled();
  });

  it('gives the keyboard its place back when the button returns', async () => {
    const user = userEvent.setup({ delay: null });
    draw();
    downloadButton().focus();
    await user.keyboard('{Enter}');

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
    const user = userEvent.setup({ delay: null });
    draw();
    downloadButton().focus();
    await user.keyboard('{Enter}');
    const elsewhere = screen.getByRole('button', { name: '2×' });
    act(() => {
      elsewhere?.focus();
    });

    await finish();
    expect(elsewhere).toHaveFocus();
  });

  it('names the format it would write, and sends the sprites it would cut it into', async () => {
    const user = userEvent.setup({ delay: null });
    const sprites: SpriteSegmentation = {
      kind: 'SEGMENTED',
      boxes: [{ left: 0, top: 0, width: 2, height: 2, pixels: 4 }],
      specks: 0,
    };
    draw(createImage(4, 4), 'ASEPRITE', sprites);
    expect(downloadButton()).toHaveTextContent('Download Aseprite');

    await user.click(downloadButton());
    // The boxes reach the writer, at 1:1 — without them the document would be one frame of the
    // whole sheet, which is a working file that has quietly lost what the tab found on it.
    expect(FakeSheetWriteWorker.started[0]?.posted[0]).toMatchObject({
      format: 'ASEPRITE',
      boxes: sprites.boxes,
    });
    await finish();
  });

  it('sends the reader’s pieces and their names, not the segmentation’s own boxes', async () => {
    // **What bullet 4 of the issue asks for, and what nothing else can prove.** Every format takes
    // the one resolved list, so a sprite left out reaches no writer and two joined reach every
    // writer as one box — which is what stops a pack and an Aseprite document cutting one sheet two
    // ways. The assertion above passes either way, because an empty assignment resolves to one piece
    // per box; this one does not.
    const user = userEvent.setup({ delay: null });
    const sprites: SpriteSegmentation = {
      kind: 'SEGMENTED',
      boxes: [
        { left: 0, top: 0, width: 2, height: 2, pixels: 4 },
        { left: 8, top: 0, width: 2, height: 2, pixels: 4 },
        { left: 16, top: 0, width: 2, height: 2, pixels: 4 },
      ],
      specks: 0,
    };
    // The second sprite joins the first, and the third is left out — so one piece reaches the
    // writer, cut to the box holding both halves of the join.
    act(() => {
      useSpriteAssignmentStore.getState().decide({ x: 9, y: 1 }, { kind: 'JOIN', to: { x: 1, y: 1 } });
      useSpriteAssignmentStore.getState().decide({ x: 17, y: 1 }, { kind: 'LEAVE_OUT' });
    });
    // Driven through the Aseprite format on purpose: it is the one the issue's fourth bullet names,
    // and the one that could most easily have been left reading the raw boxes.
    draw(createImage(24, 4), 'ASEPRITE', sprites);

    await user.click(downloadButton());
    expect(FakeSheetWriteWorker.started[0]?.posted[0]).toMatchObject({
      format: 'ASEPRITE',
      boxes: [{ left: 0, top: 0, width: 10, height: 2, pixels: 8 }],
      names: ['sprite-1'],
      naming: null,
    });
    await finish();
  });

  it('sends no boxes for a sheet nothing was separated on', async () => {
    const user = userEvent.setup({ delay: null });
    draw(createImage(4, 4), 'ASEPRITE', { kind: 'SOLID' });
    await user.click(downloadButton());

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

  // A control that changed nothing would be a lie on screen: a PNG and an Aseprite document read no
  // cell, so neither offers one, while the manifest states the same rects as the pack without the
  // artwork.
  it.each([
    ['withholds', 'PNG', false],
    ['withholds', 'ASEPRITE', false],
    ['offers', 'SPRITE_PACK', true],
    ['offers', 'MANIFEST', true],
  ] as const)('%s the cut under %s', (_, format, offered) => {
    draw(createImage(4, 4), format, SEGMENTED);

    expect(screen.queryByRole('group', { name: 'Sprite cut' }) !== null).toBe(offered);
  });

  it('sends the resolved cell to the writer', async () => {
    const user = userEvent.setup({ delay: null });
    draw(createImage(4, 4), 'SPRITE_PACK', SEGMENTED, {
      ...DEFAULT_SPRITE_CELL_CHOICE,
      source: 'FIXED',
      fixed: { width: 8, height: 8 },
    });

    await user.click(screen.getByRole('button', { name: /download sprite pack/i }));

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
    const user = userEvent.setup({ delay: null });
    draw(createImage(4, 4), 'PNG', SEGMENTED, {
      ...DEFAULT_SPRITE_CELL_CHOICE,
      source: 'FIXED',
      fixed: { width: 8, height: 8 },
    });

    await user.click(screen.getByRole('button', { name: /download png/i }));

    expect(FakeSheetWriteWorker.started[0]?.posted[0]?.cell).toBeNull();
    await finish();
  });
});
