import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { resolvePaletteLimit } from '../constants/promptText/index.ts';
import type { PaletteLimit } from '../types/output.ts';
import type { RenderStyle } from '../types/rendering.ts';
import type { ColorPlan, LockedPalette } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import { fixedPaletteColors } from './paletteEntries.ts';
import { pinnedPalette } from './pinnedPalette.ts';
import type { PinnedPaletteSource } from './pinnedPalette.ts';

/**
 * What the studio's colour settings ask the quantiser to do, and what to call it on screen.
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

/**
 * The studio's colour fields, taken together.
 *
 * One argument rather than four because they are one decision: the budget, the render style that
 * decides which budgets the sheet can be drawn under, the palette pinned over it, and — where that
 * palette is the reader's own — the colours it is made of. A caller holding an `OutputConfig` passes
 * it whole.
 */
export interface StudioColorSettings extends PinnedPaletteSource {
  readonly paletteLimit: PaletteLimit;
  readonly renderStyle: RenderStyle;
}

export function colorPlanFor(
  studioSettings: StudioColorSettings,
  lock: LockedPalette | null,
  snap: number,
): ColorPlan {
  const studio = studioPlan(studioSettings);
  if (lock === null || snap <= 0) return studio;

  const count = lock.entries.length;
  return {
    reduction: { kind: 'LOCKED', entries: lock.entries, snap },
    setting: 'Locked palette',
    studioSetting: studio.setting,
    studioIdentity: studio.studioIdentity,
    effect: `every colour within ${String(snap)} of the ${String(count)} colours locked from ${lock.sheetName} taken to it, the rest kept as they are`,
    // Named only where the studio has moved since the lock was taken. A lock taken under the
    // setting still in force is not overriding anything a reader would want told about it.
    //
    // Asked of the identity rather than the name, because a palette the reader loaded has a name
    // they can change and may never have given: two different pasted lists are both called `Custom`,
    // and comparing what the tab *says* would report no supersession across a palette swap and a
    // false one across a rename.
    superseded: studio.studioIdentity === lock.studioIdentity ? null : studio.setting,
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
function studioPlan({ paletteLimit: stored, renderStyle, ...source }: StudioColorSettings): ColorPlan {
  const pinned = pinnedPalette(source);
  // The budget the prompt states, which is the stored one only where the style can be drawn under
  // it: `RETRO_PIXEL_ART` names "a small palette", so a stored `UNRESTRICTED` is asked for — and so
  // reduced to — the budget that style falls back to rather than left alone (issue #406).
  const limit = resolvePaletteLimit(renderStyle, stored);

  if (pinned === null) {
    const maxColors = PALETTE_COLOR_COUNTS[limit];
    return maxColors === null
      ? {
          reduction: null,
          setting: limit,
          studioSetting: limit,
          studioIdentity: limit,
          effect: 'no colour budget, palette left alone',
          superseded: null,
        }
      : {
          reduction: { kind: 'MAX_COLORS', maxColors },
          setting: limit,
          studioSetting: limit,
          studioIdentity: limit,
          effect: `reduced to ${String(maxColors)} colours chosen from the sheet`,
          superseded: null,
        };
  }

  // What the tab calls this setting. A machine is its stored identifier, exactly as every other
  // setting on the tab is; a custom palette has no identifier worth showing — `CUSTOM` names the
  // control rather than the colours — so it is the reader's own name for the set, which is also what
  // a lock taken over it records.
  const name = pinned.id === 'CUSTOM' ? pinned.name : pinned.id;

  // What a lock records, so it can tell later whether this setting has moved. A machine is its own
  // id; the reader's own palette is its colours, because that is the only part of it that decides
  // the sheet — the name is theirs to change and two of them may share one.
  const identity =
    pinned.space.kind === 'FIXED' && pinned.id === 'CUSTOM'
      ? `${pinned.id}:${pinned.space.entries.join(',')}`
      : pinned.id;

  if (pinned.space.kind === 'CHANNEL_DEPTH') {
    const levels = channelLevels(pinned.space.bitsPerChannel).length;
    return {
      reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: pinned.space.bitsPerChannel },
      setting: name,
      studioSetting: name,
      studioIdentity: identity,
      effect: `every channel snapped to the machine’s ${String(levels)} levels`,
      superseded: null,
    };
  }

  const entries = fixedPaletteColors(pinned.space.entries);
  // A machine palette whose every entry failed to parse is one no test would have let ship — the
  // library's own suite checks the spelling of all of them — and a custom one cannot hold an entry
  // its parser did not accept. But mapping an image onto an empty palette would return it unchanged
  // while the studio said it had been pinned. Nothing rather than a lie.
  if (entries.length === 0) {
    return {
      reduction: null,
      setting: name,
      studioSetting: name,
      studioIdentity: identity,
      effect: 'unreadable, so the colours are left alone',
      superseded: null,
    };
  }

  return {
    reduction: { kind: 'PALETTE', entries },
    setting: name,
    studioSetting: name,
    studioIdentity: identity,
    // Singular where the list holds one, which no machine in the library does and a palette the
    // reader pasted may: "mapped onto its 1 fixed colours" is a readout that reads as a fault.
    effect: `mapped onto its ${String(entries.length)} fixed ${entries.length === 1 ? 'colour' : 'colours'}`,
    superseded: null,
  };
}
