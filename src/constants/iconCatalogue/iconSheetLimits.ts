/**
 * How many icons one sheet draws, how many a roster may hold, and the longest series that allows.
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
 * A bound on what storage may hold and on what the picker lets a reader tick, sized to the whole
 * catalogue a game's action bars, bags, spellbook, emotes and system menu need together. It is what
 * {@link ICON_SERIES_LONGEST} is derived from, and that in turn bounds a stored sheet index.
 */
export const ICON_ROSTER_CAPACITY = 320;

/**
 * The most sheets an ICON series can take: the overlay sheet, then the icon sheets a full roster fills.
 *
 * **Not `capacity ÷ sixteen`**, because a two-state entry never splits across two sheets: where one
 * would straddle the boundary the sheet closes at fifteen and the pair opens the next. So every icon
 * sheet but the last holds at least fifteen components, and a roster of `n` components takes at most
 * `⌊(n − 1) ÷ 15⌋ + 1` of them.
 */
export const ICON_SERIES_LONGEST = 1 + Math.floor((ICON_ROSTER_CAPACITY - 1) / (ICONS_PER_SHEET - 1)) + 1;
