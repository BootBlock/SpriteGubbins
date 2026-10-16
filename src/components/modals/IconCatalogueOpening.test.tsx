import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { iconLibrary, iconStudio } from '../../test/iconLibraryStudio.ts';
import { buttonReading, control, formNamed, queryControl } from '../../test/catalogueControls.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';

/**
 * Where the catalogue dialog opens: on its shelves from *Open the icon catalogue*, and on the form for an
 * icon of the reader's own from the studio's *Add your own icon* (issue #504). The case worth pinning
 * is the second press after the first: the opening instruction outlives the dialog in the store, so a
 * later plain opening that inherited it would put a form in front of a reader who only wanted to browse.
 */

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

beforeEach(async () => {
  backend = new LocalStorageBackend(createMemoryStorage());
  await iconLibrary(backend, []);
  iconStudio(cataloguePicks(['heal-minor']));
  useUIStore.setState({ isIconCatalogueModalOpen: false, iconCatalogueOpensOn: 'SHELVES' });
});

describe('where the icon catalogue opens', () => {
  it('opens at the form, focused on its first field, from the studio’s Add your own icon', async () => {
    const user = userEvent.setup({ delay: null });
    act(() => {
      useUIStore.getState().openNewIconForm();
    });
    render(<IconCatalogueContents />);

    formNamed('Add your own icon');
    expect(control('Role', 'textbox')).toHaveFocus();
    expect(buttonReading('Add your own icon')).toHaveAttribute('aria-expanded', 'true');

    await user.click(buttonReading('Cancel'));
    expect(queryControl('Role')).toBeNull();
    await waitFor(() => {
      expect(buttonReading('Add your own icon')).toHaveFocus();
    });
  });

  it('opens on the shelves from Open the icon catalogue, even after an opening at the form', () => {
    act(() => {
      useUIStore.getState().openNewIconForm();
      useUIStore.getState().toggleIconCatalogueModal();
      useUIStore.getState().toggleIconCatalogueModal();
    });
    expect(useUIStore.getState().isIconCatalogueModalOpen).toBe(true);
    render(<IconCatalogueContents />);

    expect(queryControl('Role')).toBeNull();
    expect(buttonReading('Add your own icon')).toHaveAttribute('aria-expanded', 'false');
  });
});
