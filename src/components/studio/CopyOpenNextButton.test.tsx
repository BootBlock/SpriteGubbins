import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { CopyOpenNextButton } from './CopyOpenNextButton.tsx';

/**
 * Copy Prompt, Open generator and Next sheet in one press.
 *
 * What the copy itself writes to the history and the toast is `useCopyPrompt.test.tsx`'s, and the
 * step's rule — a whole batch entry written back — is `SheetStepButtons.test.tsx`'s. What is this
 * button's is the order of the three, that none of the later two happens without the first, and
 * that it never takes the same prompt twice in a row while still letting a second pass through the
 * batch start again from the first sheet.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const writeText = vi.fn<(text: string) => Promise<void>>();
const openWindow = vi.fn<typeof window.open>();

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useHistoryStore.setState({ historyLogs: [], isLoading: false });
  useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
  useOutputStore.setState({
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FIVE_CLASSIC',
    },
  });
  writeText.mockReset().mockResolvedValue(undefined);
  openWindow.mockReset().mockReturnValue(null);
});

/**
 * A user, with the clipboard and `window.open` spied on. The spies go on after `userEvent.setup()`,
 * which puts a clipboard stub of its own on `navigator` and would otherwise replace the spy.
 */
function setup(): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
  vi.spyOn(window, 'open').mockImplementation(openWindow);
  return user;
}

/** The prompt the studio compiles right now — what the preview hands the button. */
function currentPrompt(): string {
  const { category, subject } = useSubjectStore.getState();
  return generatePrompt(category, subject, useOutputStore.getState().output);
}

/** The preview's part in it: the compiled prompt, recompiled whenever a store the button reads moves. */
function Harness() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);
  return <CopyOpenNextButton promptText={generatePrompt(category, subject, output)} />;
}

function batch() {
  const { category, subject } = useSubjectStore.getState();
  return sheetBatch(category, subject, useOutputStore.getState().output);
}

/**
 * Writes the batch entry at `index` (negative counts from the end), as a step button does — from a
 * batch computed afresh, so the configuration it writes is a new object each time.
 */
function stepTo(index: number): void {
  const sheet = batch().sheets.at(index);
  if (sheet === undefined) throw new Error(`the batch should have a sheet at ${String(index)}.`);
  useOutputStore.getState().setOutputConfig(sheet.output);
}

/** Presses the button and waits for the press to finish, which ends with the history entry. */
async function press(user: ReturnType<typeof userEvent.setup>, name: string | RegExp): Promise<void> {
  const logged = useHistoryStore.getState().historyLogs.length;
  await user.click(screen.getByRole('button', { name }));
  await waitFor(() => {
    expect(useHistoryStore.getState().historyLogs.length).toBeGreaterThan(logged);
  });
}

describe('CopyOpenNextButton', () => {
  it('copies this sheet, opens the generator, then moves on to the next sheet', async () => {
    const user = setup();
    const { sheets, ordinal } = batch();
    expect(ordinal).toBe(1);
    const firstPrompt = currentPrompt();
    render(<Harness />);

    await press(user, 'Copy, open & next');

    expect(writeText).toHaveBeenCalledExactlyOnceWith(firstPrompt);
    expect(openWindow).toHaveBeenCalledExactlyOnceWith(
      'https://chatgpt.com/images',
      '_blank',
      'noopener,noreferrer',
    );
    expect(useOutputStore.getState().output).toEqual(sheets[1]?.output);
  });

  it('opens the tab once the clipboard has the prompt, and before the history write', async () => {
    const user = setup();
    let finishWrite = (): void => undefined;
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    // What the history held at the moment the tab opened.
    const loggedAtOpen: number[] = [];
    openWindow.mockImplementation(() => {
      loggedAtOpen.push(useHistoryStore.getState().historyLogs.length);
      return null;
    });
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Copy, open & next' }));
    // The write is still pending, so nothing has opened and the studio has not moved.
    expect(openWindow).not.toHaveBeenCalled();
    expect(batch().ordinal).toBe(1);

    finishWrite();
    await waitFor(() => {
      expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    });
    expect(loggedAtOpen).toEqual([0]);
    expect(batch().ordinal).toBe(2);
  });

  it('copies once for a second press made while the first is still copying', async () => {
    const user = setup();
    let finishWrite = (): void => undefined;
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Copy, open & next' });

    await user.click(button);
    await user.click(button);
    finishWrite();
    await waitFor(() => {
      expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(batch().ordinal).toBe(2);
  });

  it('does not step over a change the reader made while the copy was in flight', async () => {
    const user = setup();
    let finishWrite = (): void => undefined;
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Copy, open & next' }));
    act(() => {
      stepTo(-1);
    });
    const chosen = useOutputStore.getState().output;
    finishWrite();
    await waitFor(() => {
      expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    });

    expect(useOutputStore.getState().output).toBe(chosen);
  });

  it('never takes the same prompt twice on the way through, and stops on the last sheet', async () => {
    const user = setup();
    const total = batch().sheets.length;
    render(<Harness />);

    for (let step = 1; step < total; step += 1) await press(user, 'Copy, open & next');
    expect(batch().ordinal).toBe(total);

    // The last sheet has nowhere to step to, which the label says before the press.
    const button = screen.getByRole('button', { name: 'Copy & open' });
    expect(button).toHaveAttribute('aria-disabled', 'false');
    await press(user, 'Copy & open');

    const copied = writeText.mock.calls.map(([text]) => text);
    expect(copied).toHaveLength(total);
    expect(new Set(copied).size).toBe(total);
    expect(openWindow).toHaveBeenCalledTimes(total);
    expect(batch().ordinal).toBe(total);

    // Spent: a second press on the same prompt does nothing at all.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    expect(writeText).toHaveBeenCalledTimes(total);
    expect(openWindow).toHaveBeenCalledTimes(total);
  });

  it('comes back once the reader steps away from the last sheet or changes the prompt', async () => {
    const user = setup();
    stepTo(-1);
    render(<Harness />);

    await press(user, 'Copy & open');
    const button = screen.getByRole('button', { name: 'Copy & open' });
    expect(button).toHaveAttribute('aria-disabled', 'true');

    // Stepping back and forward again lands on the same prompt, and is still a deliberate return.
    act(() => {
      stepTo(-2);
    });
    act(() => {
      stepTo(-1);
    });
    expect(button).toHaveAttribute('aria-disabled', 'false');

    await press(user, 'Copy & open');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    act(() => {
      useSubjectStore.getState().setField('species', 'Sentient Filing Cabinet');
    });
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('comes back after stepping away, even when a restore returns the very same configuration', async () => {
    // A history restore or an undo writes back the configuration object it holds, which is the one
    // the press was made on — so a button that compared against it would be spent again.
    const user = setup();
    stepTo(-1);
    const pressedOn = useOutputStore.getState().output;
    render(<Harness />);

    await press(user, 'Copy & open');
    act(() => {
      stepTo(-2);
    });
    act(() => {
      useOutputStore.getState().setOutputConfig(pressedOn);
    });

    expect(screen.getByRole('button', { name: 'Copy & open' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('works through the batch again from the first sheet after a setting changes', async () => {
    // Issue #307's second workflow: every sheet has been copied, the reader goes back to the first,
    // changes a setting and starts again. Each sheet already reads as copied in the history, so a
    // button that looked for the first uncopied sheet would have nothing to offer.
    const user = setup();
    const { sheets } = batch();
    render(<Harness />);
    for (let step = 1; step < sheets.length; step += 1) await press(user, 'Copy, open & next');
    await press(user, 'Copy & open');

    act(() => {
      stepTo(0);
      useSubjectStore.getState().setField('species', 'Sentient Filing Cabinet');
    });
    const secondPass = currentPrompt();
    writeText.mockClear();

    await press(user, 'Copy, open & next');

    expect(writeText).toHaveBeenCalledExactlyOnceWith(secondPass);
    expect(batch().ordinal).toBe(2);
  });

  it('copies and moves on without opening anything for a target that has no generator page', async () => {
    const user = setup();
    useOutputStore.getState().setOutputField('targetModel', 'GENERIC');
    render(<Harness />);

    await press(user, 'Copy & next');

    expect(writeText).toHaveBeenCalledOnce();
    expect(openWindow).not.toHaveBeenCalled();
    expect(batch().ordinal).toBe(2);
  });

  it('only copies on the last sheet for a target that has no generator page, then waits', async () => {
    const user = setup();
    useOutputStore.getState().setOutputField('targetModel', 'GENERIC');
    stepTo(-1);
    const onLast = useOutputStore.getState().output;
    render(<Harness />);

    await press(user, 'Copy');

    expect(writeText).toHaveBeenCalledOnce();
    expect(openWindow).not.toHaveBeenCalled();
    expect(useOutputStore.getState().output).toBe(onLast);
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('copies and opens a configuration that is one sheet, then waits', async () => {
    const user = setup();
    useSubjectStore.setState({ category: 'INTERFACE', subject: defaultSubjectFor('INTERFACE') });
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
    expect(batch().sheets).toHaveLength(1);
    render(<Harness />);

    await press(user, 'Copy & open');

    expect(openWindow).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copy & open' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('neither opens nor moves when the copy fails', async () => {
    const user = setup();
    writeText.mockRejectedValue(new Error('Document is not focused.'));
    const before = useOutputStore.getState().output;
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Copy, open & next' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledOnce();
    });
    expect(openWindow).not.toHaveBeenCalled();
    expect(useOutputStore.getState().output).toBe(before);
    expect(screen.getByRole('button', { name: 'Copy, open & next' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });
  it('sets the note about a target with no page as a paragraph of its own', async () => {
    useOutputStore.setState({ output: { ...useOutputStore.getState().output, targetModel: 'GENERIC' } });
    render(<Harness />);

    const button = screen.getByRole('button', { name: 'Copy & next' });
    const wrapper = button.parentElement;
    if (wrapper === null) throw new Error('The button has no guidance wrapper');
    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse', isPrimary: true });

    // One paragraph for what the button does, and one for why it opens nothing here, rather than
    // the note run on into the end of the guidance.
    const card = await screen.findByRole('tooltip');
    const paragraphs = [...card.querySelectorAll('span.block > span > span.block')].map((paragraph) =>
      paragraph.textContent.trim(),
    );
    expect(paragraphs).toEqual([
      STUDIO_ACTION_TOOLTIPS.copyOpenNext,
      STUDIO_ACTION_TOOLTIPS.copyOpenNextNoSite,
    ]);
  });
});
