import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { hardenSilhouette } from '../src/utils/hardenSilhouette.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { stepProfile, type StepProfile } from '../src/utils/stepProfile.ts';

/**
 * How the eight reference sheets' boundary evidence is read: by magnitude, on every axis, keyed or not.
 *
 * **The claim `stepProfile` makes about real generator output, pinned.** A crisp axis is read by its
 * transitions, which is what keeps a walk off crisp art's stray pixels (#279) — and the eight sheets
 * in `test_sprites/` are resampled output, so none of their axes is crisp and the evidence the line
 * reader weighs on them is the magnitude it always weighed. That is why no figure measured through
 * the mesh on these sheets moved when transitions began to be read, and why none of the calibration
 * records beside those figures had to be restated.
 *
 * **Keyed as well as unkeyed, because keying is what makes a sheet look crisp.** The mesh is measured
 * on the sheet the prologue hands it — keyed and hardened, where the tab is keying — and a keyed
 * field is flat, so most of every row is no change at all. Read by how many of its steps are
 * unchanged, every keyed sheet here was crisp while the art inside each sprite was as resampled as it
 * arrived; read by whether its changes sit beside unchanged steps, none is. The key is the magenta
 * every one of these sheets was generated on, at the tolerance and hardening the tab opens with.
 *
 * **What is asserted is the identity of the array**, not a threshold's margin: the evidence *is* the
 * magnitude, rather than a copy that happens to hold the same numbers. A sheet added to the corpus
 * that is read by transitions is a different claim, and this is where it has to be made.
 */
describe('the boundary evidence of the eight reference sheets', () => {
  const profiles = new Map<string, StepProfile>();
  const KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;

  beforeAll(async () => {
    const corpus = await loadCorpus();
    for (const name of CORPUS_SHEETS) {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`${name} did not decode`);
      if (KEY === null) throw new Error('the magenta key names no colour');
      profiles.set(`${name} unkeyed`, stepProfile(image));
      const keyed = keyBackground(image, { color: KEY, tolerance: QUANTISE_DEFAULT_DIALS.keyTolerance });
      profiles.set(
        `${name} keyed`,
        stepProfile(hardenSilhouette(keyed.image, QUANTISE_DEFAULT_DIALS.silhouetteThreshold)),
      );
    }
  }, 600_000);

  const cases = CORPUS_SHEETS.flatMap((name: CorpusSheetName) => [`${name} unkeyed`, `${name} keyed`]);

  it.each(cases)('reads both axes of %s by magnitude', (label) => {
    const profile = profiles.get(label);
    if (profile === undefined) throw new Error(`${label} was never read`);

    expect(profile.columnEvidence).toBe(profile.columns);
    expect(profile.rowEvidence).toBe(profile.rows);
  });
});
