import type { AccentHue, AppSettings } from '../types/settings.ts';
import { APP_TAB_CHOICES } from './ui.ts';

/**
 * The settings dialog's vocabulary: what each preference starts at, what its options are called,
 * and what the guidance beside it says.
 *
 * Separate from `types/settings.ts` for the reason every other pair here is separate — the types are
 * the closed sets the parser validates against, and these are the words the interface puts on them.
 */

/**
 * What an untouched install renders.
 *
 * **Every field is the behaviour the app had before it was settable**, which is the property that
 * makes this feature safe to add: a user who never opens the dialog sees no change at all, and the
 * parser falls back here field by field, so a corrupt stored value costs that one preference rather
 * than the set.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  accentHue: 'indigo',
  motion: 'system',
  ambientBackdrop: true,
  openingView: 'studio',
};

/**
 * What each accent hue is called, as the swatches label themselves.
 *
 * A `Record` keyed by the union rather than a list of pairs, so a hue added to `ACCENT_HUES` without
 * a name here is a compile error instead of a swatch labelled `undefined`.
 */
export const ACCENT_LABELS: Record<AccentHue, string> = {
  indigo: 'Indigo',
  rose: 'Rose',
  ember: 'Ember',
  gold: 'Gold',
  lime: 'Lime',
  jade: 'Jade',
  azure: 'Azure',
  violet: 'Violet',
  magenta: 'Magenta',
};

/** The default's name, for the one place the dialog has to say which swatch it is. */
export const DEFAULT_ACCENT_LABEL = ACCENT_LABELS[DEFAULT_SETTINGS.accentHue];

/**
 * The opening view's options, taken from the switcher's own table rather than restated.
 *
 * One consequence worth having: the dropdown lists the views in the order the header shows them, so
 * a reader choosing between them is choosing from the row they already know. A view added to the app
 * appears here without this file being touched.
 */
export const OPENING_VIEW_CHOICES = APP_TAB_CHOICES.map((tab) => ({ value: tab.id, label: tab.label }));

/**
 * The guidance behind each setting's ⓘ.
 *
 * Written to say what the preference *does not* reach as much as what it does — the accent one above
 * all, because "change the app's colour" is a reasonable reading of a swatch row and is not what this
 * control offers. Each view's own colour is the app's way of saying where you are, and no setting
 * moves it.
 */
export const SETTINGS_TOOLTIPS = {
  accentHue: `The colour the app uses for its primary action, the focus ring, selection and the ambient glow — the meanings that stay the same wherever you are. Each view keeps its own colour regardless, because that is how the app says which view you are looking at. Every hue here is a position on the same wheel those come from, at the same luminance as the ${DEFAULT_ACCENT_LABEL.toLowerCase()} default, so switching one in cannot change how legible anything is. Cyan is not offered: it marks something recomputing live, and an accent resting on it would erase that signal.`,

  motion:
    'Runs the whole motion layer at its shortest, the way the app already does for anyone whose system asks for reduced motion. Turn it on to quiet this app alone, without changing that system-wide setting. If your system already asks for reduced motion, the app honours it whatever is chosen here — this can only ever take motion away, never add it.',

  ambientBackdrop:
    'Paints the ambient wash, the dot grid and the two drifting glows behind the page. Worth switching off when you are judging the colours in a sprite sheet: the wash tints the whole page in the active view’s hue, and your artwork is being read against it.',

  openingView:
    'The view the app opens on. Applied only on a fresh load — navigating during a session is never overridden, and changing this does not move you now.',
} as const;
