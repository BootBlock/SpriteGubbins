import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { QuantisePresetRow } from './QuantisePresetRow.tsx';

interface QuantisePresetListProps {
  readonly presets: readonly QuantisePreset[];
}

/**
 * The saved sets, in the order the backend returned them.
 *
 * A list rather than the studio library's cards, and the difference is what there is to show. An
 * archetype card carries the subject it describes — a category, a render style, a camera — which is
 * worth a tile the eye can scan. A set of dial positions is twenty-six small values, and a card showing
 * them would be a table nobody reads: what a reader picks one of these out of the list by is the
 * *name they gave it*, which is why the name and the sentence under it are the whole row.
 *
 * Split out of `QuantisePresetControls` because that panel's job is putting settings *into* the
 * collection and this one's is taking them out.

 * **The same row is what the Projects view lists**, which is why `QuantisePresetRow` is a component
 * of its own rather than markup inside this file: a saved set is loaded from here while working and
 * re-filed from there while organising, and both are the same row.
 *
 * **No `stagger-children`**, deliberately. That utility's delays are fractions of `view-pop-in`,
 * the page-transition entrance, and its own comment says so — the preset library wears it because
 * it fills as you navigate to it. These rows arrive while the reader is working, one at a time as
 * settings are saved, so they take the ordinary `pop-in`; a cascade calibrated against a different
 * duration would compress into the front of it and read as a stutter rather than a sweep.
 */
export function QuantisePresetList({ presets }: QuantisePresetListProps) {
  return (
    <ul className="mt-4 space-y-2">
      {presets.map((preset) => (
        <QuantisePresetRow key={preset.id} preset={preset} />
      ))}
    </ul>
  );
}
