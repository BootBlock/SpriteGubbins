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
    await user.click(button);
    expect(useSectionStore.getState().openSections).toStrictEqual({
      'test:a': true,
      'test:b': true,
    });

    await user.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(useSectionStore.getState().openSections).toStrictEqual({
      'test:a': false,
      'test:b': false,
    });
  });

  it('names the panel it acts on, so two of them are told apart', () => {
    render(<SectionToggleAll sections={SECTIONS} panelLabel="Output Configuration" />);
    expect(
      screen.getByRole('button', { name: 'Expand all Output Configuration sections' }),
    ).toBeInTheDocument();
  });
});
