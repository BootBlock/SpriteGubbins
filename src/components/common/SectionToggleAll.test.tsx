import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { CollapsibleSection } from './CollapsibleSection.tsx';
import { SectionToggleAll } from './SectionToggleAll.tsx';

/**
 * The one button that folds or unfolds every disclosure in a panel.
 *
 * Two panels render it beside their own `CollapsibleSection`s, so it is a primitive rather than a part
 * of the disclosure. What it owes is a state it reports honestly — expand while anything is still
 * folded, collapse once all are open — a name that says which panel it acts on, and focus that survives
 * the collapse of the group the reader was standing in.
 */
const SECTIONS = [
  { id: 'test:a', defaultOpen: true },
  { id: 'test:b', defaultOpen: false },
] as const;

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
});

describe('SectionToggleAll', () => {
  it('offers to expand while anything is still folded, and collapses once all are open', async () => {
    const user = userEvent.setup();
    render(<SectionToggleAll sections={SECTIONS} panelLabel="Test panel" />);

    const button = screen.getByRole('button', { name: /expand all/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(useSectionStore.getState().openSections).toStrictEqual({
      'test:a': true,
      'test:b': true,
    });

    const collapse = screen.getByRole('button', { name: /collapse all/i });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await user.click(collapse);
    expect(useSectionStore.getState().openSections).toStrictEqual({
      'test:a': false,
      'test:b': false,
    });
  });

  it('names the regions it controls, so the state it reports can be traced to them', () => {
    render(<SectionToggleAll sections={SECTIONS} panelLabel="Test panel" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'section-test:a section-test:b');
  });

  /**
   * Collapsing a group the user is standing in must not drop them out of the document. A shut
   * `<details>` makes its contents unfocusable, so focus falls back to `<body>` — losing the
   * position and the ring — unless it is moved somewhere deliberate first.
   */
  it('moves focus to the summary of the group it is closing, rather than losing it', () => {
    useSectionStore.setState({ openSections: { 'test:a': true } });
    render(
      <>
        <CollapsibleSection id="test:a" defaultOpen heading="Group A" digest="x">
          <label htmlFor="inner-a">
            Inner
            <input id="inner-a" type="text" defaultValue="" />
          </label>
        </CollapsibleSection>
        <SectionToggleAll sections={[{ id: 'test:a', defaultOpen: true }]} panelLabel="Test panel" />
      </>,
    );

    screen.getByLabelText('Inner').focus();
    expect(document.activeElement).toBe(screen.getByLabelText('Inner'));

    // Fired directly rather than clicked: a real pointer press moves focus to the button first,
    // which is exactly what masks this in Chromium — and not what a voice-control or AT activation,
    // or a click in Safari, does.
    screen.getByRole('button', { name: /collapse all/i }).click();

    // Focus lands on the summary of the group that just closed — the control that reopens it —
    // rather than falling back to `<body>`, which is where it goes with no recovery at all.
    expect(document.activeElement?.tagName).toBe('SUMMARY');
    expect(document.activeElement?.closest('details')?.id).toBe('section-test:a');
    expect(useSectionStore.getState().openSections['test:a']).toBe(false);
  });

  it('names the panel it acts on, so two of them are told apart', () => {
    render(<SectionToggleAll sections={SECTIONS} panelLabel="Output Configuration" />);
    expect(
      screen.getByRole('button', { name: 'Expand all Output Configuration sections' }),
    ).toBeInTheDocument();
  });
});
