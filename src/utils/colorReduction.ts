import { paletteFor } from '../constants/palettes/index.ts';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import type { PaletteId } from '../types/palette.ts';
import type { PaletteLimit } from '../types/output.ts';
import type { ColorPlan, LockedPalette, Rgba } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import { fromHex } from './imageData.ts';

/**
 * What the studio's two colour settings ask the quantiser to do, and what to call it on screen.
 *
 * The one place the "a pinned palette supersedes the budget" rule is turned into a decision, so no
 * caller has to know it and none can get it wrong. The prompt compiler expresses the same rule
 * through the template's `[IF:PALETTE!=yes]`, and the studio by withdrawing the budget control and
 * stating the supersession under the palette that caused it; all three are the same sentence, and
 * this is the machine-readable one.
 *
 * **The transform and the words for it come back together**, deliberately. They were briefly two
 * functions and the tab's own control panel went on reporting the budget while the pipeline mapped
 * to four greens — a readout and a result on one screen contradicting each other. One branch cannot
 * disagree with itself.
 *
 * **A locked palette supersedes both, where it applies.** It is the only one of the three the
 * reader states on this tab rather than in the studio, and locking is an explicit act on a result
 * they are looking at — the newer and more specific statement of which colours the series is made
 * of — so a lock in reach decides the palette outright, and the studio's setting is reported as
 * {@link ColorPlan.superseded} whenever it has moved on since. Nothing is silently resolved: the
 * one case where the supersession could surprise is the one case the plan names.
 *
 * **At a snap distance of zero the lock reaches nothing, so it supersedes nothing** and the studio's
 * setting stands exactly as it would with no palette held. The alternative was measured on the
 * reference sheet and is a cliff: a lock that superseded the budget while taking no colour at all
 * left the sheet unreduced, and dragging one dial to its off position took it from 64 colours to
 * 10,031. A dial's off position has to mean the pass does not run, not that a different pass stops
 * running with it.
 *
 * Pure, so it can be asserted on directly rather than through a rendered tab.
 */
export function colorPlanFor(
  palette: PaletteId,
  limit: PaletteLimit,
  lock: LockedPalette | null,
  snap: number,
): ColorPlan {
  const studio = studioPlan(palette, limit);
  if (lock === null || snap <= 0) return studio;

  const count = lock.entries.length;
  return {
    reduction: { kind: 'LOCKED', entries: lock.entries, snap },
    setting: 'Locked palette',
    studioSetting: studio.setting,
    effect: `every colour within ${String(snap)} of the ${String(count)} colours locked from ${lock.sheetName} taken to it, the rest kept as they are`,
    // Named only where the studio has moved since the lock was taken. A lock taken under the
    // setting still in force is not overriding anything a reader would want told about it.
    superseded: studio.setting === lock.setting ? null : studio.setting,
  };
}

/**
 * The studio's own half of that decision: the budget, or the palette pinned over it.
 *
 * Separate from the function above because it is asked for twice — once as the plan itself when no
 * palette is locked, and once as the *name* a lock is overriding when one is. Deriving that name
 * any other way would be a second reading of the same two settings, which is the failure the whole
 * of `colorPlanFor` exists to prevent.
 */
function studioPlan(palette: PaletteId, limit: PaletteLimit): ColorPlan {
  const pinned = paletteFor(palette);

  if (pinned === null) {
    const maxColors = PALETTE_COLOR_COUNTS[limit];
    return maxColors === null
      ? {
          reduction: null,
          setting: limit,
          studioSetting: limit,
          effect: 'no colour budget, palette left alone',
          superseded: null,
        }
      : {
          reduction: { kind: 'MAX_COLORS', maxColors },
          setting: limit,
          studioSetting: limit,
          effect: `reduced to ${String(maxColors)} colours chosen from the sheet`,
          superseded: null,
        };
  }

  if (pinned.space.kind === 'CHANNEL_DEPTH') {
    const levels = channelLevels(pinned.space.bitsPerChannel).length;
    return {
      reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: pinned.space.bitsPerChannel },
      setting: palette,
      studioSetting: palette,
      effect: `every channel snapped to the machine's ${String(levels)} levels`,
      superseded: null,
    };
  }

  const entries = pinned.space.entries.map(fromHex).filter((entry): entry is Rgba => entry !== null);
  // A palette whose every entry failed to parse is one no test would have let ship — the library's
  // own suite checks the spelling of all of them — but mapping an image onto an empty palette would
  // return it unchanged while the studio said it had been pinned. Nothing rather than a lie.
  if (entries.length === 0) {
    return {
      reduction: null,
      setting: palette,
      studioSetting: palette,
      effect: 'unreadable, so the colours are left alone',
      superseded: null,
    };
  }

  return {
    reduction: { kind: 'PALETTE', entries },
    setting: palette,
    studioSetting: palette,
    effect: `mapped onto its ${String(entries.length)} fixed colours`,
    superseded: null,
  };
}
