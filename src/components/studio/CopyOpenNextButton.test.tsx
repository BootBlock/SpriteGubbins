import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
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
    // The copy came first: the tab opened only after the clipboard had the prompt.
    expect(writeText.mock.invocationCallOrder[0]).toBeLessThan(openWindow.mock.invocationCallOrder[0] ?? 0);
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
});
