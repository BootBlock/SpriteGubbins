import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import { spokenList } from '../../utils/spokenList.ts';

/** What the packing reads of a limb: the set it belongs to, and how many components it adds. */
interface Packable {
  /** `front legs` — see `Limb.set`. */
  readonly set?: string;
}

/** One sheet's share of a body's limbs, and what its name calls them. */
export interface LimbSheet<T extends Packable> {
  readonly limbs: readonly T[];
  /** `front legs`, `middle legs` — each set on the sheet once, in the order the body lists them. */
  readonly sets: readonly string[];
}

/**
 * A body's limbs, dealt onto as few sheets as hold them under `PRACTICAL_COMPONENT_CEILING` (issue #285).
 *
 * **Why a body's sheet can be more than one.** An insect's six legs and a spider's eight are each drawn
 * in every position their segments take, and that is 48 and 64 components before a trunk piece — past
 * what one generation returns before it starts merging and dropping pieces. Drawing fewer positions
 * would take motions away from the rig; drawing one leg for all of them would lose the difference
 * between a front leg and a hind one. A series is what `SheetSeries` exists for, so the body splits.
 *
 * **A set is never parted.** Consecutive limbs naming the same set go onto one sheet together. A set
 * holds at least a left limb and the right one mirroring it, because a mirrored limb's line reads "the
 * same eight variants as the left front leg", and a sheet cannot redraw a side it was not given; it can
 * hold more, which is how a body chooses its split. The sheets fill in the order the body lists its
 * limbs, each taking every set that still fits, and the first starts `reserved` components in, for the
 * trunk the pose library draws beside them.
 *
 * A body that splits has to name every limb's set, since the set is what tells two sheets of a series
 * apart; this throws at module load where one does not, rather than naming a sheet after nothing.
 */
export function limbSheets<T extends Packable>(
  limbs: readonly T[],
  count: (limb: T) => number,
  reserved: number,
): readonly [LimbSheet<T>, ...LimbSheet<T>[]] {
  const sheets: T[][] = [[]];
  let used = reserved;
  for (const run of runsOf(limbs)) {
    const size = run.reduce((sum, limb) => sum + count(limb), 0);
    if (used > 0 && used + size > PRACTICAL_COMPONENT_CEILING) {
      sheets.push([]);
      used = 0;
    }
    sheets.at(-1)?.push(...run);
    used += size;
  }
  if (sheets.length > 1 && limbs.some((limb) => limb.set === undefined)) {
    throw new Error('A body split across sheets names the set of every limb.');
  }
  const [first, ...rest] = sheets.map((sheet) => ({ limbs: sheet, sets: setsOf(sheet) }));
  if (first === undefined) throw new Error('Unreachable: the packing starts with one sheet.');
  return [first, ...rest];
}

/**
 * `Articulation`, or `Articulation — hind legs` where the series has more than one — and on the sheet
 * drawing the trunk beside its limbs, `Pose library — trunk, necks and forelimbs`.
 *
 * Each name is a select option as well as a heading, so it is held to `LABEL_BUDGET` with the count the
 * select appends — which is why a set is named for the legs drawn together, `front and middle legs`,
 * rather than each pair in turn.
 */
export function limbSheetName(
  base: string,
  sheet: LimbSheet<Packable>,
  split: boolean,
  trunk: boolean,
): string {
  if (!split) return base;
  const limbs = spokenList(sheet.sets);
  if (!trunk) return `${base} — ${limbs}`;
  return sheet.sets.length === 0 ? `${base} — trunk` : `${base} — trunk, ${limbs}`;
}

/** The limbs in runs of one set each, which is the unit a split never parts. */
function runsOf<T extends Packable>(limbs: readonly T[]): readonly (readonly T[])[] {
  const runs: T[][] = [];
  for (const limb of limbs) {
    const last = runs.at(-1);
    if (last?.[0] !== undefined && last[0].set === limb.set) last.push(limb);
    else runs.push([limb]);
  }
  return runs;
}

/** Each set a sheet's limbs belong to, once, in order. */
function setsOf(limbs: readonly Packable[]): readonly string[] {
  return [...new Set(limbs.flatMap((limb) => (limb.set === undefined ? [] : [limb.set])))];
}
