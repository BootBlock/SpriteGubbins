import { useMemo, useState } from 'react';
import { DEFAULT_PRESET_COLLECTION, PRESET_COLLECTION_IDS } from '../../constants/presets/collections.ts';
import type { PresetCollectionId } from '../../constants/presets/collections.ts';
import { PRESETS } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { countByCollection, indexPresetLibrary, matchPresetEntries } from '../../utils/presetSearch.ts';
import { PresetCollectionList } from './PresetCollectionList.tsx';
import { PresetCollectionPanel } from './PresetCollectionPanel.tsx';
import { PresetSearchField } from './PresetSearchField.tsx';

/**
 * Browsing the library: which part of it on the left, that part's cards on the right.
 *
 * The tab used to be one grid of every preset. At nine that was a page; at fifty it is a wall, and the
 * cards a user wants are the ones they have to scroll past the other forty to reach. So the library is
 * divided by category, one collection is shown at a time, and the search box narrows *all* of it at
 * once rather than only what is on screen — because the whole reason to search is that you do not know
 * which collection the thing is in.
 *
 * **The derivations are a chain, and each link is memoised against only what it reads.** The index is
 * rebuilt when the user's saved presets change and at no other time; the match, the per-collection
 * counts and the visible slice each recompute when the query moves. A keystroke therefore costs one
 * `includes` per preset over strings that were lower-cased once — never a re-walk of every field of
 * every preset — and the panel below re-keys nothing: `matchPresetEntries` filters the index rather
 * than rebuilding it, so a card that still matches is handed the identical entry it had before.
 */
export function PresetLibrary() {
  const customPresets = usePresetStore((state) => state.customPresets);
  const loadPreset = usePresetStore((state) => state.loadPreset);
  const updateCustomPresetDetails = usePresetStore((state) => state.updateCustomPresetDetails);
  const deleteCustomPreset = usePresetStore((state) => state.deleteCustomPreset);

  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<PresetCollectionId>(DEFAULT_PRESET_COLLECTION);

  const library = useMemo(() => indexPresetLibrary([...PRESETS, ...customPresets]), [customPresets]);
  const matches = useMemo(() => matchPresetEntries(library, query), [library, query]);
  const counts = useMemo(() => countByCollection(matches), [matches]);

  /*
   * Whether the query narrowed anything — asked of the matcher rather than of the query.
   *
   * `matchPresetEntries` returns the array it was given, by reference, when the query yields no terms
   * — and a query can be non-empty and still yield none, because terms are what survives
   * normalisation and `-` survives nothing. A separate `query.trim() !== ''` test would therefore
   * disagree with the matcher for exactly those queries, and the disagreement is not cosmetic: it
   * would redirect the user out of an empty "Your presets" and disable the row they had just clicked,
   * on the strength of a filter that is not in effect. One definition, read from the thing that
   * actually filtered.
   */
  const isFiltering = matches !== library;

  /*
   * What is *shown*, as opposed to what was clicked.
   *
   * The click is the user's intent and is kept as-is, so clearing the search puts them back where they
   * were. While a query is live the view follows the results instead: typing "ramen" from Characters
   * should land on the kiosk rather than on an empty Characters panel, and the collection list makes
   * the same distinction by disabling the collections that have nothing in them.
   *
   * Derived during render rather than synchronised in an effect — the anti-pattern the structural laws
   * ban first, and here it would also mean the panel painted empty for one frame before correcting
   * itself.
   */
  const active =
    !isFiltering || counts.has(chosen)
      ? chosen
      : (PRESET_COLLECTION_IDS.find((collection) => counts.has(collection)) ?? chosen);

  const visible = useMemo(() => matches.filter((entry) => entry.collection === active), [matches, active]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="glass-panel space-y-3 rounded-2xl border border-foundry-700 p-4 shadow-xl lg:sticky lg:top-24 lg:col-span-3">
        <PresetSearchField
          value={query}
          onChange={setQuery}
          matchCount={matches.length}
          isNarrowed={isFiltering}
        />
        <div className="border-t border-foundry-700 pt-3">
          <PresetCollectionList
            counts={counts}
            active={active}
            isFiltering={isFiltering}
            onSelect={setChosen}
          />
        </div>
      </div>

      <div className="lg:col-span-9">
        <PresetCollectionPanel
          collection={active}
          entries={visible}
          narrowedBy={isFiltering ? query.trim() : null}
          onLoad={loadPreset}
          onUpdateDetails={(target, name, description) =>
            updateCustomPresetDetails(target.id, name, description)
          }
          onDelete={(target) => {
            void deleteCustomPreset(target.id);
          }}
        />
      </div>
    </div>
  );
}
