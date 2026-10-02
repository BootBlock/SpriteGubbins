import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { ICON_CATALOGUE_GROUPS } from '../../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { IconRosterSection } from './IconRosterSection.tsx';

/**
 * The studio's roster section: what the set amounts to, and the way into the catalogue.
 *
 * The sheet count is the case worth pinning, because it is the figure a reader plans generations by
 * and the one a summary could get wrong on its own: it has to count the overlay sheet, and it has to
 * be the series the compiler cuts rather than icons divided by sixteen.
 */
function iconStudio(picks: readonly string[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: { ...defaultSubjectFor('ICON'), icons: { look: 'ISOLATED_MARK', picks } },
  });
}

/** The first `count` catalogue entries drawn once each, in catalogue order. */
function singles(count: number): string[] {
  return ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
    .filter((entry) => entry.states === undefined)
    .slice(0, count)
    .map((entry) => entry.id);
}

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
  useUIStore.setState({ isIconCatalogueModalOpen: false });
});

describe('IconRosterSection', () => {
  it('counts twenty icons as the overlay sheet and two icon sheets', () => {
    iconStudio(singles(20));
    render(<IconRosterSection />);

    expect(
      screen.getByText(
        '20 icons, drawn as 20 of the 320 components a set can hold, on 3 sheets: the overlay sheet and 2 icon sheets.',
      ),
    ).toBeInTheDocument();
  });

  it('counts each kind of icon on the set', () => {
    iconStudio(['heal-minor', 'heal-major', 'thermal-strike', 'emote-wave', 'mount-skiff', 'system-bags']);
    render(<IconRosterSection />);

    expect(
      screen.getByText(
        'Items and consumables: 2. Spells and abilities: 1. Emotes and chat: 1. Mounts and pets: 1. Professions: 0. Interface and system: 1.',
      ),
    ).toBeInTheDocument();
  });

  it('opens the catalogue', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['heal-minor']);
    render(<IconRosterSection />);

    await user.click(screen.getByRole('button', { name: /open the icon catalogue/i }));

    expect(useUIStore.getState().isIconCatalogueModalOpen).toBe(true);
  });

  it('keeps the set’s figures in its header while folded', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(singles(17));
    render(<IconRosterSection />);

    await user.click(screen.getByRole('heading', { name: 'Icons on this set' }));

    expect(screen.getByText('17 icons · 3 sheets')).toBeInTheDocument();
  });

  it('offers the two looks as one named group, the set’s own pressed', () => {
    iconStudio(['heal-minor']);
    render(<IconRosterSection />);

    const group = screen.getByRole('group', { name: 'Look' });
    expect(within(group).getByRole('button', { name: 'Isolated mark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Full-bleed tile' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Guidance: Look' })).toBeInTheDocument();
  });

  it('draws the set in the look pressed, as a step Undo takes back', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['heal-minor']);
    useSubjectStore.getState().openStudio();
    render(<IconRosterSection />);

    await user.click(screen.getByRole('button', { name: 'Full-bleed tile' }));

    expect(useSubjectStore.getState().subject.icons?.look).toBe('FULL_BLEED_TILE');
    expect(screen.getByRole('button', { name: 'Full-bleed tile' })).toHaveAttribute('aria-pressed', 'true');
    act(() => {
      useSubjectStore.getState().undoStudio();
    });
    expect(screen.getByRole('button', { name: 'Isolated mark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reaches the look from the keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['heal-minor']);
    render(<IconRosterSection />);

    screen.getByRole('button', { name: 'Isolated mark' }).focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Full-bleed tile' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(useSubjectStore.getState().subject.icons?.look).toBe('FULL_BLEED_TILE');
  });

  it('renders nothing for a subject with no roster', () => {
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    const { container } = render(<IconRosterSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
