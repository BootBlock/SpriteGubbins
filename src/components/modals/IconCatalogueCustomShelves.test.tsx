import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { RELIC, TOGGLE, customPick } from '../../test/customIcons.ts';
import {
  iconLibrary,
  iconStudio,
  libraryEntries,
  rosterIds,
  savedIcon,
} from '../../test/iconLibraryStudio.ts';
import { customIconDraftOf } from '../../utils/customIconDraftOf.ts';
import {
  buttonReading,
  control,
  formNamed,
  queryButtonReading,
  queryControl,
  shelfHeaded,
} from '../../test/catalogueControls.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';

/**
 * The reader's own icons in the catalogue dialog: the button that opens the form, the shelves that hold
 * what it adds — after the catalogue's last shelf of each kind, marked as theirs — each row's Edit, and
 * the form's own Escape, with focus returned where the reader was. What the project's library adds —
 * unticking, ticking again, deleting and keeping — is `IconCatalogueLibrary.test.tsx`'s.
 */

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const addButton = () => buttonReading('Add your own icon');

beforeEach(async () => {
  backend = new LocalStorageBackend(createMemoryStorage());
  await iconLibrary(backend, []);
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isIconCatalogueModalOpen: true });
});

describe('the catalogue dialog’s own icons', () => {
  it('opens the form, puts what it adds on the set and in the library, and returns focus', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);
    expect(addButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(addButton());
    expect(addButton()).toHaveAttribute('aria-expanded', 'true');
    formNamed('Add your own icon');
    await user.type(control('Role', 'textbox'), RELIC.role);
    await user.type(control('Look', 'textbox'), RELIC.look);
    await user.click(buttonReading('Add to your set'));

    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    await waitFor(() => {
      expect(addButton()).toHaveFocus();
    });
    expect(document.querySelector('form')).toBeNull();
    expect(libraryEntries()).toEqual([RELIC]);
    await waitFor(async () => {
      expect((await backend.listCustomIcons()).map((icon) => icon.entry)).toEqual([RELIC]);
    });
    const row = control(RELIC.role, 'checkbox');
    expect(shelfHeaded('Items and consumables: your own')).toContainElement(row);
    expect(row).toBeChecked();
    expect(row).toHaveAccessibleDescription(RELIC.look);
  });

  it('shelves each kind’s own icons after the catalogue’s last shelf of that kind', () => {
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC), customPick(TOGGLE)]);
    render(<IconCatalogueContents />);

    const headings = Array.from(document.querySelectorAll('h3'), (heading) => heading.textContent);
    const ownItems = headings.findIndex((text) => text?.startsWith('Items and consumables: your own'));
    const firstSpells = headings.findIndex((text) => text?.startsWith('Kinetic attacks'));
    const ownSystem = headings.findIndex((text) => text?.startsWith('Interface and system: your own'));
    expect(ownItems).toBeGreaterThan(0);
    expect(firstSpells).toBe(ownItems + 1);
    expect(ownSystem).toBe(headings.length - 1);
  });

  it('opens a row in the form with Edit, and saves the change to the set and the library', async () => {
    const user = userEvent.setup({ delay: null });
    await iconLibrary(backend, [savedIcon(RELIC)]);
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Edit ${RELIC.role}`, 'button'));
    const look = control('Look', 'textbox');
    expect(look).toHaveValue(RELIC.look);
    await user.clear(look);
    await user.type(look, 'a cracked keycard');
    await user.click(buttonReading('Save changes'));

    const changed = { ...RELIC, look: 'a cracked keycard' };
    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([customPick(changed)]);
    await waitFor(() => {
      expect(control(`Edit ${RELIC.role}`, 'button')).toHaveFocus();
    });
    // The same library row, changed rather than joined by a second.
    await waitFor(async () => {
      expect(await backend.listCustomIcons()).toEqual([savedIcon(changed)]);
    });
  });

  it.each([
    [
      'Clear all',
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(buttonReading('Clear all'));
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
    'closes a form whose entry %s takes off a set the library does not hold it for',
    async (_route, leave) => {
      const user = userEvent.setup({ delay: null });
      iconStudio(cataloguePicks(['heal-minor']));
      useSubjectStore.getState().addCustomIcon(customIconDraftOf(RELIC), []);
      render(<IconCatalogueContents />);

      await user.click(control(`Edit ${RELIC.role}`, 'button'));
      await user.type(control('Look', 'textbox'), ' and a chain');
      await leave(user);

      expect(rosterIds()).not.toContain(RELIC.id);
      expect(queryButtonReading('Save changes')).toBeNull();
      expect(addButton()).toHaveAttribute('aria-expanded', 'false');

      // Bringing the entry back does not bring back a form for it.
      act(() => {
        useSubjectStore.getState().undoStudio();
      });
      expect(queryButtonReading('Save changes')).toBeNull();
    },
  );

  it('keeps a form open when Clear all takes its entry off the set and the library still holds it', async () => {
    const user = userEvent.setup({ delay: null });
    await iconLibrary(backend, [savedIcon(RELIC)]);
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Edit ${RELIC.role}`, 'button'));
    await user.click(buttonReading('Clear all'));

    expect(rosterIds()).toEqual([]);
    expect(buttonReading('Save changes')).toBeInTheDocument();
  });

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
    await user.type(control('Role', 'textbox'), 'Half-written relic');
    const insideForm = fireEvent.keyDown(control('Role', 'textbox'), { key: 'Escape' });

    expect(insideForm).toBe(false);
    expect(reachedDialog).not.toHaveBeenCalled();
    expect(queryControl('Role')).toBeNull();
    await waitFor(() => {
      expect(addButton()).toHaveFocus();
    });

    // Focus moves off the button first, so its guidance card is not open to take this Escape itself.
    const search = control('Search the catalogue', 'textbox');
    await user.click(search);
    const outsideForm = fireEvent.keyDown(search, { key: 'Escape' });
    expect(outsideForm).toBe(true);
    expect(reachedDialog).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', onKey);
  });

  it('says under a row the library does not hold that unticking it takes it away', () => {
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    expect(control(RELIC.role, 'checkbox')).toHaveAccessibleDescription(
      `${RELIC.look} ${CUSTOM_ICON_NOTICES.setOnly}`,
    );
    expect(control(`Save ${RELIC.role} to library`, 'button')).toBeInTheDocument();
  });
});
