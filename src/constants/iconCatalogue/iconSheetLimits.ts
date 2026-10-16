/**
 * How many icons one sheet draws, and how many a roster may hold.
 *
 * **Sixteen to a sheet, four by four**, which the maintainer decided for the 128 px icon: a square sheet
 * seats a four-by-four grid with margin to spare, and sixteen is well inside what one generation returns
 * before it starts merging and dropping pieces (`PRACTICAL_COMPONENT_CEILING`). The count is derived
 * from the columns, so the grid the intro states and the chunk the series cuts cannot disagree.
 */
export const ICON_GRID_COLUMNS = 4;

/** Components on one icon sheet: a square grid of {@link ICON_GRID_COLUMNS}. */
export const ICONS_PER_SHEET = ICON_GRID_COLUMNS * ICON_GRID_COLUMNS;

/**
 * The most components a roster may ask for, counting a two-state entry as two.
 *
 * A bound on what storage may hold and on what the picker lets a reader tick, sized to the icons one
 * game's action bars, bags, spellbook, emotes and system menu need together. **The catalogue holds more
 * than that**, since it offers every world's archetypes and a set is one game's choice from them, so
 * ticking all of it is refused once the set is full.
 */
export const ICON_ROSTER_CAPACITY = 320;
