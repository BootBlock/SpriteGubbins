import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { RELIC, TOGGLE, customPick, draftOf } from '../../test/customIcons.ts';
import type { IconPick } from '../../types/iconRoster.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';

/**
 * The reader's own icons in the catalogue dialog: the button that opens the form, the shelves that hold
 * what it adds — after the catalogue's last shelf of each kind, ticked and marked as theirs — and each
 * row's Edit and Remove, with focus returned where the reader was.
 */

function iconStudio(picks: readonly IconPick[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: { ...defaultSubjectFor('ICON'), icons: { look: 'ISOLATED_MARK', picks } },
  });
  useSubjectStore.getState().openStudio();
}

function ids(): readonly string[] {
  return (useSubjectStore.getState().subject.icons?.picks ?? []).map(iconPickId);
}

const addButton = () => screen.getByRole('button', { name: 'Add your own icon' });

beforeEach(() => {
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isIconCatalogueModalOpen: true });
});

describe('the catalogue dialog’s own icons', () => {
  it('opens the form, shelves what it adds as the reader’s, and returns focus to the button', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);
    expect(addButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(addButton());
    expect(addButton()).toHaveAttribute('aria-expanded', 'true');
    await user.type(screen.getByRole('textbox', { name: 'Role' }), RELIC.role);
    await user.type(screen.getByRole('textbox', { name: 'Look' }), RELIC.look);
    await user.click(screen.getByRole('button', { name: 'Add to your set' }));

    expect(ids()).toEqual(['heal-minor', RELIC.id]);
    expect(screen.queryByRole('form')).toBeNull();
    const shelf = screen.getByRole('region', { name: /Items and consumables: your own/ });
    const row = within(shelf).getByRole('checkbox', { name: RELIC.role });
    expect(row).toBeChecked();
    expect(row).toHaveAccessibleDescription(`${RELIC.look} ${CUSTOM_ICON_NOTICES.yours}`);
    await waitFor(() => {
      expect(addButton()).toHaveFocus();
    });
  });

  it('shelves each kind’s own icons after the catalogue’s last shelf of that kind', () => {
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC), customPick(TOGGLE)]);
    render(<IconCatalogueContents />);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    const ownItems = headings.findIndex((text) => text?.startsWith('Items and consumables: your own'));
    const firstSpells = headings.findIndex((text) => text?.startsWith('Kinetic attacks'));
    const ownSystem = headings.findIndex((text) => text?.startsWith('Interface and system: your own'));
    expect(ownItems).toBeGreaterThan(0);
    expect(firstSpells).toBe(ownItems + 1);
    expect(ownSystem).toBe(headings.length - 1);
  });

  it('opens a row in the form with Edit, and saves the change in place', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(screen.getByRole('button', { name: `Edit ${RELIC.role}` }));
    const look = screen.getByRole('textbox', { name: 'Look' });
    expect(look).toHaveValue(RELIC.look);
    await user.clear(look);
    await user.type(look, 'a cracked keycard');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([
      customPick({ ...RELIC, look: 'a cracked keycard' }),
    ]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: `Edit ${RELIC.role}` })).toHaveFocus();
    });
  });

  it('removes a row with Remove, says Undo brings it back, and Undo does', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(screen.getByRole('button', { name: `Remove ${RELIC.role}` }));

    expect(ids()).toEqual(['heal-minor']);
    expect(useUIStore.getState().toastMessage).toBe(CUSTOM_ICON_NOTICES.removed(RELIC.role));
    expect(addButton()).toHaveFocus();

    useSubjectStore.getState().undoStudio();
    expect(ids()).toEqual(['heal-minor', RELIC.id]);
  });

  it.each([
    [
      'Clear all',
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'Clear all' }));
      },
    ],
    [
      'an undo',
      async () => {
        act(() => {
          useSubjectStore.getState().undoStudio();
        });
      },
    ],
  ])(
    'closes a form whose entry %s takes off the set, so no change is saved to nothing',
    async (_route, leave) => {
      const user = userEvent.setup({ delay: null });
      iconStudio(cataloguePicks(['heal-minor']));
      useSubjectStore.getState().addCustomIcon(draftOf(RELIC));
      render(<IconCatalogueContents />);

      await user.click(screen.getByRole('button', { name: `Edit ${RELIC.role}` }));
      await user.type(screen.getByRole('textbox', { name: 'Look' }), ' and a chain');
      await leave(user);

      expect(ids()).not.toContain(RELIC.id);
      expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
      expect(addButton()).toHaveAttribute('aria-expanded', 'false');

      // Bringing the entry back does not bring back a form for it.
      act(() => {
        useSubjectStore.getState().undoStudio();
      });
      expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    },
  );

  it('cancels the form alone on Escape inside it, and leaves Escape outside it to the dialog', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);
    const reachedDialog = vi.fn();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') reachedDialog();
    };
    document.addEventListener('keydown', onKey);

    await user.click(addButton());
    await user.type(screen.getByRole('textbox', { name: 'Role' }), 'Half-written relic');
    const insideForm = fireEvent.keyDown(screen.getByRole('textbox', { name: 'Role' }), { key: 'Escape' });

    expect(insideForm).toBe(false);
    expect(reachedDialog).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Role' })).toBeNull();
    await waitFor(() => {
      expect(addButton()).toHaveFocus();
    });

    // Focus moves off the button first, so its guidance card is not open to take this Escape itself.
    const search = screen.getByRole('textbox', { name: 'Search the catalogue' });
    await user.click(search);
    const outsideForm = fireEvent.keyDown(search, { key: 'Escape' });
    expect(outsideForm).toBe(true);
    expect(reachedDialog).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', onKey);
  });
});
