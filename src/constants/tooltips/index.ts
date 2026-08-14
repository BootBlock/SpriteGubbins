/**
 * The guidance behind every control that is an **action** rather than a setting.
 *
 * A setting's guidance lives with the options that setting offers — `constants/output/tooltips.ts`
 * beside `choices.ts`, `SETTINGS_TOOLTIPS` beside the defaults, `QUANTISE_TOOLTIPS` beside the
 * numbers it describes — because an option list and the sentence explaining it drift apart the
 * moment they are filed apart. Nothing here has an option list to sit beside: these are buttons,
 * navigation and search boxes, and what they share is that they *do* something to the configuration,
 * the library or the history rather than holding part of it.
 *
 * They are shown by hovering or focusing the control itself, through `ControlTooltip`, because there
 * are around fifty of them and an ⓘ beside each would be fifty more glyphs in rows that are already
 * full. Every one of them says three things: what the control does, what it touches — the prompt,
 * the studio, stored data, or nothing — and why anyone would reach for it.
 */
export { CHROME_TOOLTIPS } from './chrome.ts';
export { DIALOG_TOOLTIPS } from './dialogs.ts';
export { HISTORY_ACTION_TOOLTIPS } from './history.ts';
export { PRESET_ACTION_TOOLTIPS, presetCollectionGuidance } from './presets.ts';
export { QUANTISE_ACTION_TOOLTIPS } from './quantise.ts';
export { STUDIO_ACTION_TOOLTIPS } from './studio.ts';
