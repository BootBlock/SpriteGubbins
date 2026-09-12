import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { sheetBatch, sheetRunCount } from '../../utils/sheetBatch.ts';
import { SheetStepButtons } from './SheetStepButtons.tsx';

/**
 * The way from one sheet of a batch to the next, shared by the studio's strip and the Quantise tab.
 *
 * The batch itself is `sheetBatch.test.ts`'s. What is this component's is that a step is a whole
 * configuration — the entry the batch already holds, written back — so the studio can never land on a
 * combination the batch does not contain, and that the two ends are ends rather than a wrap. Each
 * caller's suite checks what *it* shows after a step; neither needs to walk the batch again.
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

/** The batch the studio is currently configured for — the answer every assertion below is against. */
function batch() {
  return sheetBatch('CHARACTER', useOutputStore.getState().output);
}

/**
 * The buttons by accessible name, which is the label without its arrow. Querying them this way is also
 * what pins that: an arrow that leaked back into the name would fail every case below.
 */
function stepButton(name: 'Previous' | 'Next sheet'): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('SheetStepButtons', () => {
  it('offers no step for a configuration that is one generation', () => {
    // An interface widget has no front to turn away from, so its pairing is a single sheet, and two
    // buttons with nowhere to go are controls with nothing to do.
    useSubjectStore.setState({ category: 'INTERFACE', subject: defaultSubjectFor('INTERFACE') });
    expect(sheetRunCount('INTERFACE', useOutputStore.getState().output)).toBe(1);

    const { container } = render(<SheetStepButtons />);

    expect(container).toBeEmptyDOMElement();
  });

  it('steps by writing back the whole configuration that batch entry holds', async () => {
    // Both axes in one write. Setting the sheet index and the facing separately is what this replaced,
    // and on this batch moving from the multi-view trunk to the first run changes the series position
    // *and* pins a facing that was inert a moment ago.
    const user = userEvent.setup();
    const next = batch().sheets[1];
    if (next === undefined) throw new Error('a batch of six should have a second sheet.');
    render(<SheetStepButtons />);

    await user.click(stepButton('Next sheet'));

    expect(useOutputStore.getState().output).toStrictEqual(next.output);
    expect(next.output.sheetIndex).toBe(1);
    expect(next.output.primaryDirection).toBe(CLASSIC[0]);
    expect(batch().ordinal).toBe(2);
  });

  it('walks the whole batch in order, and stops at both ends rather than wrapping', async () => {
    const user = userEvent.setup();
    render(<SheetStepButtons />);
    const total = batch().sheets.length;
    expect(total).toBe(1 + CLASSIC.length);

    // The trunk sheet is first and has nothing behind it; a step back from there would silently be a
    // wrap round to the last run.
    expect(stepButton('Previous')).toBeDisabled();

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
    expect(stepButton('Previous')).toBeDisabled();
  });
});
