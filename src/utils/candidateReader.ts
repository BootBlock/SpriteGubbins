import { TUNED_DIAL_KEYS } from '../types/autoTune.ts';
import type { TuneReading, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { readCandidate } from './tuneCandidate.ts';
import type { TuneCrop } from './tuneCrop.ts';

/**
 * `readCandidate` for one sweep, reading each position once however often the descent asks.
 *
 * **The descent asks about the same position again as a matter of course.** Every stage ranks the
 * dials in force alongside its own ladder — see `withIncumbent` — and the dials in force are the
 * position the stage before it chose, so its reading is already known. The fifteen positions
 * `colorPrice` reads are the first round's reading stage wherever the reader starts at the tab's
 * opening dials with no colour reduction, and a later round asks again about any position an earlier
 * one already ranked.
 * Measured over the eight corpus sheets at the grids the table under `TUNE_ROUNDS` gives, the descent
 * ranks 1,176 positions and only 743 of them are distinct: 37% of what it would run is an answer it
 * already has, and 46% on `test_sprites/ui_elements1.png`.
 *
 * **Remembering a reading changes no answer**, because a reading is a function of the dials, the
 * crops and the settings, and only the dials vary within one sweep: `autoTune` makes one of these per
 * press, over the crops and settings that press was given. So the ranking every stage makes, its
 * ties included, is the one it would make if each position was run afresh.
 *
 * The count `autoTune` reports is still the positions *ranked*, not the ones run — see
 * `TuneOutcome.candidates`.
 */
export function candidateReader(
  crops: readonly TuneCrop[],
  settings: QuantiseSettings,
): (dials: TunedDials) => TuneReading {
  const readings = new Map<string, TuneReading>();
  return (dials) => {
    const key = positionKey(dials);
    const known = readings.get(key);
    if (known !== undefined) return known;
    const reading = readCandidate(dials, crops, settings);
    readings.set(key, reading);
    return reading;
  };
}

/**
 * One position as a string that two positions share exactly when `sameTunedDials` calls them equal.
 *
 * Walked over `TUNED_DIAL_KEYS` for the reason that list gives, so a dial added to the sweep is part
 * of the key without anyone remembering it. A space cannot occur in any value — the numbers print
 * without one and every union member is an identifier — so the joined string cannot run two values
 * together.
 */
function positionKey(dials: TunedDials): string {
  return TUNED_DIAL_KEYS.map((key) => String(dials[key])).join(' ');
}
