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
import { sheetBatch, sheetRunCount } from '../../utils/sheetBatch.ts';
import { SheetProgress } from './SheetProgress.tsx';

/**
 * Where the user is in a batch, and the way on to the next sheet.
 *
 * The batch itself is `sheetBatch.test.ts`'s, and which sheets are marked copied is
 * `SheetSplitContents.test.tsx`'s for the drawer. What can only be checked here is that the studio says
 * *which* of them the prompt beside it is, and that stepping writes a configuration the batch
 * actually contains — both axes at once, which is precisely what the two controls in the panel
 * opposite could not do without the user knowing which order to move them in.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const CLASSIC = DIRECTION_LISTS.FIVE_CLASSIC;

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
});

/** The batch the studio is currently configured for — the answer every assertion below is against. */
function batch() {
  return sheetBatch('CHARACTER', useOutputStore.getState().output);
}

/**
 * The step buttons by accessible name — which is the label without its arrow, because the arrows are
 * decorative and hidden. Querying them this way is also what pins that: a glyph that leaked back
 * into the accessible name would fail every step below rather than merely being read out.
 */
function stepButton(name: 'Previous' | 'Next sheet'): HTMLElement {
  return screen.getByRole('button', { name });
}

/** One sheet of the batch put into the history exactly as copying it does. */
async function recordCopyOf(position: number): Promise<void> {
  const { category, subject } = useSubjectStore.getState();
  const sheet = sheetBatch(category, useOutputStore.getState().output).sheets[position - 1];
  if (sheet === undefined) throw new Error(`the batch should have a sheet at position ${String(position)}.`);

  await useHistoryStore.getState().addLog({
    category,
    subject,
    output: sheet.output,
    promptText: 'identity is keyed on the configuration, not this text',
    wordCount: 8,
    modelUsed: sheet.output.targetModel,
  });
}

describe('SheetProgress', () => {
  it('says nothing at all about a configuration that is one generation', () => {
    // An interface widget has no front to turn away from, so its pairing is a single sheet. A
    // position in a batch of one is not information, and two step buttons with nowhere to go are
    // controls with nothing to do.
    useSubjectStore.setState({ category: 'INTERFACE', subject: defaultSubjectFor('INTERFACE') });
    expect(sheetRunCount('INTERFACE', useOutputStore.getState().output)).toBe(1);

    const { container } = render(<SheetProgress />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names where in the batch the prompt beside it is, and what that sheet draws', () => {
    // The gap this closes: the ordinal has always reached section 6 of the compiled prompt and never
    // the screen, so a user working this pairing saw one prompt and no indication it was one of six.
    const { sheets, ordinal } = batch();
    expect(sheets).toHaveLength(1 + CLASSIC.length);
    expect(ordinal).toBe(1);

    render(<SheetProgress />);

    expect(screen.getByText(`Sheet 1 of ${String(sheets.length)}`)).toBeInTheDocument();
    // Both halves of the label: what is on the sheet, and how much of the subject's turn it covers.
    // The core sheet draws all five classic views, so naming its assembly direction alone would read
    // identically to the single-facing articulation sheets behind it.
    expect(screen.getByText(`Directional core · ${String(CLASSIC.length)} facings`)).toBeInTheDocument();
  });

  it('steps to the next sheet by writing the configuration that batch entry names', async () => {
    // Both axes in one write. Setting the sheet index and the facing separately is the errand this
    // replaces — and on a batch whose first sheet is multi-view and whose second is a run, moving on
    // means changing the series position *and* pinning a facing that was inert a moment ago.
    const user = userEvent.setup();
    render(<SheetProgress />);

    await user.click(stepButton('Next sheet'));

    const { sheets, ordinal } = batch();
    expect(ordinal).toBe(2);
    expect(screen.getByText(`Sheet 2 of ${String(sheets.length)}`)).toBeInTheDocument();

    const output = useOutputStore.getState().output;
    expect(output.sheetIndex).toBe(1);
    expect(output.primaryDirection).toBe(CLASSIC[0]);
    // Nothing else moved with it: stepping changes which sheet you are composing, not the subject's
    // rendering or the lock that ties the batch together.
    expect(output.identityLock).toBe(DEFAULT_OUTPUT_CONFIG.identityLock);
    expect(output.componentBudget).toBe(DEFAULT_OUTPUT_CONFIG.componentBudget);
  });

  it('walks the whole batch in the order the prompt lists it, and stops at both ends', async () => {
    const user = userEvent.setup();
    render(<SheetProgress />);

    // The trunk sheet is first and has nothing behind it; a step back from there would silently be a
    // wrap round to the last run.
    expect(stepButton('Previous')).toBeDisabled();

    const total = batch().sheets.length;
    for (let position = 2; position <= total; position += 1) {
      await user.click(stepButton('Next sheet'));
      expect(batch().ordinal).toBe(position);
      expect(stepButton('Previous')).toBeEnabled();
    }

    expect(stepButton('Next sheet')).toBeDisabled();

    // And back down again, landing on the sheet it started from rather than merely on sheet one.
    for (let position = total - 1; position >= 1; position -= 1) {
      await user.click(stepButton('Previous'));
      expect(batch().ordinal).toBe(position);
    }
    expect(useOutputStore.getState().output.sheetIndex).toBe(0);
  });

  it('reports this sheet as copied only once it is in the history, and counts the batch', async () => {
    render(<SheetProgress />);
    const total = batch().sheets.length;

    expect(screen.getByText('Not yet copied')).toBeInTheDocument();
    expect(screen.getByText(`0 of ${String(total)} copied`)).toBeInTheDocument();

    // Recorded exactly as a copy records it — the configuration travels with the prompt, which is
    // what lets a sheet be recognised again after the identity lock is written from it.
    await recordCopyOf(1);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
    expect(screen.getByText(`1 of ${String(total)} copied`)).toBeInTheDocument();
  });

  it('asks the copied question of the sheet it is on, not of the first one', async () => {
    // At ordinal 1 the sheet under test *is* `sheets[0]` and the tally is 1, so every expression in
    // the strip is indistinguishable from a constant — two mutations survive the test above:
    // reading `sheets[0].output` in place of `current.output`, and returning `isCopied(current) ? 1
    // : 0` in place of the filter. Stepping is what separates them.
    const user = userEvent.setup();
    render(<SheetProgress />);
    const total = batch().sheets.length;

    await recordCopyOf(1);
    await recordCopyOf(3);
    await waitFor(() => {
      expect(screen.getByText(`2 of ${String(total)} copied`)).toBeInTheDocument();
    });

    // Sheet 2 was never copied, and sits between two that were.
    await user.click(stepButton('Next sheet'));
    expect(screen.getByText('Sheet 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Not yet copied')).toBeInTheDocument();
    expect(screen.getByText(`2 of ${String(total)} copied`)).toBeInTheDocument();

    await user.click(stepButton('Next sheet'));
    expect(screen.getByText('Sheet 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(screen.getByText(`2 of ${String(total)} copied`)).toBeInTheDocument();
  });

  it('picks up a batch begun in an earlier session, before anything is copied here', async () => {
    // The hook's whole reason for reading the history on mount, and nothing else asserts it: every
    // other fixture arrives through `addLog`, which writes the store directly, so deleting the read
    // leaves the suite green while a user returning tomorrow sees a batch they half-finished
    // reported as untouched until they happen to open the history drawer.
    const { category, subject } = useSubjectStore.getState();
    const [first] = batch().sheets;
    if (first === undefined) throw new Error('a batch of six should have a first sheet.');

    await backend.addHistoryLog({
      id: 'from-a-previous-session',
      createdAt: 1,
      category,
      subject,
      output: first.output,
      promptText: 'copied yesterday',
      wordCount: 2,
      modelUsed: first.output.targetModel,
    });
    // The store knows nothing about it — which is exactly the state a fresh page load is in.
    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);

    render(<SheetProgress />);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
    expect(screen.getByText(`1 of ${String(batch().sheets.length)} copied`)).toBeInTheDocument();
  });

  it('announces the step through a region that was already in the document', () => {
    // Pressing a step button leaves focus on a button whose own name has not changed, so without a
    // live region the press produces no announcement at all. The region has to pre-date the change
    // it announces, which is why it wraps the status rather than being rendered with it.
    const { container } = render(<SheetProgress />);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain('Sheet 1 of 6');
    // The buttons stay outside it — a live region containing them would re-announce the control the
    // user is operating on every change.
    expect(region?.querySelector('button')).toBeNull();
  });
});
