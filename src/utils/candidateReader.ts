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
 * position the stage before it chose, so its reading is already known. A round that retraces an
 * earlier one's ground asks again too. Measured over the eight corpus sheets at the grids the table
 * under `TUNE_ROUNDS` gives, the descent ranks 1,041 positions and only 805 of them are distinct: 23%
 * of what it used to run was an answer it already had, and 38% on
 * `test_sprites/character_space_marine_blue.png`.
 *
 * **Remembering a reading changes no answer**, because a reading is a function of the dials, the
 * crops and the settings, and only the dials vary within one sweep: `autoTune` makes one of these per
 * press, over the crops and settings that press was given. So the ranking every stage makes, the
 * elbow's ties included, is the one it made when each position was run afresh.
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
