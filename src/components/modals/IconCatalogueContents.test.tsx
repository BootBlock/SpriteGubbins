import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { ICON_CATALOGUE_GROUPS, iconCatalogueEntry } from '../../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { iconLookText } from '../../utils/iconLookText.ts';
import { buttonReading, control, queryControl } from '../../test/catalogueControls.ts';
import { IconCatalogueContents } from './IconCatalogueContents.tsx';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import { iconPickId } from '../../utils/iconPickId.ts';

/**
 * The catalogue dialog: rows that tick into the studio's roster, group buttons that tick what the
 * filters show, filters that hide rows without touching the set, and a footer that counts the set the
 * way the sheet list does.
 *
 * Driven through the real store rather than a spy on `toggleIcons`, so a tick is asserted where it
 * lands — the subject's roster — and in catalogue order. Controls are found through
 * `test/catalogueControls.ts` rather than role queries, which over every catalogue row run past the
 * test time limit on a slow runner.
 */
const WORLD = 'Near-Future Cyberpunk';

function iconStudio(picks: readonly string[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: {
      ...defaultSubjectFor('ICON'),
      setting: WORLD,
      icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(picks) },
    },
  });
  useSubjectStore.getState().openStudio();
}

function picks(): readonly string[] {
  return (useSubjectStore.getState().subject.icons?.picks ?? []).map(iconPickId);
}

function role(id: string): string {
  const entry = iconCatalogueEntry(id);
  if (entry === undefined) throw new Error(`No catalogue entry ${id}`);
  return entry.role;
}

const RESTORATIVES = ICON_CATALOGUE_GROUPS.find((group) => group.id === 'restoratives');

beforeEach(() => {
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isIconCatalogueModalOpen: true });
});

describe('IconCatalogueContents', () => {
  it('lists every entry as a checkbox named by its role, described by its look in this world', () => {
    iconStudio([]);
    render(<IconCatalogueContents />);

    const checkboxes = Array.from(document.querySelectorAll('input[type=checkbox]')).filter((box) =>
      box.getAttribute('aria-describedby'),
    );
    const entries = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries);
    expect(checkboxes).toHaveLength(entries.length);

    const heal = iconCatalogueEntry('heal-minor');
    if (heal === undefined) throw new Error('No heal-minor');
    expect(control(heal.role, 'checkbox')).toHaveAccessibleDescription(iconLookText(heal, WORLD));
  });

  it('ticks and unticks an icon in the studio’s roster', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['system-bags']);
    render(<IconCatalogueContents />);

    await user.click(control(role('heal-minor'), 'checkbox'));
    expect(picks()).toEqual(['heal-minor', 'system-bags']);
    expect(control(role('heal-minor'), 'checkbox')).toBeChecked();

    await user.click(control(role('system-bags'), 'checkbox'));
    expect(picks()).toEqual(['heal-minor']);
  });

  it('ticks and unticks a whole group from its heading', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);
    if (RESTORATIVES === undefined) throw new Error('No restoratives group');

    await user.click(control(`Tick all ${RESTORATIVES.label}`, 'button'));
    expect(picks()).toEqual(RESTORATIVES.entries.map((entry) => entry.id));

    await user.click(control(`Untick all ${RESTORATIVES.label}`, 'button'));
    expect(picks()).toEqual([]);
  });

  it('ticks only what the search shows when a group is ticked under one', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);
    if (RESTORATIVES === undefined) throw new Error('No restoratives group');

    await user.type(control('Search the catalogue', 'textbox'), 'healing consumable');
    await user.click(control(`Tick all ${RESTORATIVES.label}`, 'button'));

    // The three healing tiers and the healing-over-time patch match; the mana and stamina rows do not.
    expect(picks()).toEqual(['heal-minor', 'heal-standard', 'heal-major', 'regeneration']);
  });

  it('filters rows by search, kind and ticked only, without touching the set', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['heal-minor', 'system-bags']);
    render(<IconCatalogueContents />);

    await user.selectOptions(control('Kind', 'combobox'), 'SYSTEM');
    expect(queryControl(role('heal-minor'))).toBeNull();
    expect(control(role('system-bags'), 'checkbox')).toBeInTheDocument();

    await user.selectOptions(control('Kind', 'combobox'), 'ALL');
    await user.click(control('Ticked only', 'checkbox'));
    const rows = Array.from(document.querySelectorAll('input[type=checkbox]'))
      .filter((box) => box.getAttribute('aria-describedby'))
      .map((box) => box.closest('li')?.querySelector('label')?.textContent);
    expect(rows).toEqual([role('heal-minor'), role('system-bags')]);

    await user.type(control('Search the catalogue', 'textbox'), 'no such icon');
    expect(screen.getByText('No icon matches that search and those filters.')).toBeInTheDocument();
    expect(picks()).toEqual(['heal-minor', 'system-bags']);
  });

  it('offers the school filter for spells alone, and drops the school once the kind moves off them', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);
    const kind = control('Kind', 'combobox');
    expect(queryControl('School')).toBeNull();

    await user.selectOptions(kind, 'SPELL');
    await user.selectOptions(control('School', 'combobox'), 'THERMAL');
    const strike = iconCatalogueEntry('thermal-strike');
    if (strike === undefined) throw new Error('No thermal-strike');
    const look = iconLookText(strike, WORLD);
    expect(look).toContain('— thermal school, its dominant colour orange #F97316');
    expect(control(strike.role, 'checkbox')).toHaveAccessibleDescription(look);
    expect(queryControl(role('cryo-strike'))).toBeNull();
    expect(queryControl(role('heal-minor'))).toBeNull();

    await user.selectOptions(kind, 'ALL');
    expect(queryControl('School')).toBeNull();
    expect(control(role('cryo-strike'), 'checkbox')).toBeInTheDocument();

    await user.selectOptions(kind, 'SPELL');
    expect(control('School', 'combobox')).toHaveValue('ALL');
    expect(picks()).toEqual([]);
  });

  it('names the school filter’s options as the subject’s world names the schools', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    useSubjectStore.setState((state) => ({ subject: { ...state.subject, setting: 'High Fantasy' } }));
    render(<IconCatalogueContents />);

    await user.selectOptions(control('Kind', 'combobox'), 'SPELL');
    expect(
      within(control('School', 'combobox')).getByRole('option', { name: 'Fire (thermal)' }),
    ).toBeInTheDocument();
  });

  it('says an empty set is the overlay sheet alone', () => {
    iconStudio([]);
    render(<IconCatalogueContents />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'No icons are ticked, so the series is the overlay sheet alone.',
    );
  });

  it('counts the set in its footer as the sheet list does, and announces it', async () => {
    const user = userEvent.setup({ delay: null });
    // Twenty one-component icons once the last is ticked: sixteen on the first icon sheet, four on the
    // second.
    const singles = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
      .filter((entry) => entry.states === undefined)
      .slice(0, 20);
    const last = singles.at(-1);
    if (last === undefined) throw new Error('The catalogue is shorter than twenty icons');
    iconStudio(singles.slice(0, 19).map((entry) => entry.id));
    render(<IconCatalogueContents />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      '19 icons, drawn as 19 of the 320 components a set can hold, on 3 sheets',
    );

    await user.click(control(last.role, 'checkbox'));
    expect(status).toHaveTextContent(
      '20 icons, drawn as 20 of the 320 components a set can hold, on 3 sheets: the overlay sheet and 2 icon sheets.',
    );
  });

  it('clears the whole set, the hidden rows included, as one step Undo takes back', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio(['heal-minor', 'system-bags']);
    render(<IconCatalogueContents />);

    await user.type(control('Search the catalogue', 'textbox'), 'healing consumable');
    await user.click(buttonReading('Clear all'));
    expect(picks()).toEqual([]);

    useSubjectStore.getState().undoStudio();
    expect(picks()).toEqual(['heal-minor', 'system-bags']);
  });

  it('closes from Done', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([]);
    render(<IconCatalogueContents />);

    await user.click(buttonReading('Done'));

    expect(useUIStore.getState().isIconCatalogueModalOpen).toBe(false);
  });
});
