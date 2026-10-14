import { ICON_KIND_LABELS } from '../constants/iconCatalogue/iconKindLabels.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { ICON_KINDS } from '../types/iconCatalogue.ts';
import type { IconRosterTally } from './iconRosterTally.ts';

/** A roster described three ways, for the three places the picker shows it. */
export interface IconRosterSummary {
  /** How many icons and components, out of the capacity, on how many sheets. */
  readonly sentence: string;
  /** How many icons of each kind. */
  readonly kinds: string;
  /** The short form a folded studio section shows in its header. */
  readonly digest: string;
}

/**
 * What a roster asks for, in plain text: icons and how many of them are the reader's own, components
 * against `ICON_ROSTER_CAPACITY`, and the sheets of the series.
 *
 * **`sheets` is the series' own count of each kind**, handed in rather than worked out here, because the
 * series is the compiler's answer (`sheetSeriesFor`) and a summary counting sheets by a rule of its own
 * would disagree with the sheet list the first time the even cut (`balancedChunks`) kept a two-state
 * pair together. The overlay sheets are counted too, because the *Extra Overlay Pieces* can fill a
 * second (`iconOverlaySheets`).
 */
export function iconRosterSummary(
  tally: IconRosterTally,
  sheets: { readonly icons: number; readonly overlays: number },
): IconRosterSummary {
  const total = sheets.icons + sheets.overlays;
  const overlays = sheets.overlays === 1 ? 'the overlay sheet' : `${String(sheets.overlays)} overlay sheets`;
  const sentence =
    tally.icons === 0
      ? `No icons are ticked, so the series is ${overlays} alone. A set holds up to ${String(ICON_ROSTER_CAPACITY)} components.`
      : `${counted(tally.icons, 'icon')}${ownShare(tally)}, drawn as ${String(tally.components)} of the ${String(ICON_ROSTER_CAPACITY)} components a set can hold, on ${counted(total, 'sheet')}: ${counted(sheets.icons, 'icon sheet')} and ${overlays}.`;
  const kinds = ICON_KINDS.map((kind) => `${ICON_KIND_LABELS[kind]}: ${String(tally.byKind[kind])}.`).join(
    ' ',
  );
  return { sentence, kinds, digest: `${counted(tally.icons, 'icon')} · ${counted(total, 'sheet')}` };
}

/** How many of the icons the reader wrote, as a clause after the icon count, or nothing for none. */
function ownShare({ icons, custom }: IconRosterTally): string {
  if (custom === 0) return '';
  if (custom === icons) return icons === 1 ? ', your own' : ', all your own';
  return `, ${String(custom)} of them your own`;
}

/** A figure with its noun, agreeing in number — `1 icon`, `20 icons`. */
function counted(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}
