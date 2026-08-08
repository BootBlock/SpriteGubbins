import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { CollapsibleSection } from './CollapsibleSection.tsx';
import { SectionToggleAll } from './SectionToggleAll.tsx';

/**
 * The disclosure's contract, which is mostly about what a *folded* group still says.
 *
 * Folding hides the controls; it must never hide the configuration, because every field inside one
 * of these reaches the compiled prompt whether the group is open or shut. The digest is what makes
 * that true, so the tests that matter here are the ones about when it is on screen.
 */
const SECTION = { id: 'test:group', defaultOpen: true } as const;

function renderSection(open = true) {
  return render(
    <CollapsibleSection
      id={SECTION.id}
      defaultOpen={open}
      heading="Render style"
      digest="PIXEL_ART · HIGH_RESOLUTION"
    >
      <label htmlFor="inner">
        Inner field
        <input id="inner" type="text" defaultValue="" />
      </label>
    </CollapsibleSection>,
  );
}

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
});

describe('CollapsibleSection', () => {
  it('heads the group with a real heading, so screen readers can navigate to it', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: 'Render style', level: 3 })).toBeInTheDocument();
  });

  it('shows the digest only while folded', () => {
    renderSection(false);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();

    renderSection(true);
    // Two sections are mounted now; the open one must not have added a second digest.
    expect(screen.getAllByText('PIXEL_ART · HIGH_RESOLUTION')).toHaveLength(1);
  });

  it('opens and closes from the summary, and records it in the store', async () => {
    const user = userEvent.setup();
    renderSection(false);

    await user.click(screen.getByRole('heading', { name: 'Render style' }));
    expect(useSectionStore.getState().openSections[SECTION.id]).toBe(true);
    expect(screen.queryByText('PIXEL_ART · HIGH_RESOLUTION')).not.toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Render style' }));
    expect(useSectionStore.getState().openSections[SECTION.id]).toBe(false);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();
  });

  it('takes its state from the store over its own default', () => {
    useSectionStore.setState({ openSections: { [SECTION.id]: false } });
    renderSection(true);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();
  });

  it('puts nothing interactive inside the summary — the summary is the control', () => {
    renderSection(true);
    const summary = document.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.querySelector('button, a, input, select, textarea')).toBeNull();
  });

  it('names itself from the heading alone, and offers the values as a description', () => {
    renderSection(false);
    const summary = document.querySelector('summary');
    const named = document.getElementById(summary?.getAttribute('aria-labelledby') ?? '');
    const described = document.getElementById(summary?.getAttribute('aria-describedby') ?? '');
    expect(named?.textContent).toBe('Render style');
    expect(described?.textContent).toBe('PIXEL_ART · HIGH_RESOLUTION');
    // Not `aria-hidden`: a description is read once at the reader's verbosity and can never be
    // re-read, so the values stay ordinary text a virtual cursor can go back over.
    expect(described).not.toHaveAttribute('aria-hidden');
  });

  it('drops the description when open — the controls label themselves', () => {
    renderSection(true);
    expect(document.querySelector('summary')).not.toHaveAttribute('aria-describedby');
  });
});

describe('SectionToggleAll', () => {
  const SECTIONS = [
    { id: 'test:a', defaultOpen: true },
    { id: 'test:b', defaultOpen: false },
  ] as const;

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
