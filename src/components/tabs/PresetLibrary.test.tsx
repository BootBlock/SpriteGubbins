import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PRESET, PRESETS } from '../../constants/presets/index.ts';
import { PRESET_COLLECTION_IDS, presetCollectionLabel } from '../../constants/presets/collections.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { PresetLibrary } from './PresetLibrary.tsx';

/**
 * The library browser.
 *
 * Two contracts here are invisible to a reader of the component and easy to lose in an edit: the search
 * spans the *whole* library rather than the collection on screen, and filtering **reconciles** the grid
 * rather than replacing it. The second one is the reason the assertion below compares DOM nodes by
 * identity — a rebuilt list looks identical in every other respect, and only announces itself later, as
 * cards that flicker their entrance animation on every keystroke and details editors that close
 * themselves.
 */

/** A collection button, which is what selects what the panel shows. */
function collectionButton(collection: Parameters<typeof presetCollectionLabel>[0]) {
  return screen.getByRole('button', { name: new RegExp(presetCollectionLabel(collection)) });
}

/** The card for `name`, reached through its heading — a card's own root carries no queryable role. */
function cardFor(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('li');
  if (card === null) throw new Error(`the card for "${name}" should be a list item.`);
  return card;
}

/**
 * The cards currently on screen.
 *
 * Scoped to the panel rather than queried from the document: the collection list is a `<ul>` too, so a
 * bare `getAllByRole('listitem')` counts six sidebar rows as cards and every length assertion here would
 * be measuring both lists at once.
 */
function cards(): readonly HTMLElement[] {
  const panel = screen.getByRole('region', { name: presetCollectionLabel(activeCollection()) });
  return within(panel).queryAllByRole('listitem');
}

/** Which collection the list says is current. */
function activeCollection(): Parameters<typeof presetCollectionLabel>[0] {
  const current = screen.getByRole('button', { current: true });
  const found = PRESET_COLLECTION_IDS.find(
    (collection) => current.textContent?.startsWith(presetCollectionLabel(collection)) === true,
  );
  if (found === undefined) throw new Error('exactly one collection should be marked current.');
  return found;
}

function characterCount(): number {
  return PRESETS.filter((preset) => preset.category === 'CHARACTER').length;
}

// The store is a module singleton, so a test that seeds a saved preset would leave it for the next
// one — and "Your presets is empty" is an assertion two of these make.
afterEach(() => {
  usePresetStore.setState({ customPresets: [] });
});

describe('PresetLibrary', () => {
  it('opens on the first collection and shows only that collection’s cards', () => {
    render(<PresetLibrary />);

    expect(collectionButton('CHARACTER')).toHaveAttribute('aria-current', 'true');
    expect(cards()).toHaveLength(characterCount());
    // A creature preset exists but is not on screen, which is the whole point of the division.
    expect(screen.queryByRole('heading', { name: 'Dire Wolf Alpha' })).not.toBeInTheDocument();
  });

  it('switches collections when one is chosen', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.click(collectionButton('BUILDING'));

    expect(collectionButton('BUILDING')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { name: 'Neo-Tokyo Ramen Kiosk' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cyberpunk Katana Specialist' })).not.toBeInTheDocument();
  });

  it('searches the whole library, not the collection on screen', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    // Typed from Characters, matching a building. The view follows the results rather than leaving the
    // user on an empty panel wondering whether the search worked.
    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), 'ramen');

    expect(screen.getByRole('heading', { name: 'Neo-Tokyo Ramen Kiosk' })).toBeInTheDocument();
    expect(collectionButton('BUILDING')).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the same DOM node for a card that survives the filter', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    const search = screen.getByRole('searchbox', { name: 'Search presets' });
    await user.type(search, 'iso');

    const survivor = cardFor('Isometric Cut-Out Rig');
    // Narrowing further: the rig still matches, so its card must be *the same element* afterwards.
    // Re-creating it would be the "clear the list and repopulate" behaviour the redesign rules out.
    await user.type(search, 'metric rig');

    expect(cardFor('Isometric Cut-Out Rig')).toBe(survivor);
    expect(survivor).toBeInTheDocument();
  });

  it('keeps the same DOM node for a card that survives a widening filter too', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    const search = screen.getByRole('searchbox', { name: 'Search presets' });
    await user.type(search, 'clay');
    const survivor = cardFor('Clay Volume Study');
    expect(cards()).toHaveLength(1);

    // Clearing the box is the widening case that actually distinguishes the two implementations: the
    // survivor goes from the only card to the tenth of twelve, so keyed by array position its node
    // would be handed a different preset and the card for this one would be somewhere else entirely.
    await user.clear(search);

    expect(cards().length).toBeGreaterThan(1);
    expect(cards().indexOf(survivor)).toBeGreaterThan(0);
    expect(cardFor('Clay Volume Study')).toBe(survivor);
  });

  it('removes the cards that stop matching', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    expect(screen.getByRole('heading', { name: 'Cyberpunk Katana Specialist' })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), 'clay');

    expect(screen.queryByRole('heading', { name: 'Cyberpunk Katana Specialist' })).not.toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  it('counts the matches per collection and makes the empty ones unreachable', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), 'ramen');

    // Nothing in Characters matches, so it cannot be selected — selecting it would blank the panel.
    expect(collectionButton('CHARACTER')).toBeDisabled();
    expect(collectionButton('BUILDING')).not.toBeDisabled();
  });

  it('never disables the collection it is showing, even at no matches at all', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), 'sentient filing cabinet');

    // Every collection is empty here, so a rule of "empty means unreachable" would disable the whole
    // list — taking it out of the tab order and announcing the current row as unavailable.
    expect(collectionButton('CHARACTER')).toHaveAttribute('aria-current', 'true');
    expect(collectionButton('CHARACTER')).not.toBeDisabled();
    expect(collectionButton('BUILDING')).toBeDisabled();
  });

  it('does not treat a query that narrows nothing as a filter', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.click(collectionButton('custom'));
    // Punctuation survives `trim()` and not normalisation, so this is text in the box and no terms to
    // match on. Reading "is filtering" off the query rather than off the matcher put the two in
    // disagreement: the panel showed every preset while the list disabled the collections it thought
    // had none — including the empty one the user had just chosen.
    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), '-');

    expect(collectionButton('custom')).toHaveAttribute('aria-current', 'true');
    expect(collectionButton('custom')).not.toBeDisabled();
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(collectionButton('CHARACTER')).toHaveAccessibleName(new RegExp(String(characterCount())));
  });

  it('keeps focus in the search box when the clear button removes itself', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    const search = screen.getByRole('searchbox', { name: 'Search presets' });
    await user.type(search, 'clay');
    await user.click(screen.getByRole('button', { name: 'Clear the preset search' }));

    // Clearing unmounts the button that was clicked, so focus has to be moved before the state change
    // or it falls to the document and a keyboard user's next Tab restarts from the top of the page.
    expect(search).toHaveFocus();
    expect(search).toHaveValue('');
  });

  it('leaves an empty collection selectable when nothing is being filtered', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    // Nobody has saved a preset, and "Your presets" still has to open — its empty state is the only
    // place the app says how to put something in it.
    await user.click(collectionButton('custom'));

    expect(collectionButton('custom')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it('says so when nothing in the library matches at all', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.type(screen.getByRole('searchbox', { name: 'Search presets' }), 'sentient filing cabinet');

    expect(screen.getByText(/No preset matches/)).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it('returns to the chosen collection when the search is cleared', async () => {
    const user = userEvent.setup();
    render(<PresetLibrary />);

    await user.click(collectionButton('ITEM'));
    const search = screen.getByRole('searchbox', { name: 'Search presets' });
    await user.type(search, 'ramen');
    expect(collectionButton('BUILDING')).toHaveAttribute('aria-current', 'true');

    // Escape is the conventional way out of a filter box, and the choice made before searching is
    // intent rather than history — so it comes back rather than being replaced by where the search led.
    await user.keyboard('{Escape}');

    expect(search).toHaveValue('');
    expect(collectionButton('ITEM')).toHaveAttribute('aria-current', 'true');
  });

  it('puts a preset’s description on its card', () => {
    render(<PresetLibrary />);

    // The one line on a card written for a reader rather than assembled from identifiers, which is
    // why it is what the card leads with under the title.
    expect(within(cardFor(DEFAULT_PRESET.name)).getByText(DEFAULT_PRESET.description)).toBeInTheDocument();
  });

  it('names the subject on a card whose preset has no description', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({
      customPresets: [
        { ...DEFAULT_PRESET, id: 'custom-1', name: 'Bare Knight', description: '', isCustom: true },
      ],
    });

    render(<PresetLibrary />);
    await user.click(collectionButton('custom'));

    // The box is optional, so an empty one is ordinary — and a gap where the sentence would go says
    // less about the preset than its species and setting do.
    const { species, setting } = DEFAULT_PRESET.subject;
    expect(within(cardFor('Bare Knight')).getByText(`${species} — ${setting}`)).toBeInTheDocument();
  });

  it('opens the details editor on both the name and the description', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({
      customPresets: [
        {
          ...DEFAULT_PRESET,
          id: 'custom-1',
          name: 'My Knight',
          description: 'For the town scenes.',
          isCustom: true,
        },
      ],
    });

    render(<PresetLibrary />);
    await user.click(collectionButton('custom'));
    await user.click(screen.getByRole('button', { name: 'Edit details for preset My Knight' }));

    // Both boxes open on what the preset holds. The description is the half that only this editor
    // can reach: saving over a preset by name writes the studio as it stands, which is a different
    // intention entirely.
    expect(screen.getByRole('textbox', { name: 'New name for My Knight' })).toHaveValue('My Knight');
    expect(screen.getByRole('textbox', { name: 'Description for My Knight' })).toHaveValue(
      'For the town scenes.',
    );
  });

  it('files a saved preset under the user’s own collection', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({
      customPresets: [{ ...DEFAULT_PRESET, id: 'custom-1', name: 'My Knight', isCustom: true }],
    });

    render(<PresetLibrary />);

    // Not among the built-in humanoids it was saved from — "mine" is what a user goes looking for.
    expect(screen.queryByRole('heading', { name: 'My Knight' })).not.toBeInTheDocument();
    expect(collectionButton('custom')).toHaveAccessibleName(/1/);

    await user.click(collectionButton('custom'));
    expect(screen.getByRole('heading', { name: 'My Knight' })).toBeInTheDocument();
  });
});
