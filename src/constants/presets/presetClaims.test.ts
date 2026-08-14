import { describe, expect, it } from 'vitest';
import { PRESETS } from './index.ts';

/**
 * A preset's card may not borrow a term its configuration does not pin.
 *
 * A name and a description are read by someone choosing between sixty-odd configurations they
 * cannot otherwise tell apart, so a card that misstates the deliverable is worse than one that says
 * nothing: the reader loads it, copies the prompt, and gets back a sheet that is not the one they
 * picked. `Flat Mobile UI Nine-Slices` was that — its `anatomy` pinned `Three-Slice Horizontal
 * Stretch`, which is the string section 1 carries verbatim, so the sheet was a three-slice one
 * whatever the card said.
 *
 * **A pooled term is the only claim on a card a machine can hold**, which is why this file checks
 * that one and stops. The other half of the same report was a watchtower whose *comments* said
 * three facings while its inherited direction set drew five — untestable, because a comment is not
 * data. And a facing count written in prose is not the safe generalisation it looks like: the
 * `Five-View Turnaround Rig` says “reach all eight facings” about a five-run sheet and is telling
 * the truth, because the engine flips the turned views. A check that had to be taught about that
 * sentence would be asserting its own exemption list rather than the configuration.
 */

/**
 * The pooled terms a card could plausibly borrow, and never harmlessly.
 *
 * Each is the distinguishing half of an `anatomy` option in the interface pool — the field that
 * decides how the widget is cut, and the one a name reaches for when it wants to say what the kit
 * is. A card naming one is making a claim about the compiled prompt, not choosing a word.
 */
const SLICE_TERMS = ['nine-slice', 'three-slice', 'fixed-size'] as const;

describe('a preset’s card', () => {
  it.each(PRESETS)('$name states the slice assembly it actually pins', (preset) => {
    const card = `${preset.name} — ${preset.description}`.toLowerCase();

    for (const term of SLICE_TERMS) {
      if (!card.includes(term)) continue;

      expect(
        preset.subject.anatomy.toLowerCase(),
        `${preset.name} names ${term} on its card, but pins “${preset.subject.anatomy}”`,
      ).toContain(term);
    }
  });
});
