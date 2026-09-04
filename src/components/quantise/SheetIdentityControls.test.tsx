import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { SHEET_IDENTITY_GUIDANCE } from '../../constants/sheetIdentity.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { sheetIdentity } from '../../utils/sheetIdentity.ts';
import { SheetIdentityControls } from './SheetIdentityControls.tsx';

/**
 * What the Quantise tab says a download is about to be recorded as.
 *
 * The identity itself is `utils/sheetIdentity.test.ts`'s and the batch behind it is
 * `sheetBatch.test.ts`'s. What can only be checked here is that the figure the file carries is the
 * figure on screen — the whole defect this panel closes was that the manifest recorded a sheet
 * position nothing in the tab ever showed, so a reader who forgot to step the studio wrote `west`
 * over the south sheet's pixels and had no way to notice.
 */

const CLASSIC = DIRECTION_LISTS.FIVE_CLASSIC;

beforeEach(() => {
  useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
  useOutputStore.setState({
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FIVE_CLASSIC',
    },
  });
});

/** The identity a download would write from the studio as it currently stands. */
function recorded() {
  const { category, subject } = useSubjectStore.getState();
  const { sheet } = sheetIdentity(
    category,
    useOutputStore.getState().output,
    subject.clothing,
    subject.additional_anatomy,
  );
  if (sheet === null) throw new Error('this configuration should resolve to a sheet of its batch.');
  return sheet;
}

function stepButton(name: 'Previous' | 'Next sheet'): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('SheetIdentityControls', () => {
  it('names the sheet of the batch the download will record, and what is on it', () => {
    const sheet = recorded();
    expect(sheet.total).toBe(1 + CLASSIC.length);
    expect(sheet.ordinal).toBe(1);

    render(<SheetIdentityControls />);

    expect(screen.getByText(`Sheet 1 of ${String(sheet.total)}`)).toBeInTheDocument();
    // Both halves of the label, as the studio's own strip carries them: what is on the sheet, and
    // how much of the subject's turn it covers. The core sheet draws all five classic views, so
    // naming its assembly direction alone would read identically to the runs behind it.
    expect(
      screen.getByText(
        `Directional core · ${String(CLASSIC.length)} facings · ${String(sheet.components)} components`,
      ),
    ).toBeInTheDocument();
  });

  it('shows the component count the prompt contracted for, from the identity itself', () => {
    // Not a reading of any image — the tab may hold a sheet from last week — so the figure has to be
    // the one the manifest carries rather than anything the segmentation found.
    const sheet = recorded();
    expect(sheet.components).toBeGreaterThan(0);

    render(<SheetIdentityControls />);

    expect(screen.getByText(new RegExp(`· ${String(sheet.components)} components$`))).toBeInTheDocument();
  });

  it('follows the studio when the position is stepped from this tab', async () => {
    // The second half of the fix: a reader spends a batch on this tab, and walking back to the
    // Studio between every generation was the only way to move the position. Stepping here writes a
    // whole batch entry, so the line and the file that would be written move together.
    const user = userEvent.setup();
    render(<SheetIdentityControls />);

    await user.click(stepButton('Next sheet'));

    const sheet = recorded();
    expect(sheet.ordinal).toBe(2);
    expect(useOutputStore.getState().output.sheetIndex).toBe(1);
    expect(useOutputStore.getState().output.primaryDirection).toBe(CLASSIC[0]);
    expect(screen.getByText(`Sheet 2 of ${String(sheet.total)}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^Articulation · ${String(CLASSIC[0])} ·`))).toBeInTheDocument();
  });

  it('stops at both ends of the batch rather than wrapping', async () => {
    const user = userEvent.setup();
    render(<SheetIdentityControls />);

    expect(stepButton('Previous')).toBeDisabled();

    const total = recorded().total;
    for (let position = 2; position <= total; position += 1) {
      await user.click(stepButton('Next sheet'));
      expect(recorded().ordinal).toBe(position);
    }

    expect(stepButton('Next sheet')).toBeDisabled();
  });

  it('offers no step, and says why, for a configuration that is one generation', () => {
    // An interface widget has no front to turn away from, so its pairing is a single sheet. The
    // panel still states the identity — a manifest records it either way — but two buttons with
    // nowhere to go are controls with nothing to do.
    useSubjectStore.setState({ category: 'INTERFACE', subject: defaultSubjectFor('INTERFACE') });
    expect(recorded().total).toBe(1);

    render(<SheetIdentityControls />);

    expect(screen.getByText('Sheet 1 of 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next sheet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.getByText(SHEET_IDENTITY_GUIDANCE.single)).toBeInTheDocument();
    expect(screen.queryByText(SHEET_IDENTITY_GUIDANCE.batch)).not.toBeInTheDocument();
  });

  it('tells a reader working a batch to bring the position into step before saving', () => {
    render(<SheetIdentityControls />);

    expect(screen.getByText(SHEET_IDENTITY_GUIDANCE.batch)).toBeInTheDocument();
    expect(screen.queryByText(SHEET_IDENTITY_GUIDANCE.single)).not.toBeInTheDocument();
  });

  it('announces a step through a region that was already in the document', () => {
    // Pressing a step button leaves focus on a button whose own name has not changed, so without a
    // live region the press produces no announcement at all.
    const { container } = render(<SheetIdentityControls />);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain('Sheet 1 of 6');
    // The buttons stay outside it — a live region containing them would re-announce the control the
    // user is operating on every change.
    expect(region?.querySelector('button')).toBeNull();
  });
});
