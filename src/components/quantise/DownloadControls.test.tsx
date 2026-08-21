import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSheetWriteStore } from '../../stores/useSheetWriteStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { FakePngWorker } from '../../test/fakePngWorker.ts';
import { createImage } from '../../utils/imageData.ts';
import { encodePng } from '../../utils/encodePng.ts';
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
  FakePngWorker.reset();
  FakePngWorker.respond = ({ image }) =>
    new Promise((resolve) => {
      release = () => {
        void encodePng(image).then((file) => {
          resolve({ kind: 'encoded', file });
        });
      };
    });
  vi.stubGlobal('Worker', FakePngWorker);
  URL.createObjectURL = vi.fn(() => 'blob:sheet');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  release = null;
  vi.unstubAllGlobals();
});

function draw(resultImage: ImageData | null = createImage(4, 4)) {
  render(
    <DownloadControls
      downloadScale={1}
      onDownloadScaleChange={() => undefined}
      sourceName="armour.png"
      resultImage={resultImage}
    />,
  );
}

const downloadButton = () => screen.getByRole('button', { name: /download png|writing/i });

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

  it('offers no download at all until a grid is settled', () => {
    draw(null);
    expect(downloadButton()).toBeDisabled();
    expect(downloadButton()).toHaveTextContent('Download PNG');
  });
});
