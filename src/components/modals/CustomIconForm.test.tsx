import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { CUSTOM_ICON_FAMILY_SIZE } from '../../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_REFUSALS } from '../../constants/iconCatalogue/customIconRefusals.ts';
import { CUSTOM_ICON_WARNING_TEXT } from '../../constants/iconCatalogue/customIconWarningText.ts';
import { cataloguePicks } from '../../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { FAMILY, RELIC, customPick } from '../../test/customIcons.ts';
import type { IconPick } from '../../types/iconRoster.ts';
import { CustomIconForm } from './CustomIconForm.tsx';

/**
 * The form for an icon of the reader's own, driven through the real store: what it adds, what it
 * refuses and says why beside the field, what it warns of and adds anyway, and where focus goes.
 */

function iconStudio(picks: readonly IconPick[] = cataloguePicks(['heal-minor'])): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: {
      ...defaultSubjectFor('ICON'),
      setting: 'High Fantasy',
      icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks },
    },
  });
  useSubjectStore.getState().openStudio();
}

function picks(): readonly IconPick[] {
  return useSubjectStore.getState().subject.icons?.picks ?? [];
}

const role = () => screen.getByRole('textbox', { name: 'Role' });
const look = () => screen.getByRole('textbox', { name: 'Look' });
const add = () => screen.getByRole('button', { name: 'Add to your set' });
const member = (position: number) => screen.getByRole('textbox', { name: `Variant ${String(position)}` });
const memberLook = (position: number) =>
  screen.getByRole('textbox', { name: `Variant ${String(position)}’s look` });
const remove = (position: number) =>
  screen.getByRole('button', { name: `Remove variant ${String(position)}` });

beforeEach(() => {
  iconStudio();
});

describe('CustomIconForm — adding', () => {
  it('opens on the role, adds the entry the reader writes, and closes', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    render(<CustomIconForm entry={null} onClose={onClose} />);
    expect(role()).toHaveFocus();

    await user.type(role(), RELIC.role);
    await user.type(look(), RELIC.look);
    await user.click(add());

    expect(picks()).toEqual([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('adds a spell with the school chosen, a pair with its states, and a figure', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: 'Damage school' })).toBeNull();

    await user.type(role(), 'Grid collapse');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kind of icon' }), 'SPELL');
    // The school is named as the subject's world names it.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Damage school' }), 'Storm (voltaic)');
    await user.click(screen.getByRole('checkbox', { name: 'Shows a figure' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Drawn as' }), 'STATES');
    await user.type(screen.getByRole('textbox', { name: 'First state' }), 'Charged');
    await user.type(screen.getByRole('textbox', { name: 'Second state' }), 'Spent Out');
    await user.type(look(), 'a hand folding a cube of power lines');
    await user.click(add());

    expect(picks().at(-1)).toEqual(
      customPick({
        id: 'grid-collapse',
        role: 'Grid collapse',
        kind: 'SPELL',
        school: 'VOLTAIC',
        figure: true,
        states: ['charged', 'spent-out'],
        look: 'a hand folding a cube of power lines',
      }),
    );
  });

  it('adds a family as one entry, with the keyboard following each member added and removed', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    await user.type(role(), FAMILY.role);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Drawn as' }), 'VARIANTS');
    // The family opens at its fewest, so neither member can be removed.
    expect(remove(1)).toBeDisabled();

    await user.type(member(1), 'Small');
    await user.type(memberLook(1), 'a thumb-length pen with one green cell.');
    await user.type(member(2), 'Spare');
    await user.click(screen.getByRole('button', { name: 'Add a variant' }));
    expect(member(3)).toHaveFocus();
    await user.type(member(3), 'Standard');
    await user.click(screen.getByRole('button', { name: 'Add a variant' }));
    await user.type(member(4), 'Large');
    await user.type(memberLook(4), 'a pistol-grip injector with three green cells');

    // Removing the second moves the third and fourth up, and the keyboard lands on the one now second.
    await user.click(remove(2));
    expect(member(2)).toHaveFocus();
    expect(member(2)).toHaveValue('Standard');
    await user.type(look(), FAMILY.look);
    await user.click(add());

    expect(picks()).toContainEqual(customPick(FAMILY));
  });

  it('refuses two members of one name beside the second, and a family past its size', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Drawn as' }), 'VARIANTS');
    await user.type(member(1), 'Rare');
    await user.type(member(2), 'rare!');
    expect(member(1)).not.toHaveAttribute('aria-invalid', 'true');
    expect(member(2)).toHaveAccessibleDescription(CUSTOM_ICON_REFUSALS.sameVariants);

    for (let count = 2; count < CUSTOM_ICON_FAMILY_SIZE.most; count += 1) {
      await user.click(screen.getByRole('button', { name: 'Add a variant' }));
    }
    expect(screen.getByRole('button', { name: 'Add a variant' })).toBeDisabled();
  });

  it('cancels without changing the set', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    render(<CustomIconForm entry={null} onClose={onClose} />);
    await user.type(role(), RELIC.role);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(picks()).toEqual(cataloguePicks(['heal-minor']));
  });
});

describe('CustomIconForm — refusals', () => {
  it('opens with no refusal shown, then names each beside its field and focuses the first', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    render(<CustomIconForm entry={null} onClose={onClose} />);
    expect(role()).not.toHaveAttribute('aria-invalid', 'true');

    await user.click(add());

    expect(role()).toHaveAttribute('aria-invalid', 'true');
    expect(role()).toHaveAccessibleDescription(CUSTOM_ICON_REFUSALS.roleEmpty);
    expect(look()).toHaveAccessibleDescription(CUSTOM_ICON_REFUSALS.lookEmpty);
    expect(role()).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    expect(picks()).toEqual(cataloguePicks(['heal-minor']));
  });

  it('refuses a look citing a section as it is typed, and adds nothing', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    await user.type(role(), RELIC.role);
    await user.type(look(), 'a relic [[SEC:X]');

    expect(look()).toHaveAccessibleDescription(CUSTOM_ICON_REFUSALS.brackets('look'));
    await user.click(add());
    expect(look()).toHaveFocus();
    expect(picks()).toEqual(cataloguePicks(['heal-minor']));
  });

  it('refuses a role whose slot an icon on the set already answers to', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(RELIC)]);
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    await user.type(role(), 'Nightcity keycard relic');

    expect(role()).toHaveAccessibleDescription(
      CUSTOM_ICON_REFUSALS.taken('nightcity-keycard-relic', 'your own “Nightcity Keycard Relic”'),
    );
  });
});

describe('CustomIconForm — warnings and changes', () => {
  it('warns of a word the key cuts away, and adds the entry as written all the same', async () => {
    const user = userEvent.setup({ delay: null });
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, backgroundKey: 'PURE_WHITE' } });
    render(<CustomIconForm entry={null} onClose={vi.fn()} />);
    await user.type(role(), RELIC.role);
    await user.type(look(), 'a white keycard');

    expect(screen.getByText(CUSTOM_ICON_WARNING_TEXT.keyColour('white', 'PURE_WHITE'))).toBeInTheDocument();
    await user.click(add());
    expect(picks().at(-1)).toEqual(customPick({ ...RELIC, look: 'a white keycard' }));
  });

  it('opens an entry with its own values, and saves a change in its place', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(RELIC), ...cataloguePicks(['system-bags'])]);
    const onClose = vi.fn();
    render(<CustomIconForm entry={RELIC} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: `Change “${RELIC.role}”` })).toBeInTheDocument();
    expect(role()).toHaveValue(RELIC.role);
    expect(look()).toHaveValue(RELIC.look);

    await user.clear(look());
    await user.type(look(), 'a cracked keycard');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(picks()).toEqual([
      customPick({ ...RELIC, look: 'a cracked keycard' }),
      ...cataloguePicks(['system-bags']),
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens a family with its members as typed, and saves a change to one of them as a change', async () => {
    const user = userEvent.setup({ delay: null });
    iconStudio([customPick(FAMILY)]);
    render(<CustomIconForm entry={FAMILY} onClose={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Drawn as' })).toHaveValue('VARIANTS');
    expect(member(3)).toHaveValue('large');
    expect(memberLook(2)).toHaveValue('');

    await user.type(memberLook(2), 'a palm-length pen with two green cells');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const [small, , large] = FAMILY.variants ?? [];
    expect(picks()).toEqual([
      customPick({
        ...FAMILY,
        variants: [small, { name: 'standard', look: 'a palm-length pen with two green cells' }, large].filter(
          (variant) => variant !== undefined,
        ),
      }),
    ]);
  });
});
