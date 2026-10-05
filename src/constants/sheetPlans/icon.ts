import { ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';
import { balancedChunks } from '../../utils/balancedChunks.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { iconRosterEntries } from '../../utils/iconRosterEntries.ts';
import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { IconRoster } from '../../types/iconRoster.ts';
import type { SheetSubject } from '../../types/subject.ts';
import { DEFAULT_ICON_LOOK } from '../iconCatalogue/defaultIconLook.ts';
import { ICON_OVERLAY_PLANS } from './iconOverlaySheet.ts';
import { iconSheet } from './iconSheet.ts';
import type { SeriesFor } from './modePlans.ts';

/** Each roster's series for the last world it was asked for, held only while the roster is. */
const BUILT = new WeakMap<IconRoster, { readonly world: string; readonly series: SheetSeries }>();

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
 * overlay sheet's pieces mark a state rather than a side, so they keep their colours. A subject with no roster draws the overlay sheet in `DEFAULT_ICON_LOOK`, which is only ever a
 * hand-built subject: every ICON subject the app stores carries one.
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
 *
 * **Built once per roster and world, and shared.** Every reader asks for the series by the subject —
 * one compile asks several times for each sheet it lists, and the studio asks on every render — and
 * building it resolves every pick's look, cuts the roster and writes every icon sheet, so rebuilding it
 * per question made one compile of a set some forty times the cost of a character's. The
 * series is a function of the roster and the *World & Era* alone, and the roster is read-only to its
 * depth, so a roster the store has not replaced is a series already built. **Only the last world is
 * kept for each roster**: the field is typed a keystroke at a time over one roster, and a series kept
 * for every partial name would outlive the typing in the studio's undo stack.
 */
export const iconSeries: SeriesFor = (_facings, subject) => {
  const roster = subject.icons;
  if (roster === undefined) return [ICON_OVERLAY_PLANS[DEFAULT_ICON_LOOK]];
  const held = BUILT.get(roster);
  if (held?.world === subject.setting) return held.series;
  const series = buildSeries(roster, subject);
  BUILT.set(roster, { world: subject.setting, series });
  return series;
};

function buildSeries(roster: IconRoster, subject: SheetSubject): SheetSeries {
  const icons: SheetPlan[] = [];
  let first = 1;
  for (const run of balancedChunks(iconRosterEntries(subject), ICONS_PER_SHEET)) {
    icons.push(iconSheet(run, first, roster.look, roster.colourMode));
    first += componentTotal(run);
  }
  const overlay = ICON_OVERLAY_PLANS[roster.look];
  const [head, ...rest] = icons;
  return head === undefined ? [overlay] : [head, ...rest, overlay];
}
