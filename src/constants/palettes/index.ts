import { PALETTE_IDS } from '../../types/palette.ts';
import type { Palette, PaletteId } from '../../types/palette.ts';
import type { OutputChoice } from '../output/choices.ts';
import { ARCADE_PALETTES } from './arcade.ts';
import { ATARI_PALETTES } from './atari.ts';
import { COMPUTER_PALETTES } from './computers.ts';
import { NINTENDO_PALETTES } from './nintendo.ts';
import { PC_PALETTES } from './pc.ts';
import { SEGA_PALETTES } from './sega.ts';

/**
 * Every palette the studio offers, and the two ways the app reaches them.
 *
 * Assembled from one module per family — a single file holding every hex value across nineteen
 * machines would be unreadable, and the provenance of each set is a paragraph that belongs beside
 * the values it justifies.
 *
 * The map is keyed by the **whole** `PaletteId` union rather than by the ids that happen to have a
 * definition, which is what makes adding a member to that union a compile error until it has one.
 * `FREE` maps to `null`, so "no palette pinned" is expressed once, here, instead of at every call
 * site.
 *
 * `CUSTOM` maps to `null` as well, and means something else by it: the reader's own colours exist,
 * but not as a constant — they arrive on `OutputConfig.customPalette`, and `pinnedPalette` is the
 * one reader that puts the two together. Nothing else in the app may look a palette up by id alone,
 * which is why this map is not exported as the app's answer to "which palette is pinned".
 */
export const PALETTES: Readonly<Record<PaletteId, Palette | null>> = {
  FREE: null,
  CUSTOM: null,
  ...NINTENDO_PALETTES,
  ...SEGA_PALETTES,
  ...COMPUTER_PALETTES,
  ...ATARI_PALETTES,
  ...PC_PALETTES,
  ...ARCADE_PALETTES,
};

/** The machine palette an id names, or `null` where the id names no machine. */
export function machinePaletteFor(id: PaletteId): Palette | null {
  return PALETTES[id];
}

/** What the `FREE` option is called, since it has no `Palette` to carry a label. */
const FREE_LABEL = 'FREE (no fixed palette — use the colour budget)';

/**
 * What the `CUSTOM` option is called before a file has named it.
 *
 * The dropdown says the same thing whatever is loaded. A label carrying the loaded palette's own
 * name would put a value in the list of *options* that describes the current state instead — the
 * reader would be choosing between eighteen machines and whatever they last imported, which reads
 * as nineteen palettes on offer. The name belongs under the control, where `PaletteField` states
 * it beside the colours.
 */
const CUSTOM_LABEL = 'CUSTOM (your own colours, loaded below)';

/**
 * The dropdown's options, derived from the map rather than written out again.
 *
 * A second list would be a second place to add a palette, and the one that got forgotten would be
 * the one the user never sees. `PALETTE_IDS` fixes the order, so the families stay contiguous.
 *
 * `palettes.test.ts` holds the other half: exactly two ids map to no `Palette`, so a machine added
 * without its definition cannot quietly inherit one of these two labels.
 */
export const PALETTE_CHOICES: readonly OutputChoice<PaletteId>[] = PALETTE_IDS.map((id) => ({
  value: id,
  label: PALETTES[id]?.label ?? (id === 'CUSTOM' ? CUSTOM_LABEL : FREE_LABEL),
}));
