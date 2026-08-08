import type { AppTab } from './ui.ts';

/**
 * What the user is allowed to change about the application itself.
 *
 * Everything here is a *preference* — it changes how the app looks or behaves, and never what a
 * prompt says. That line is what keeps the settings out of the compiler's inputs: a prompt is a pure
 * function of the category, the subject and the output configuration, and adding an interface
 * preference to that set would make two users with the same studio state produce different text.
 */

/**
 * The hues the primary accent may take — nine positions on the app's own wheel.
 *
 * Two of the ten stops are deliberately absent, and both for reasons the palette already states:
 *
 * - **cyan** is `neon`'s, the *live* signal. The `pulse-glow` animation blooms from the accent to it
 *   precisely to mark "this is recomputing", and an accent resting on cyan would collapse the two
 *   ends of that transition into one colour.
 * - **the wheel's own indigo (264°)** is 10° from the primary this app already ships at 274°, so
 *   offering both would be offering the same colour twice. `indigo` below *is* that primary — the
 *   default, and the one choice whose values are unchanged from what the app has always rendered.
 *
 * Written as an `as const` array because the choice is persisted: `db/settingsParser.ts` validates a
 * stored value against this list, and a union declared any other way would need a second copy there.
 */
export const ACCENT_HUES = [
  'indigo',
  'rose',
  'ember',
  'gold',
  'lime',
  'jade',
  'azure',
  'violet',
  'magenta',
] as const;
export type AccentHue = (typeof ACCENT_HUES)[number];

/**
 * How much of the motion layer to run.
 *
 * `system` defers to `prefers-reduced-motion`, which is the answer for almost everyone. `reduced`
 * asks *this app* for the quiet version regardless — the case a media query cannot express, where
 * someone wants their OS animations left alone but does not want a tool they read dense forms in
 * breathing at them.
 *
 * There is no third member turning motion *up*. A user whose system asks for reduced motion is
 * honoured either way: this setting can only ever subtract.
 */
export const MOTION_PREFERENCES = ['system', 'reduced'] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

export interface AppSettings {
  /** Which hue the primary wears. Never touches `--color-tab`, which belongs to the active view. */
  readonly accentHue: AccentHue;
  readonly motion: MotionPreference;
  /**
   * Whether the ambient wash, dot grid and two drifting orbs are painted.
   *
   * Worth switching off in a tool for judging artwork: the aurora tints the whole page, and a
   * sprite's colours are being read against it.
   */
  readonly ambientBackdrop: boolean;
  /** The view the app opens on. */
  readonly openingView: AppTab;
}
