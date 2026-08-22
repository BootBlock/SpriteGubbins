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
 * **A claim a machine can hold is one a field either satisfies or does not**, and two qualify: a
 * pooled term, which the field carries verbatim, and the identity lock, which is either written or
 * empty. This file checks those two and stops. The other half of the same report was a watchtower
 * whose *comments* said three facings while its inherited direction set drew five — untestable,
 * because a comment is not data. And a facing count written in prose is not the safe
 * generalisation it looks like: the `Five-View Turnaround Rig` says “reach all eight facings”
 * about a five-run sheet and is telling the truth, because the engine flips the turned views. A
 * check that had to be taught about that sentence would be asserting its own exemption list rather
 * than the configuration.
 */

/**
 * The pooled terms a card could plausibly borrow, and never harmlessly.
 *
 * Each is the distinguishing half of an `anatomy` option in the interface pool — the field that
 * decides how the widget is cut, and the one a name reaches for when it wants to say what the kit
 * is. A card naming one is making a claim about the compiled prompt, not choosing a word.
 *
 * **The hyphens are the point, and normalising them would break this.** A pooled term is a name and
 * carries its hyphen wherever it is written down; ordinary prose does not, and this preset's own
 * description ends “rather than at one fixed size” — the same two words, meaning the opposite of a
 * claim about the cut. Matching the hyphenated spelling is what tells a borrowed term from a
 * sentence that happens to contain it.
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

  /**
   * The identity lock is the second claim a machine can hold, and it holds against a simpler
   * predicate than the slice terms: the lock is one field, and either something is written in it or
   * nothing is.
   *
   * It is not a term a card may borrow loosely, because the split drawer answers the same question
   * directly underneath. Three cards said “sharing one identity lock” while every preset shipped
   * `identityLock: ''`, so opening the drawer those cards were describing produced a gold “No
   * identity lock — These sheets are not tied to one subject” badge, and none of the compiled
   * prompts carried the block either: `[IF:IDENTITY_LOCK]` omits it when the field is empty.
   *
   * Rewording the cards was the maintainer's choice between the two honest fixes, and the other one
   * is real: `IdentitySubjectDigest` builds the lock's subject half out of the sixteen fields a
   * preset already pins, so the three could have shipped a partial lock instead. What no preset can
   * ship is the palette half — `IdentityPaletteCapture` reads six hex codes out of a sheet the
   * reader accepted, and a preset has no accepted sheet. So a card may earn the term either way,
   * and this check asks only that something is written down before it is claimed.
   */
  it.each(PRESETS)('$name does not promise an identity lock it has not pinned', (preset) => {
    if (!`${preset.name} — ${preset.description}`.toLowerCase().includes('identity lock')) return;

    expect(
      preset.output.identityLock.trim(),
      `${preset.name} names an identity lock on its card, but pins none`,
    ).not.toBe('');
  });
});
