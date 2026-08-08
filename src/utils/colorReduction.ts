import { paletteFor } from '../constants/palettes/index.ts';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import type { PaletteId } from '../types/palette.ts';
import type { PaletteLimit } from '../types/output.ts';
import type { ColorPlan, Rgba } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import { fromHex } from './imageData.ts';

/**
 * What the studio's two colour settings ask the quantiser to do, and what to call it on screen.
 *
 * The one place the "a pinned palette supersedes the budget" rule is turned into a decision, so no
 * caller has to know it and none can get it wrong. The prompt compiler expresses the same rule
 * through the template's `[IF:PALETTE!=yes]`, and the studio through the note under the budget
 * control; all three are the same sentence, and this is the machine-readable one.
 *
 * **The transform and the words for it come back together**, deliberately. They were briefly two
 * functions and the tab's own control panel went on reporting the budget while the pipeline mapped
 * to four greens — a readout and a result on one screen contradicting each other. One branch cannot
 * disagree with itself.
 *
 * Pure, so it can be asserted on directly rather than through a rendered tab.
 */
export function colorPlanFor(palette: PaletteId, limit: PaletteLimit): ColorPlan {
  const pinned = paletteFor(palette);

  if (pinned === null) {
    const maxColors = PALETTE_COLOR_COUNTS[limit];
    return maxColors === null
      ? { reduction: null, setting: limit, effect: 'no colour budget, palette left alone' }
      : {
          reduction: { kind: 'MAX_COLORS', maxColors },
          setting: limit,
          effect: `reduced to ${String(maxColors)} colours chosen from the sheet`,
        };
  }

  if (pinned.space.kind === 'CHANNEL_DEPTH') {
    const levels = channelLevels(pinned.space.bitsPerChannel).length;
    return {
      reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: pinned.space.bitsPerChannel },
      setting: palette,
      effect: `every channel snapped to the machine's ${String(levels)} levels`,
    };
  }

  const entries = pinned.space.entries.map(fromHex).filter((entry): entry is Rgba => entry !== null);
  // A palette whose every entry failed to parse is one no test would have let ship — the library's
  // own suite checks the spelling of all of them — but mapping an image onto an empty palette would
  // return it unchanged while the studio said it had been pinned. Nothing rather than a lie.
  if (entries.length === 0) {
    return { reduction: null, setting: palette, effect: 'unreadable, so the colours are left alone' };
  }

  return {
    reduction: { kind: 'PALETTE', entries },
    setting: palette,
    effect: `mapped onto its ${String(entries.length)} fixed colours`,
  };
}
