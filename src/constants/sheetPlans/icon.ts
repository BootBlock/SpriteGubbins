import { ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';
import { chunkEntries } from '../../utils/chunkEntries.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { iconRosterEntries } from '../../utils/iconRosterEntries.ts';
import type { SheetPlan } from '../../types/components.ts';
import { DEFAULT_ICON_LOOK } from '../iconCatalogue/defaultIconLook.ts';
import { ICON_OVERLAY_PLANS } from './iconOverlaySheet.ts';
import { iconSheet } from './iconSheet.ts';
import type { SeriesFor } from './modePlans.ts';

/**
 * What an ICON subject asks for: the overlay sheet, then the reader's roster sixteen icons to a sheet.
 *
 * **One mode, and the other three are declined.** An icon is a mark drawn into a fixed cell: it has no
 * yaw to be turned to, so `CORE_DIRECTIONAL_VARIANTS` would return five drawings of one flat symbol; it
 * has no joints, so `CUTOUT_RIG_SINGLE_DIRECTION` has nothing to cap; and it never butts against a copy of
 * itself, so `TILESET_MODULAR` describes something an icon grid deliberately is not.
 *
 * **The series is a function of the subject**, which is why `SeriesFor` takes one. The icons are the
 * reader's picks from the catalogue (`constants/iconCatalogue/`), each a named slot, and each is drawn as
 * the look its world's family writes for it — so the roster decides how many sheets there are and the
 * *World & Era* decides what each line says. A subject with no roster, or an empty one, is the overlay
 * sheet alone: the honest series for a set that has not picked an icon yet.
 *
 * **The roster's look picks every sheet's wording**, the overlay sheet's included, so a series never mixes
 * squares and loose marks. A subject with no roster takes `DEFAULT_ICON_LOOK`, which is only ever
 * a hand-built subject: every ICON subject the app stores carries one.
 *
 * **The set used to be twelve icons the generator chose**, on one sheet with the overlay pieces. That
 * left a reader who needed a game's own action bar, bags and system panels no way to ask for them, and
 * no way to name the files the quantiser cuts out.
 */
export const iconSeries: SeriesFor = (_facings, subject) => {
  const look = subject.icons?.look ?? DEFAULT_ICON_LOOK;
  const icons: SheetPlan[] = [];
  let first = 1;
  for (const run of chunkEntries(iconRosterEntries(subject), ICONS_PER_SHEET)) {
    icons.push(iconSheet(run, first, look));
    first += componentTotal(run);
  }
  return [ICON_OVERLAY_PLANS[look], ...icons];
};
