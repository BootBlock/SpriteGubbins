import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_PROJECT_ID } from '../../constants/projects.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { HELD_ELSEWHERE_REFUSAL, HeldElsewhereBackend } from '../../db/heldElsewhereBackend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { RELIC, SPELL, customPick } from '../../test/customIcons.ts';
import { HARBOUR, iconLibrary, iconStudio, libraryEntries, savedIcon } from '../../test/iconLibraryStudio.ts';
import type { SavedCustomIcon } from '../../types/savedCustomIcon.ts';
import { buttonReading, control, formNamed, queryButtonReading } from '../../test/catalogueControls.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';

/**
 * The library's edges in the catalogue dialog: a change to a library icon the set does not hold keeps
 * its form, and the reader's draft, until storage has answered; a Delete question belongs to one
 * project's row and never stands over another's; and a confirmed Delete on a ticked row hands the
 * keyboard to the row's own Save to library.
 */

/** A fallback backend whose library saves wait to be released. */
class HeldSaves extends LocalStorageBackend {
  private release: () => void = () => undefined;
  private gate = Promise.resolve();

  hold(): void {
    this.gate = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  let(): void {
    this.release();
  }

  override async saveCustomIcon(icon: SavedCustomIcon): Promise<void> {
    await this.gate;
    return super.saveCustomIcon(icon);
  }
}

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const changeForm = () => formNamed(`Change “${SPELL.role}”`);

beforeEach(() => {
  backend = new HeldSaves(createMemoryStorage());
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isIconCatalogueModalOpen: true });
});

describe('a change to a library icon the set does not hold', () => {
  async function renameSpell(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await iconLibrary(backend, [savedIcon(SPELL)]);
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);
    await user.click(control(`Edit ${SPELL.role}`, 'button'));
    await user.clear(control('Role', 'textbox'));
    await user.type(control('Role', 'textbox'), 'Grid fracture');
  }

  it('keeps the form and the draft where storage refuses the write', async () => {
    const user = userEvent.setup({ delay: null });
    await renameSpell(user);
    backend = new HeldElsewhereBackend();

    await user.click(buttonReading('Save changes'));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe(HELD_ELSEWHERE_REFUSAL);
    });
    expect(changeForm()).toContainElement(control('Role', 'textbox'));
    expect(control('Role', 'textbox')).toHaveValue('Grid fracture');
    expect(changeForm()).toContainElement(document.activeElement as HTMLElement);
    expect(libraryEntries()).toEqual([SPELL]);
  });

  it('closes the form only once the write has landed', async () => {
    const user = userEvent.setup({ delay: null });
    await renameSpell(user);
    const held = backend as HeldSaves;
    held.hold();

    await user.click(buttonReading('Save changes'));
    expect(control('Role', 'textbox')).toHaveValue('Grid fracture');

    held.let();
    await waitFor(() => {
      expect(document.querySelector('form')).toBeNull();
    });
    expect(libraryEntries().map((entry) => entry.role)).toEqual(['Grid fracture']);
  });
});

describe('the Delete question on a library row', () => {
  it('drops when the dialog moves to a project holding the same slot, and deletes nothing there', async () => {
    const user = userEvent.setup({ delay: null });
    await iconLibrary(backend, [savedIcon(RELIC), savedIcon(RELIC, HARBOUR.id)]);
    iconStudio([]);
    render(<IconCatalogueContents />);

    await user.click(control(`Delete ${RELIC.role} from library`, 'button'));
    expect(buttonReading(`Delete “${RELIC.role}”`)).toBeInTheDocument();
    await user.selectOptions(control('Library', 'combobox'), HARBOUR.id);

    expect(queryButtonReading(`Delete “${RELIC.role}”`)).toBeNull();
    expect(control(`Delete ${RELIC.role} from library`, 'button')).toBeInTheDocument();
    expect(libraryEntries(HARBOUR.id)).toEqual([RELIC]);
  });

  it('does not come back once the row is saved to the other project, nor on the way back', async () => {
    const user = userEvent.setup({ delay: null });
    await iconLibrary(backend, [savedIcon(RELIC)]);
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Delete ${RELIC.role} from library`, 'button'));
    await user.selectOptions(control('Library', 'combobox'), HARBOUR.id);
    await user.click(control(`Save ${RELIC.role} to library`, 'button'));
    await waitFor(() => {
      expect(libraryEntries(HARBOUR.id)).toEqual([RELIC]);
    });

    expect(queryButtonReading(`Delete “${RELIC.role}”`)).toBeNull();
    await user.selectOptions(control('Library', 'combobox'), DEFAULT_PROJECT_ID);
    expect(queryButtonReading(`Delete “${RELIC.role}”`)).toBeNull();
  });

  it('hands the keyboard to the row’s Save to library once a ticked icon is deleted', async () => {
    const user = userEvent.setup({ delay: null });
    await iconLibrary(backend, [savedIcon(RELIC)]);
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Delete ${RELIC.role} from library`, 'button'));
    await user.click(buttonReading(`Delete “${RELIC.role}”`));

    await waitFor(() => {
      expect(control(`Save ${RELIC.role} to library`, 'button')).toHaveFocus();
    });
  });
});
