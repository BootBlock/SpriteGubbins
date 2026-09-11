import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { repeatedControlNames } from '../../test/repeatedControlNames.ts';
import type { PromptHistoryLog } from '../../types/history.ts';
import { PromptHistoryContents } from './PromptHistoryContents.tsx';

/**
 * The drawer of prompts the reader has taken away, and the two things a keyboard loses in it.
 *
 * **This file did not exist**, which is the third gap #252 records: the preset library and the
 * split drawer each have a suite that renders them, and the history drawer had none — so neither
 * the repeated accessible names nor the focus its confirmations dropped had anywhere to be caught.
 *
 * The store is driven directly rather than through a database. What it does with storage is its own
 * suite's subject, and mocking one here would be a second answer to the same question; what is
 * under test is the drawer — what each control is called, and where the keyboard is after a press.
 */

const WHEN = Date.UTC(2026, 8, 5, 15, 12);

function log(id: string, overrides: Partial<PromptHistoryLog> = {}): PromptHistoryLog {
  return {
    id,
    category: 'CHARACTER',
    promptText: `Prompt ${id}`,
    createdAt: WHEN,
    wordCount: 120,
    modelUsed: 'CHATGPT_5_6_SOL',
    subject: DEFAULT_PRESET.subject,
    // The preset pins the image half; a stored entry carries the whole configuration.
    output: { ...DEFAULT_OUTPUT_CONFIG, ...DEFAULT_PRESET.output },
    ...overrides,
  };
}

/** The row actions, in the order a reader meets them, for whichever entry is asked for. */
function rowAction(kind: 'Delete' | 'Copy prompt' | 'Restore' | 'Cancel', index = 0): HTMLElement {
  const found = screen.getAllByRole('button', { name: new RegExp(`^${kind}[ ,—]`) });
  const button = found[index];
  if (button === undefined) throw new Error(`no ${kind} button at ${String(index)}`);
  return button;
}

beforeEach(() => {
  // Two entries a minute apart, because the timestamp is half of what tells one row from the next
  // and a fixture that gave them the same one would be asserting against a coincidence.
  useHistoryStore.setState({
    historyLogs: [log('a'), log('b', { createdAt: WHEN - 60_000 })],
    isLoading: false,
    fetchHistory: async () => undefined,
  });
});

afterEach(() => {
  useHistoryStore.setState({ historyLogs: [] });
  vi.restoreAllMocks();
});

describe('PromptHistoryContents', () => {
  it('names every control after the entry it acts on, so no two of them read alike', () => {
    render(<PromptHistoryContents />);

    // Three names repeated once per entry is what a screen reader's element list showed, and what a
    // Tab through the drawer sounded like: `Delete this prompt`, `Copy prompt`, `Restore`, over and
    // over, with nothing naming the prompt. A prompt has no name, so the row's own vocabulary — its
    // category and its timestamp — is what tells one from the next. Measured at the 4,000,000
    // character budget this drawer holds 136 entries, which is 408 identically named buttons.
    expect(repeatedControlNames()).toStrictEqual([]);
    expect(rowAction('Delete')).toHaveAccessibleName(/^Delete the CHARACTER prompt from /);
    expect(rowAction('Copy prompt')).toHaveAccessibleName(/^Copy prompt — the CHARACTER prompt from /);
    expect(rowAction('Restore')).toHaveAccessibleName(/ into the studio$/);
  });

  it('asks on the button the press landed on, which is what keeps the focus', async () => {
    const user = userEvent.setup();
    render(<PromptHistoryContents />);

    rowAction('Delete').focus();
    await user.keyboard('{Enter}');

    // The ask deliberately does *not* move focus here, which is why this is the one confirmation in
    // the app that attaches no `cancelRef`: the button survives the press, and handing the keyboard
    // to Cancel would turn the two-press gesture into Enter-then-cancelled.
    // The ask button in its confirming state, which is the same element the press landed on.
    expect(screen.getByRole('button', { name: /^Delete\? Confirm deleting / })).toHaveFocus();
  });

  it('gives the keyboard back to the delete button when the question is cancelled', async () => {
    const user = userEvent.setup();
    render(<PromptHistoryContents />);

    rowAction('Delete').focus();
    await user.keyboard('{Enter}');
    rowAction('Cancel').focus();
    await user.keyboard('{Enter}');

    // Cancel unmounts itself, so without a destination the press drops focus to `<body>` and a
    // keyboard reader's next Tab starts again from the top of the page.
    expect(rowAction('Delete')).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it('hands the keyboard to the next row when a delete takes the one it was in', async () => {
    const user = userEvent.setup();
    const deleteLog = vi.fn(async (id: string) => {
      useHistoryStore.setState((state) => ({
        historyLogs: state.historyLogs.filter((entry) => entry.id !== id),
      }));
      return undefined;
    });
    useHistoryStore.setState({ deleteLog });
    render(<PromptHistoryContents />);

    rowAction('Delete').focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(deleteLog).toHaveBeenCalledWith('a');
    });
    // The row the focus was in has gone, so the destination has to be outside it — where the next
    // Tab would have gone, which is the surviving row's own delete button.
    expect(screen.getAllByRole('button', { name: /^Delete the / })).toHaveLength(1);
    expect(rowAction('Delete')).toHaveFocus();
  });

  it('moves the keyboard onto the confirmation when the whole history is asked about', async () => {
    const user = userEvent.setup();
    render(<PromptHistoryContents />);

    screen.getByRole('button', { name: 'Clear history' }).focus();
    await user.keyboard('{Enter}');

    // The ask button is replaced here rather than reused, so the press unmounts what it landed on —
    // and the harmless half is what a stray Enter must find, which is `PackImportConfirm`'s rule.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('gives the keyboard somewhere to be once the history it was in is empty', async () => {
    const user = userEvent.setup();
    const clearHistory = vi.fn(async () => {
      useHistoryStore.setState({ historyLogs: [] });
      return undefined;
    });
    useHistoryStore.setState({ clearHistory });
    render(<PromptHistoryContents />);

    screen.getByRole('button', { name: 'Clear history' }).focus();
    await user.keyboard('{Enter}');
    // The confirmation opens on Cancel, so the destructive half is reached deliberately — which is
    // the whole of what landing on the harmless one buys.
    screen.getByRole('button', { name: 'Delete everything' }).focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(clearHistory).toHaveBeenCalledOnce();
    });
    // Both of the footer's buttons come back `disabled` the moment the collection they act on is
    // empty, so there is nothing of the footer's own to return to — the destination is the nearest
    // control that is still usable, which walking backwards is the drawer's search box.
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
