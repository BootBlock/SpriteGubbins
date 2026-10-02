import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { CUSTOM_ICON_REFUSALS } from '../../constants/iconCatalogue/customIconRefusals.ts';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { RELIC, SPELL, TOGGLE, customPick } from '../../test/customIcons.ts';
import {
  HARBOUR,
  iconLibrary,
  iconStudio,
  libraryEntries,
  rosterIds,
  savedIcon,
} from '../../test/iconLibraryStudio.ts';
import {
  buttonReading,
  control,
  queryButtonReading,
  queryControl,
  shelfHeaded,
} from '../../test/catalogueControls.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';

/**
 * The project's icon library in the catalogue dialog: an untick that leaves the library's copy, a tick
 * that brings it back, a Delete that leaves every set's copy, a Save to library for an icon only the set
 * holds, a change made to a library entry the set does not hold, and the project the shelves show.
 */

let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

const addButton = () => buttonReading('Add your own icon');

beforeEach(async () => {
  backend = new LocalStorageBackend(createMemoryStorage());
  await iconLibrary(backend, [savedIcon(RELIC), savedIcon(SPELL), savedIcon(TOGGLE, HARBOUR.id)]);
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isIconCatalogueModalOpen: true });
});

describe('the catalogue dialog’s icon library', () => {
  it('unticks an icon off the set and keeps it in the library, and ticks it back as it was', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    render(<IconCatalogueContents />);
    expect(control(RELIC.role)).toBeChecked();
    expect(control(SPELL.role)).not.toBeChecked();

    await user.click(control(RELIC.role));
    expect(rosterIds()).toEqual(['heal-minor']);
    expect(control(RELIC.role)).not.toBeChecked();
    expect(libraryEntries()).toEqual([SPELL, RELIC]);
    expect(useUIStore.getState().toastMessage).toBeNull();

    await user.click(control(RELIC.role));
    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([
      ...cataloguePicks(['heal-minor']),
      customPick(RELIC),
    ]);

    // Each is one act on the studio's stack, and the library is not on it.
    useSubjectStore.getState().undoStudio();
    useSubjectStore.getState().undoStudio();
    expect(rosterIds()).toEqual(['heal-minor', RELIC.id]);
    expect(libraryEntries()).toEqual([SPELL, RELIC]);
  });

  it('ticks a library entry the set did not hold onto it, at the end of its kind', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);

    await user.click(control(SPELL.role));
    expect(rosterIds()).toEqual(['heal-minor', SPELL.id]);
  });

  it('deletes an entry from the library after asking, and leaves the set’s copy', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Delete ${RELIC.role} from library`));
    const keep = control(`Cancel — keep ${RELIC.role} in your library`);
    expect(keep).toHaveFocus();
    await user.click(keep);
    expect(libraryEntries()).toContainEqual(RELIC);

    await user.click(control(`Delete ${RELIC.role} from library`));
    await user.click(buttonReading(`Delete “${RELIC.role}”`));

    await waitFor(() => {
      expect(libraryEntries()).toEqual([SPELL]);
    });
    expect((await backend.listCustomIcons()).map((icon) => icon.entry.id)).not.toContain(RELIC.id);
    expect(useUIStore.getState().toastMessage).toBe(CUSTOM_ICON_NOTICES.deleted(RELIC.role));
    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([customPick(RELIC)]);
    expect(control(RELIC.role)).toBeChecked();
    expect(control(RELIC.role)).toHaveAccessibleDescription(`${RELIC.look} ${CUSTOM_ICON_NOTICES.setOnly}`);
  });

  it('takes an unticked entry off the shelf once it is deleted', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);

    await user.click(control(`Delete ${SPELL.role} from library`));
    await user.click(buttonReading(`Delete “${SPELL.role}”`));

    await waitFor(() => {
      expect(queryControl(SPELL.role)).toBeNull();
    });
  });

  it('saves an icon only the set holds into the library, and the row stops warning', async () => {
    const user = userEvent.setup({ delay: null });
    const relic = { ...RELIC, id: 'harbour-relic', role: 'Harbour relic' };
    iconStudio([customPick(relic)]);
    render(<IconCatalogueContents />);

    await user.click(control(`Save ${relic.role} to library`));

    await waitFor(() => {
      expect(libraryEntries()).toContainEqual(relic);
    });
    expect(useUIStore.getState().toastMessage).toBe(CUSTOM_ICON_NOTICES.kept(relic.role));
    expect(control(relic.role)).toHaveAccessibleDescription(relic.look);
  });

  it('unticks an icon only the set holds as a removal, says Undo is the way back, and Undo is', async () => {
    const user = userEvent.setup({ delay: null });
    const relic = { ...RELIC, id: 'harbour-relic', role: 'Harbour relic' };
    iconStudio([...cataloguePicks(['heal-minor']), customPick(relic)]);
    render(<IconCatalogueContents />);

    await user.click(control(relic.role));

    expect(rosterIds()).toEqual(['heal-minor']);
    expect(queryControl(relic.role)).toBeNull();
    expect(useUIStore.getState().toastMessage).toBe(CUSTOM_ICON_NOTICES.removed(relic.role));
    expect(addButton()).toHaveFocus();

    useSubjectStore.getState().undoStudio();
    expect(rosterIds()).toEqual(['heal-minor', relic.id]);
  });

  it('says where the set’s copy is not the library’s, and a re-tick draws the library’s', async () => {
    const user = userEvent.setup({ delay: null });
    const older = { ...RELIC, look: 'an older keycard' };
    iconStudio([customPick(older)]);
    render(<IconCatalogueContents />);
    expect(control(RELIC.role)).toHaveAccessibleDescription(`${older.look} ${CUSTOM_ICON_NOTICES.differs}`);

    await user.click(control(RELIC.role));
    await user.click(control(RELIC.role));

    expect(useSubjectStore.getState().subject.icons?.picks).toEqual([customPick(RELIC)]);
    expect(control(RELIC.role)).toHaveAccessibleDescription(RELIC.look);
  });

  it('changes a library entry the set does not hold in the library alone', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(cataloguePicks(['heal-minor']));
    render(<IconCatalogueContents />);

    await user.click(control(`Edit ${SPELL.role}`));
    const look = control('Look');
    await user.clear(look);
    await user.type(look, 'a folding lattice of sparks');
    await user.click(buttonReading('Save changes'));

    await waitFor(() => {
      expect(libraryEntries()).toContainEqual({ ...SPELL, look: 'a folding lattice of sparks' });
    });
    expect(rosterIds()).toEqual(['heal-minor']);
    expect(queryButtonReading('Save changes')).toBeNull();
  });

  it('refuses a new icon whose slot an unticked library entry holds', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);

    await user.click(addButton());
    await user.type(control('Role'), SPELL.role);
    await user.type(control('Look'), 'another lattice');
    await user.click(buttonReading('Add to your set'));

    expect(rosterIds()).toEqual([]);
    expect(control('Role')).toHaveAccessibleDescription(
      CUSTOM_ICON_REFUSALS.taken(SPELL.id, `your library’s “${SPELL.role}”`),
    );
  });

  it('shows the chosen project’s library alone, and adds to the project chosen', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(RELIC)]);
    render(<IconCatalogueContents />);

    await user.selectOptions(control('Library'), HARBOUR.id);

    expect(control(TOGGLE.role)).not.toBeChecked();
    expect(queryControl(SPELL.role)).toBeNull();
    // The set's relic stays on the set, and says this project's library does not hold it.
    expect(control(RELIC.role)).toHaveAccessibleDescription(`${RELIC.look} ${CUSTOM_ICON_NOTICES.setOnly}`);

    await user.click(addButton());
    await user.type(control('Role'), 'Dock crane');
    await user.type(control('Look'), 'a rusted crane hook');
    await user.click(buttonReading('Add to your set'));

    await waitFor(() => {
      expect(libraryEntries(HARBOUR.id).map((entry) => entry.id)).toContain('dock-crane');
    });
    expect(libraryEntries().map((entry) => entry.id)).not.toContain('dock-crane');
  });

  it('finds an unticked library entry by search, and hides it under Ticked only', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);

    await user.type(control('Search the catalogue'), 'power lines');
    expect(shelfHeaded('Spells and abilities: your own')).toContainElement(control(SPELL.role));
    expect(control(SPELL.role)).not.toBeChecked();

    await user.click(control('Ticked only'));
    expect(queryControl(SPELL.role)).toBeNull();
  });
});
