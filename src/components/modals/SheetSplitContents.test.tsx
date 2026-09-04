import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { NO_COMPONENT_BUDGET } from '../../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { describeDirections } from '../../constants/promptText/index.ts';
import {
  DEFAULT_CAMERA_ELEVATIONS,
  DEPTH_ORDER_TEXT,
  DIRECTION_LISTS,
  PLAN_DEPTH_ORDER_TEXT,
} from '../../constants/promptText/index.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { batchComponentCount, componentCountFor, sheetComponentCount } from '../../utils/componentSet.ts';
import { sheetRuns } from '../../utils/sheetRuns.ts';
import { SheetSplitContents } from './SheetSplitContents.tsx';

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

/** Above the directional core's fifteen components and below the articulation sheet's thirty-four. */
const BUDGET_BETWEEN_THE_TWO_SHEETS = 20;

function copyButtons(): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: 'Copy this sheet' });
}

interface RowUnderTest {
  readonly name: string;
  readonly count: number;
  readonly row: HTMLElement;
}

/**
 * Every rendered row paired with the sheet behind it, so an assertion about a row can name which
 * sheet it belongs to.
 *
 * The count comes from `sheetComponentCount` — the same function the row calls. That is deliberate:
 * what is under test here is whether the drawer *asks* the budget about every sheet of the batch,
 * and whether the arithmetic itself is right is `componentSet.test.ts`'s question.
 */
function sheetsOnScreen(): readonly RowUnderTest[] {
  const runs = sheetRuns('CHARACTER', defaultSubjectFor('CHARACTER'), useOutputStore.getState().output);
  const rows = screen.getAllByRole('listitem');

  return runs.map((run, index) => {
    const row = rows[index];
    if (row === undefined) throw new Error('the drawer should render one row per sheet of the batch.');
    return { name: run.plan.name, count: sheetComponentCount('CHARACTER', run, []), row };
  });
}

/** The sheets whose rows carry the over-budget chip, named. */
function flaggedIn(sheets: readonly RowUnderTest[]): readonly string[] {
  return sheets
    .filter((sheet) => within(sheet.row).queryByText('Over budget') !== null)
    .map((sheet) => sheet.name);
}

describe('SheetSplitContents', () => {
  it('offers one row per facing, each naming what is on it as well as which way it faces', () => {
    render(<SheetSplitContents />);

    expect(copyButtons()).toHaveLength(FACINGS.length);
    // Both halves of the label, because a batch can split by facing or by sheet and a row cannot
    // know which: here the name is constant across the eight and the facing is what varies.
    for (const facing of FACINGS) {
      expect(screen.getByText(`Rig pieces · ${facing}`)).toBeInTheDocument();
    }
  });

  it('states what the whole batch asks for, not what one sheet of it does', () => {
    // The gap this closes: eight rows each showing a word count, beside a studio saying "this sheet
    // asks for 15 components" — true of every one of them, and no answer at all to how large the
    // job is. The arithmetic is `componentSet.test.ts`'s; what is checked here is that the summary
    // states the batch's figure and each row states its own, rather than one of them standing in
    // for the other.
    render(<SheetSplitContents />);

    const runs = sheetRuns('CHARACTER', defaultSubjectFor('CHARACTER'), useOutputStore.getState().output);
    const perSheet = componentCountFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'EIGHT_COMPASS', 0, []);
    const total = batchComponentCount('CHARACTER', runs, []);

    expect(total).toBe(perSheet * FACINGS.length);
    expect(screen.getByText(`${String(total)} components`)).toBeInTheDocument();
    // Once per row and nowhere else — the eight sheets of a rig all carry the same plan, so the
    // per-sheet figure is the same eight times and is never the number in the summary.
    expect(screen.getAllByText(`${String(perSheet)} components`)).toHaveLength(FACINGS.length);
  });

  it('describes each row’s depth order the way the prompt inside that row does', () => {
    // The row's summary sits directly above a disclosure holding the prompt it describes, so the two
    // have to have resolved the same camera. Depth order is a near/far question and there is no near
    // side directly overhead, so a row reading the per-facing record would state "pieces on the left
    // render in front of the body" above a prompt saying the pieces stack by height instead.
    useOutputStore.setState({
      output: {
        ...useOutputStore.getState().output,
        projection: 'PURE_TOPDOWN',
        cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      },
    });
    render(<SheetSplitContents />);

    const sheets = sheetsOnScreen();
    const runs = sheetRuns('CHARACTER', defaultSubjectFor('CHARACTER'), useOutputStore.getState().output);

    for (const [index, sheet] of sheets.entries()) {
      const run = runs[index];
      if (run === undefined) throw new Error('every row should have a run behind it.');
      expect(within(sheet.row).getByText(PLAN_DEPTH_ORDER_TEXT)).toBeInTheDocument();
      expect(within(sheet.row).queryByText(DEPTH_ORDER_TEXT[run.assembly])).toBeNull();
      // The premise: the prompt this row will copy has resolved the camera the same way.
      expect(run.promptText).toContain(PLAN_DEPTH_ORDER_TEXT);
    }
  });

  it('gives a row covering several facings the depth order of each of them', () => {
    // The reported failure, on the surface that shows it: a cut-out rig reaching a multi-view
    // directional core, where the row stated the *assembly* facing's depth order for a sheet that
    // draws five. An eight-compass core is the case with two sheets to compare — one takes the
    // cardinals and the other the diagonals — so a row that named one facing's answer described
    // three of its own four wrongly, and described the other sheet's four not at all.
    useSubjectStore.setState({ category: 'OBJECT', subject: defaultSubjectFor('OBJECT') });
    useOutputStore.setState({
      output: {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        rigMode: 'CUTOUT_RIG',
        directions: 'EIGHT_COMPASS',
      },
    });
    render(<SheetSplitContents />);

    const runs = sheetRuns('OBJECT', defaultSubjectFor('OBJECT'), useOutputStore.getState().output);
    const rows = screen.getAllByRole('listitem');
    expect(runs.length).toBeGreaterThan(1);

    for (const [index, run] of runs.entries()) {
      const row = rows[index];
      if (row === undefined) throw new Error('the drawer should render one row per sheet of the batch.');
      expect(run.covered.length).toBeGreaterThan(1);

      for (const facing of run.covered) {
        // Asserted on the note's own line rather than on the row, because the row also holds the
        // whole prompt inside its `<details>` — and the prompt now carries every covered facing's
        // sentence, which is the fix. A `toContain` over `row.textContent` would therefore pass with
        // the note rendering one facing, or none at all.
        const line = within(row).getByText(facing).closest('p');
        expect(line?.textContent, `${run.plan.name} ${facing}`).toBe(
          `${facing} — ${DEPTH_ORDER_TEXT[facing]}`,
        );
      }

      // And what the other sheet of the series covers is not on this one, which is the whole of what
      // the split is showing the reader.
      for (const facing of FACINGS.filter((other) => !run.covered.includes(other))) {
        expect(within(row).queryByText(facing), `${run.plan.name} ${facing}`).toBeNull();
      }
    }
  });

  it('flags the sheet of a series that is over the budget, and only that one', () => {
    // The gap this closes: `exceedsComponentBudget` was only ever asked about the sheet the studio's
    // own control was pointed at. On the facing axis that checks everything, because all eight runs
    // of a rig carry the same plan and therefore the same count — on the series axis it checked one
    // of two, and the heavy sheet is precisely the one the studio is not on. A character's
    // directional core is fifteen components and the articulation sheet beside it thirty-four, so a
    // budget between the two is over on exactly one row.
    useOutputStore.setState({
      output: {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        componentBudget: BUDGET_BETWEEN_THE_TWO_SHEETS,
      },
    });
    render(<SheetSplitContents />);

    // One core sheet, then the articulation run at each of the five classic facings.
    const sheets = sheetsOnScreen();
    expect(sheets).toHaveLength(6);

    // The premise rather than a restatement of the arithmetic: a fixture where every sheet sat under
    // the budget would satisfy every assertion below while proving nothing at all.
    expect(sheets.filter((sheet) => sheet.count > BUDGET_BETWEEN_THE_TWO_SHEETS)).toHaveLength(5);

    for (const sheet of sheets) {
      expect(within(sheet.row).getByText(`${String(sheet.count)} components`)).toBeInTheDocument();
    }

    // Named, not counted: which sheets carry the warning is the whole point, and a test that only
    // checked "some of them" would pass with the flag on the wrong row.
    expect(flaggedIn(sheets)).toEqual(Array.from({ length: 5 }, () => 'Articulation'));
    expect(
      screen.getByText(new RegExp(`over the budget of ${String(BUDGET_BETWEEN_THE_TWO_SHEETS)}`)),
    ).toBeInTheDocument();
  });

  it('flags nothing when no budget is set, however heavy the sheet', () => {
    // `NO_COMPONENT_BUDGET` is zero, so a comparison that folded the unset case into `count > budget`
    // would report every sheet in the app as over budget — and the drawer, unlike the studio, would
    // say so on every row at once.
    useOutputStore.setState({
      output: {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        componentBudget: NO_COMPONENT_BUDGET,
      },
    });
    render(<SheetSplitContents />);

    const sheets = sheetsOnScreen();
    expect(sheets.some((sheet) => sheet.count > 0)).toBe(true);
    expect(flaggedIn(sheets)).toEqual([]);
    expect(screen.getByText(/no budget is set/)).toBeInTheDocument();
  });

  it('records eight prompts, not one, each with the configuration that reproduces it', async () => {
    const user = userEvent.setup();
    render(<SheetSplitContents />);

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
      expect(log.promptText).toContain(`- Primary assembly direction: ${describeDirections([facing])}`);
    }

    // And they are in storage, not merely in the store.
    await expect(backend.listHistoryLogs()).resolves.toHaveLength(FACINGS.length);
  });

  it('marks a run done once it has actually been copied', async () => {
    const user = userEvent.setup();
    render(<SheetSplitContents />);

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
    render(<SheetSplitContents />);

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
    const { unmount } = render(<SheetSplitContents />);

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
    render(<SheetSplitContents />);

    await waitFor(() => {
      expect(screen.getByText(`1 of ${String(FACINGS.length)} copied`)).toBeInTheDocument();
    });
  });

  it('marks the one row the studio is composing, and only that one', async () => {
    // The drawer is the batch laid out at once and the studio's strip is the batch as a position;
    // a user arriving here from a prompt they were reading needs to see which of these rows made it.
    // Both read the ordinal `sheetBatch` computes, which is also what section 6 of every prompt in
    // the batch marks, so the three cannot disagree.
    render(<SheetSplitContents />);

    /** Which rows carry the marker, by position in the batch — named, not counted. */
    const markedPositions = () =>
      sheetsOnScreen()
        .map((sheet, index) => (within(sheet.row).queryByText('In the studio') === null ? -1 : index))
        .filter((index) => index >= 0);

    // The default facing resolves to the first of the set, so the first row is the studio's.
    expect(markedPositions()).toEqual([0]);

    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, primaryDirection: FACINGS[3] ?? null },
    });

    // Exactly one row, and it moved with the studio: a marker computed from anything but the
    // resolved ordinal would either stay put or land on more than one row.
    await waitFor(() => {
      expect(markedPositions()).toEqual([3]);
    });
  });

  it('names the sheet it just copied, rather than confirming that something was', async () => {
    // "Prompt copied to the clipboard" is no answer at all to which of eight prompts just went, and
    // the header's Copy Prompt is reachable mid-batch too — so the confirmation is derived from the
    // configuration being copied wherever a batch is more than one sheet.
    const user = userEvent.setup();
    render(<SheetSplitContents />);

    const [, second] = copyButtons();
    if (!second) throw new Error('the splitter should offer a copy button per run.');
    await user.click(second);

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(
        `Copied sheet 2 of ${String(FACINGS.length)} — Rig pieces · ${String(FACINGS[1])}`,
      );
    });
  });

  it('warns when the runs are not tied to one subject', async () => {
    // §5: the hardest part is not sheet one, it is sheet two matching sheet one. Eight sheets with
    // no identity lock come back as eight different characters in similar colours.
    render(<SheetSplitContents />);
    expect(screen.queryByText('No identity lock')).not.toBeInTheDocument();

    useOutputStore.setState({ output: { ...useOutputStore.getState().output, identityLock: '   ' } });

    await waitFor(() => {
      expect(screen.getByText('No identity lock')).toBeInTheDocument();
    });
  });
});
