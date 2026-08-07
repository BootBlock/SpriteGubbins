import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { SheetSplitModal } from './SheetSplitModal.tsx';

/**
 * The splitter's one irreversible effect: what it writes to the history.
 *
 * The run list itself is pinned in `utils/sheetRuns.test.ts`. What can only be checked here is that
 * copying a run logs *that run* — eight prompts rather than one, each carrying the configuration
 * that reproduces it, so an entry restores to the facing it shows rather than to run one.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const FACINGS = DIRECTION_LISTS.EIGHT_COMPASS;

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useHistoryStore.setState({ historyLogs: [], isLoading: false });
  useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
  useOutputStore.setState({
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      rigMode: 'CUTOUT_RIG',
      directions: 'EIGHT_COMPASS',
      identityLock: 'Cyan visor across the upper face, three amber chest lights in a vertical row.',
    },
  });
  useUIStore.setState({ isSplitModalOpen: true });

  // The clipboard is the gate on logging — nothing is recorded for a prompt that never reached it.
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
});

function copyButtons(): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: 'Copy this sheet' });
}

describe('SheetSplitModal', () => {
  it('offers one row per facing', () => {
    render(<SheetSplitModal />);

    expect(copyButtons()).toHaveLength(FACINGS.length);
    for (const facing of FACINGS) expect(screen.getByText(facing)).toBeInTheDocument();
  });

  it('records eight prompts, not one, each with the configuration that reproduces it', async () => {
    const user = userEvent.setup();
    render(<SheetSplitModal />);

    for (const button of copyButtons()) await user.click(button);

    await waitFor(() => {
      expect(useHistoryStore.getState().historyLogs).toHaveLength(FACINGS.length);
    });

    const logs = useHistoryStore.getState().historyLogs;
    // Eight *different* prompts. Eight entries all holding the studio's current sheet would look
    // identical here and be useless as a record of the batch.
    expect(new Set(logs.map((log) => log.promptText)).size).toBe(FACINGS.length);
    expect(new Set(logs.map((log) => log.output.primaryDirection))).toEqual(new Set(FACINGS));

    for (const log of logs) {
      const facing = log.output.primaryDirection;
      if (facing === null) throw new Error('a split run should have pinned its facing.');
      expect(log.promptText).toContain(`- Primary assembly direction: ${facing}`);
    }

    // And they are in storage, not merely in the store.
    await expect(backend.listHistoryLogs()).resolves.toHaveLength(FACINGS.length);
  });

  it('marks a run done once it has actually been copied', async () => {
    const user = userEvent.setup();
    render(<SheetSplitModal />);

    expect(screen.getAllByText('Not yet copied')).toHaveLength(FACINGS.length);
    expect(screen.getByText(`0 of ${String(FACINGS.length)} copied`)).toBeInTheDocument();

    const [first] = copyButtons();
    if (!first) throw new Error('the splitter should offer a copy button per run.');
    await user.click(first);

    await waitFor(() => {
      expect(screen.getAllByText('Copied')).toHaveLength(1);
    });
    expect(screen.getByText(`1 of ${String(FACINGS.length)} copied`)).toBeInTheDocument();
  });

  it('does not tick a run off when the copy failed', async () => {
    // Same rule the history keeps: a run marked done without reaching the clipboard is a false
    // record of where the user has got to.
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('not focused'));
    const user = userEvent.setup();
    render(<SheetSplitModal />);

    const [first] = copyButtons();
    if (!first) throw new Error('the splitter should offer a copy button per run.');
    await user.click(first);

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Could not copy to the clipboard');
    });
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);
  });

  it('remembers a copied run after the identity lock is set from it', async () => {
    // The documented workflow: copy sheet one, accept it, write the identity lock from it, come
    // back. That rewrites every run's prompt, so progress matched on prompt text would reset to
    // zero at precisely the moment the user did what §5 told them to.
    const user = userEvent.setup();
    const { unmount } = render(<SheetSplitModal />);

    const [first] = copyButtons();
    if (!first) throw new Error('the splitter should offer a copy button per run.');
    await user.click(first);
    await waitFor(() => {
      expect(screen.getByText(`1 of ${String(FACINGS.length)} copied`)).toBeInTheDocument();
    });

    unmount();
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, identityLock: 'Cyan visor, three amber lights.' },
    });
    render(<SheetSplitModal />);

    await waitFor(() => {
      expect(screen.getByText(`1 of ${String(FACINGS.length)} copied`)).toBeInTheDocument();
    });
  });

  it('warns when the runs are not tied to one subject', async () => {
    // §5: the hardest part is not sheet one, it is sheet two matching sheet one. Eight sheets with
    // no identity lock come back as eight different characters in similar colours.
    render(<SheetSplitModal />);
    expect(screen.queryByText('No identity lock')).not.toBeInTheDocument();

    useOutputStore.setState({ output: { ...useOutputStore.getState().output, identityLock: '   ' } });

    await waitFor(() => {
      expect(screen.getByText('No identity lock')).toBeInTheDocument();
    });
  });
});
