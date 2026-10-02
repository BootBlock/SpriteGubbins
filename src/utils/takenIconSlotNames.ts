import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { ICON_OVERLAY_PLANS } from '../constants/sheetPlans/iconOverlaySheet.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import { iconSlotNames } from './iconSlotNames.ts';
import { planSlots } from './componentSlots.ts';

/** Built on first use, since the catalogue and the overlay sheets never change while the app runs. */
let built: ReadonlyMap<string, string> | undefined;

/**
 * Every slot name an ICON set's sprites can answer to whatever the roster holds, each with the words
 * that name its owner — what an entry of the reader's own may not take.
 *
 * **The whole catalogue, not only the ticked part**, so an entry written today does not collide with the
 * catalogue entry ticked tomorrow, which would leave the reader holding two icons the set cannot hold at
 * once. Each entry's id and each of its pair's drawings are taken. **The overlay sheet's pieces too**,
 * in both looks, line labels and drawn names alike: the overlay sheet is sheet one of every set, and its
 * files sit beside the icons' in the game's folder, so a reader's `Locked mark` would overwrite the
 * overlay's.
 */
export function takenIconSlotNames(): ReadonlyMap<string, string> {
  built ??= new Map([
    ...ICON_LOOKS.flatMap((look) => {
      const plan = ICON_OVERLAY_PLANS[look];
      const labels = plan.groups.flatMap((group) => group.entries.map((entry) => entry.label));
      return [...labels, ...planSlots(plan)].map((name) => [name, 'a piece of the overlay sheet'] as const);
    }),
    ...ICON_CATALOGUE_GROUPS.flatMap((group) =>
      group.entries.flatMap((entry) =>
        [entry.id, ...iconSlotNames(entry)].map((name) => [name, `the catalogue’s “${entry.role}”`] as const),
      ),
    ),
  ]);
  return built;
}
