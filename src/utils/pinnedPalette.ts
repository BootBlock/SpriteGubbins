import { DEFAULT_CUSTOM_PALETTE_NAME } from '../constants/customPalette.ts';
import { machinePaletteFor } from '../constants/palettes/index.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import type { Palette, PaletteId } from '../types/palette.ts';

/**
 * Which palette a configuration has pinned, whether it names a machine or the reader's own colours.
 *
 * **The one place that question is answered.** A pinned palette supersedes the colour budget in
 * three separate readers — the compiled prompt drops the budget line, the quantiser ignores the
 * count, and the studio withdraws the control — and all three ask here, so none of them can come to
 * a different conclusion about whether there is one. That was `paletteFor(id)` while a palette was
 * always a constant; a palette the reader loads cannot be looked up by id, so the question now takes
 * the pair of fields that decide it.
 *
 * Pure, as everything in this directory is.
 */

/** The two fields that decide it, so a caller holding a whole `OutputConfig` can simply pass it. */
export interface PinnedPaletteSource {
  readonly palette: PaletteId;
  readonly customPalette: CustomPalette | null;
}

/**
 * The palette in force, or `null` where none is.
 *
 * **An empty `CUSTOM` is `null`, and that is the whole of its handling.** A reader who picks the
 * option before loading a file has pinned nothing, and answering that here means the prompt, the
 * quantiser, the digest and the studio each behave exactly as they do under `FREE` — without one of
 * them carrying a rule the others forgot. It is also what a restored row does when its palette
 * failed to parse.
 */
export function pinnedPalette({ palette, customPalette }: PinnedPaletteSource): Palette | null {
  if (palette !== 'CUSTOM') return machinePaletteFor(palette);
  return customPalette === null ? null : asPalette(customPalette);
}

/**
 * The reader's colours in the shape every reader downstream already handles.
 *
 * A `FIXED` space, because that is what a list of colours is — the same kind the Game Boy and PICO-8
 * carry, so `describePalette` states it, the swatch strip draws it and `colorPlanFor` maps onto it
 * with no branch for where it came from.
 *
 * **A palette with no name is named here**, because this is the last stop before the readers that
 * need one: the prompt says "one of the 24 colours of" and that sentence has to end somewhere. The
 * stored value keeps whatever the reader typed, including nothing at all, so an emptied name field
 * is not a control that fights back — the default is applied where it is read rather than where it
 * is written.
 *
 * The three machine facts are all absent, and each is absent rather than invented. `approximates` is
 * `null` because these are not a rendering of anything: they are the values themselves, and a caveat
 * telling the generator they approximate something would invite it to improve on them.
 * `onScreenColors` and `colorsPerComponent` are limits hardware imposed, and no file states one — a
 * palette is a list of colours, not a sprite budget. `note` is empty for the same reason, and
 * `describePalette` drops an empty part rather than leaving a blank paragraph behind it.
 */
function asPalette(custom: CustomPalette): Palette {
  const name = custom.name.trim() === '' ? DEFAULT_CUSTOM_PALETTE_NAME : custom.name.trim();

  return {
    id: 'CUSTOM',
    name,
    // Never read: the dropdown labels `CUSTOM` from its own constant, because an option's wording
    // cannot depend on what is loaded. It is stated because `Palette` requires it, and it is the
    // name rather than a placeholder so nothing showing a palette's label shows a lie.
    label: name,
    space: { kind: 'FIXED', entries: custom.entries, approximates: null },
    onScreenColors: null,
    colorsPerComponent: null,
    note: '',
  };
}
