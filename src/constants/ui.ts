import type { AppTab } from '../types/ui.ts';

/** Shell-level UI constants — the timings and labels the chrome shares with the stores. */

/**
 * How long a toast stays on screen before dismissing itself.
 *
 * The original app's own timing. Long enough to read a short confirmation, short enough that it is
 * gone before the user's next action — and the toast stays dismissible, so this is a ceiling
 * rather than something to wait out.
 */
export const TOAST_DURATION_MS = 3000;

/**
 * How long the toast then takes to fade off the screen.
 *
 * Read twice and it has to be the same number both times: the store keeps the message mounted for
 * this long after the dwell above expires, and `ToastCard` hands it to `animate-toast-out` as that
 * animation's duration — the token deliberately declares none. A drift between the two is silent
 * and visible, leaving either a notification cut off mid-fade or a transparent one still sitting in
 * the corner.
 *
 * Deliberately slow, and much slower than the entrance. A departure is the one piece of motion in
 * the app nobody is waiting on, so it is where the flair is affordable — and a toast that is going
 * anyway stays readable for the whole of it. The dwell above is unchanged: this is time added to the
 * *end* of a toast's life, not taken from the part of it that is doing the announcing.
 */
export const TOAST_EXIT_MS = 2500;

/**
 * How long the pointer has to stay on a control before its guidance appears.
 *
 * A pointer crosses controls it has no interest in — a toolbar is a row of them, and the one being
 * reached for is usually the far side of two others. Revealing on contact meant those two answered
 * a journey with a paragraph, and the card landed over the control the user was actually travelling
 * to. The grace period is what separates *pointing at* a control from *passing over* one, and 350ms
 * is long enough that a deliberate rest clears it while a traverse does not.
 *
 * **The ⓘ deliberately has none**, and the difference is what each trigger is: the glyph exists only
 * to reveal its card, so pointing at one is never on the way to something else — where a wrapped
 * control has a job of its own, which is the journey this delay protects. `Tooltip` therefore asks
 * for no delay at all rather than a shorter one.
 *
 * Not a motion token and not in `index.css`: nothing moves for this, and the reduced-motion blocks
 * would have no declaration to carry. The card's own entrance animation is unaffected — it plays in
 * full once the wait is over.
 */
export const TOOLTIP_HOVER_DELAY_MS = 350;

/** One view's entry in the header's switcher. */
export interface AppTabChoice {
  readonly id: AppTab;
  readonly label: string;
  /** Decorative — the label carries the meaning, so the switcher hides this from assistive tech. */
  readonly icon: string;
  /**
   * What the view is for, shown on hovering or focusing its button in the switcher.
   *
   * Here rather than in `constants/tooltips/` because it belongs to the view rather than to the
   * control: the switcher is not the only place a reader chooses between these — the settings
   * dialog's opening-view field is built from this same table — and a view added to the app should
   * arrive with its own description rather than needing a second file remembered.
   *
   * A single word on a tab cannot say what a view does, and one of the five is genuinely opaque
   * from its label: "Architecture" reads as a setting until you have opened it once.
   */
  readonly guidance: string;
}

/**
 * Each view's entry, keyed by the view it describes.
 *
 * `satisfies Record<AppTab, AppTabChoice>` is what makes a lookup by id total: a view added to
 * `APP_TABS` without an entry here is a compile error, rather than a shell that renders the page's
 * only `<h1>` with nothing inside it. The shell wants this shape rather than the ordered list
 * below, because it knows *which* view is active and not where that view sits in the switcher.
 */
export const APP_TAB_CHOICE_BY_ID = {
  studio: {
    id: 'studio',
    label: 'Studio',
    icon: '🛠️',
    guidance:
      'Where the prompt is built: the subject on the left, the output configuration under it, and the compiled text on the right, recompiled as you type. Everything that reaches the generator is set here, and nothing in the other three views changes a word of it.',
  },
  quantise: {
    id: 'quantise',
    label: 'Quantise',
    icon: '🔲',
    guidance:
      'The second half of the job, for a sheet a generator has already returned: snap it back to the pixel scale it was meant to be drawn at, bring its colours down to what the prompt asked for, and turn the background key into transparency. It is the one follow-up no wording can replace — the prompt already forbids smooth downscaled artwork, and models hand it back anyway. Nothing is uploaded; the image is decoded and transformed in the tab.',
  },
  presets: {
    id: 'presets',
    label: 'Presets',
    icon: '⚡',
    guidance:
      'The archetype library: the configurations this app ships with, covering every subject category. Loading one replaces the whole studio setup, so it is a starting point to work from rather than a finished answer. The count beside the label is how many it holds, and it never moves — what you save yourself is filed under a project and lives on the Projects view.',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    icon: '🗂️',
    guidance:
      'Everything you have saved, grouped by the game or job it was saved for — the studio archetypes and the quantiser dial positions alike. Make a project here, rename or describe one, re-file a save into another, or delete a project and its contents together. This is also where the whole library is exported to a file and read back in; nothing on this view alters the prompt or the studio until you load one of the saves it lists.',
  },
  spec: {
    id: 'spec',
    label: 'Architecture',
    icon: '📜',
    guidance:
      'How the app is built and where your work is kept — the storage it is using in this browser, what it does and does not send anywhere, the version and the source. Documentation rather than a control panel: nothing here changes the prompt or the configuration.',
  },
} satisfies Record<AppTab, AppTabChoice>;

/**
 * The five views, in the order the switcher shows them.
 *
 * Quantise sits beside the studio rather than at the end, because it is the second half of the same
 * job: compose the prompt here, and bring what the model returned back to the tab next door.
 * Projects follows the preset library for the same kind of reason — one holds the archetypes the
 * app ships and the other holds the ones the reader made, so they read as a pair.
 *
 * Assembled from the record above rather than restating it, so a view cannot be called one thing in
 * the switcher and another in the heading. Order is the only thing this list contributes — the
 * union in `APP_TABS` declares the same five in a different one, and says so.
 */
export const APP_TAB_CHOICES: readonly AppTabChoice[] = [
  APP_TAB_CHOICE_BY_ID.studio,
  APP_TAB_CHOICE_BY_ID.quantise,
  APP_TAB_CHOICE_BY_ID.presets,
  APP_TAB_CHOICE_BY_ID.projects,
  APP_TAB_CHOICE_BY_ID.spec,
];
