import { ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';
import { balancedChunks } from '../../utils/balancedChunks.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { iconRosterEntries } from '../../utils/iconRosterEntries.ts';
import type { SheetPlan } from '../../types/components.ts';
import { DEFAULT_ICON_COLOUR_MODE } from '../iconCatalogue/defaultIconColourMode.ts';
import { DEFAULT_ICON_LOOK } from '../iconCatalogue/defaultIconLook.ts';
import { ICON_OVERLAY_PLANS } from './iconOverlaySheet.ts';
import { iconSheet } from './iconSheet.ts';
import type { SeriesFor } from './modePlans.ts';

/**
 * What an ICON subject asks for: the reader's roster at most sixteen icons to a sheet, then the overlay
 * sheet.
 *
 * **One mode, and the other three are declined.** An icon is a mark drawn into a fixed cell: it has no
 * yaw to be turned to, so `CORE_DIRECTIONAL_VARIANTS` would return five drawings of one flat symbol; it
 * has no joints, so `CUTOUT_RIG_SINGLE_DIRECTION` has nothing to cap; and it never butts against a copy of
 * itself, so `TILESET_MODULAR` describes something an icon grid deliberately is not.
 *
 * **The series is a function of the subject**, which is why `SeriesFor` takes one. The icons are the
 * reader's picks from the catalogue (`constants/iconCatalogue/`) and the entries they wrote themselves,
 * each a named slot, and a catalogue pick is drawn as the look its world's family writes for it — so the
 * roster decides how many sheets there are and the *World & Era* decides what each line says. A subject with no roster, or an empty one, is the overlay
 * sheet alone: the honest series for a set that has not picked an icon yet.
 *
 * **The roster's look picks every sheet's wording**, the overlay sheet's included, so a series never mixes
 * squares and loose marks, and its colour mode decides whether every icon sheet is a tint mask; the
 * overlay sheet's pieces mark a state rather than a side, so they keep their colours. A subject with no roster takes `DEFAULT_ICON_LOOK` and `DEFAULT_ICON_COLOUR_MODE`, which is only ever
 * a hand-built subject: every ICON subject the app stores carries one.
 *
 * **The icon sheets are cut as evenly as the roster allows** (`balancedChunks`, audit finding T5), so a
 * set of eighteen is two sheets of nine rather than sixteen and a last sheet of two drawn twice as large.
 *
 * **The overlay sheet comes last** (audit finding T6). Its pieces are drawn to the weight and the square
 * of the icons they are laid over, so it is generated once those icons exist: a reader can lock it to
 * them through the identity lock, and the series list in section 5 names the sheets that drew them.
 *
 * **The set used to be twelve icons the generator chose**, on one sheet with the overlay pieces. That
 * left a reader who needed a game's own action bar, bags and system panels no way to ask for them, and
 * no way to name the files the quantiser cuts out.
 */
export const iconSeries: SeriesFor = (_facings, subject) => {
  const look = subject.icons?.look ?? DEFAULT_ICON_LOOK;
  const colourMode = subject.icons?.colourMode ?? DEFAULT_ICON_COLOUR_MODE;
  const icons: SheetPlan[] = [];
  let first = 1;
  for (const run of balancedChunks(iconRosterEntries(subject), ICONS_PER_SHEET)) {
    icons.push(iconSheet(run, first, look, colourMode));
    first += componentTotal(run);
  }
  const overlay = ICON_OVERLAY_PLANS[look];
  const [head, ...rest] = icons;
  return head === undefined ? [overlay] : [head, ...rest, overlay];
};
