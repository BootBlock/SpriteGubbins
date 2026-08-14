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
 * this long after the dwell above expires, and `Toast` hands it to `animate-toast-out` as that
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
   * A single word on a tab cannot say what a view does, and one of the four is genuinely opaque
   * from its label: "Architecture" reads as a setting until you have opened it once.
   */
  readonly guidance: string;
}

/**
 * The four views, in the order the switcher shows them.
 *
 * Quantise sits beside the studio rather than at the end, because it is the second half of the same
 * job: compose the prompt here, and bring what the model returned back to the tab next door.
 */
export const APP_TAB_CHOICES: readonly AppTabChoice[] = [
  {
    id: 'studio',
    label: 'Studio',
    icon: '🛠️',
    guidance:
      'Where the prompt is built: the subject on the left, the output configuration under it, and the compiled text on the right, recompiled as you type. Everything that reaches the generator is set here, and nothing in the other three views changes a word of it.',
  },
  {
    id: 'quantise',
    label: 'Quantise',
    icon: '🔲',
    guidance:
      'The second half of the job, for a sheet a generator has already returned: snap it back to the pixel scale it was meant to be drawn at, bring its colours down to what the prompt asked for, and turn the background key into transparency. It is the one follow-up no wording can replace — the prompt already forbids smooth downscaled artwork, and models hand it back anyway. Nothing is uploaded; the image is decoded and transformed in the tab.',
  },
  {
    id: 'presets',
    label: 'Presets',
    icon: '⚡',
    guidance:
      'The archetype library: built-in configurations covering every subject category, plus anything you have saved yourself. Loading one replaces the whole studio setup, so it is a starting point to work from rather than a finished answer. The count beside the label is how many the library holds.',
  },
  {
    id: 'spec',
    label: 'Architecture',
    icon: '📜',
    guidance:
      'How the app is built and where your work is kept — the storage it is using in this browser, what it does and does not send anywhere, the version and the source. Documentation rather than a control panel: nothing here changes the prompt or the configuration.',
  },
];
