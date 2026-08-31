import { describe, expect, it } from 'vitest';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import { DIRECTIONAL_MODE_TOOLTIPS } from './directionalModeTooltips.ts';
import { OUTPUT_TOOLTIPS } from './tooltips.ts';

/**
 * That the accounts of the four sheet kinds stay on the control that chooses one, and out of the
 * guidance that explains the setting.
 *
 * `OUTPUT_TOOLTIPS.directionalMode` held two of them, and the card behind the ⓘ ran to 1171
 * characters of which 620 described options the reader had not chosen. Whether a paragraph is
 * *concise* is a judgement no assertion can make, so the two checks here are the mechanical halves
 * of what made that one long — and neither is the judgement.
 *
 * **Naming an option is the tell, and the identifier is the half a test can see.** An account can be
 * written without one — the deleted text described a tile field in exactly that way — so the first
 * check is narrower than “no option is explained here”, and says so rather than claiming the
 * stronger guarantee. **The ceiling is what catches the rest**, and 600 is where the two figures it
 * sits between leave it: the entry is 496 characters, so it has room to be reworded, and the
 * shortest of the four accounts is 366, so folding any one of them back in lands at 862 or more
 * however it is phrased. It bounds this entry alone — several others in the record are longer, each
 * for its own reason, and none of them carries a list of options underneath it.
 *
 * The prose, the punctuation, the length floor and the no-two-controls-share-a-sentence check are
 * `constants/tooltips/tooltips.test.ts`'s, which discovers this record by its name.
 */
const LONGEST_USEFUL = 600;

describe('the sheet contents guidance', () => {
  it('names none of the options it is offered beside', () => {
    const named = DIRECTIONAL_MODES.filter((mode) => OUTPUT_TOOLTIPS.directionalMode.includes(mode));

    expect(named).toEqual([]);
  });

  it('stays short enough to be read at the control', () => {
    expect(OUTPUT_TOOLTIPS.directionalMode.length).toBeLessThanOrEqual(LONGEST_USEFUL);
  });

  it.each(DIRECTIONAL_MODES)('gives %s an account of its own', (mode) => {
    // The floor the ceiling above is priced against: an entry that shrank below it would let the
    // field guidance take the explaining back without the ceiling ever firing.
    expect(DIRECTIONAL_MODE_TOOLTIPS[mode].length).toBeGreaterThan(300);
  });
});
