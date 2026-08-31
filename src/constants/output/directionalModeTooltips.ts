import type { DirectionalMode } from '../../types/output.ts';

/**
 * What each kind of sheet is, one entry per mode, read out under the Sheet Contents control for the
 * mode currently chosen.
 *
 * **Two of these were in `OUTPUT_TOOLTIPS.directionalMode`, and that is why it was too long to
 * read.** That entry ran to 1171 characters and spent 620 of them — 53% — on options the reader had
 * not chosen: a user who had picked `CORE_DIRECTIONAL_VARIANTS` was told what a cut-out rig does to
 * Rig Mode and what a terrain offers instead of a facing, two accounts to read past before reaching
 * their own. It is 496 characters now, and explains the *setting*, which reads the same whatever is
 * chosen; this is the row for the chosen option, which is what `SelectField`'s `description` exists
 * for. **The other two entries are new prose rather than moved text** — that entry described neither
 * the single-facing library nor the tile field except in passing — so they carry the risk moved text
 * would not, and each was checked against every plan the mode has.
 *
 * **Keyed on the mode alone, so every sentence has to be true of every category that offers it.** A
 * pose library is a font’s four glyph sheets and a portrait's expressions as much as it is a
 * character’s poses, and a tile field is a nine-slice frame as much as it is a terrain’s two
 * materials meeting — so each entry names the range rather than the one instance its identifier
 * happens to be spelled after. What the chosen pairing actually draws is named by the inventory
 * itself, in the Inventory Part control below and in the compiled prompt's own section 4.
 */
export const DIRECTIONAL_MODE_TOOLTIPS: Readonly<Record<DirectionalMode, string>> = {
  SINGLE_DIRECTION_POSE_LIBRARY:
    'A library of variants of one subject, drawn at a single facing: a character’s poses, an object’s parts, an interface’s widget states, a font’s glyphs — whatever that category’s inventory is a set of. Directions Covered is a run list here rather than a set of views, so every part of the inventory is drawn again at each facing you asked for, and the identity lock is what holds them to one individual.',
  CORE_DIRECTIONAL_VARIANTS:
    'The subject turned to each facing Directions Covered names — one piece of geometry drawn at every yaw, never separate designs or mirrored copies. Up to five of those views share a sheet, and the eight-compass set splits them over two, so none is dropped or flipped to stand in for another. A subject with limbs takes a further sheet for them, drawn one facing at a time, which is why the figure beside the option counts more sheets than views.',
  CUTOUT_RIG_SINGLE_DIRECTION:
    'The pieces a skeleton binds to, drawn unposed in rest orientation and covering one facing per sheet — so eight directions are eight runs rather than a single sheet holding all of them, which no generator returns in one pass. It settles Rig Mode at CUTOUT_RIG, because the prompt has to carry the pivot registration, overlap and depth order that make the pieces turn.',
  TILESET_MODULAR:
    'Pieces meant to be assembled and repeated rather than viewed: a terrain’s two materials meeting, a building’s floors and walls, a widget’s stretching frame, a background band that loops as it scrolls. Whatever repeats has to meet a copy of itself without a join — along one axis for a band or a button, in both for a floor. Not everything does: a corner, an end cap or a piece placed once is drawn at its finished size.',
};
