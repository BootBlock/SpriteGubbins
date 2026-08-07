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

/** One view's entry in the header's switcher. */
export interface AppTabChoice {
  readonly id: AppTab;
  readonly label: string;
  /** Decorative — the label carries the meaning, so the switcher hides this from assistive tech. */
  readonly icon: string;
}

/**
 * The four views, in the order the switcher shows them.
 *
 * Quantise sits beside the studio rather than at the end, because it is the second half of the same
 * job: compose the prompt here, and bring what the model returned back to the tab next door.
 */
export const APP_TAB_CHOICES: readonly AppTabChoice[] = [
  { id: 'studio', label: 'Studio', icon: '🛠️' },
  { id: 'quantise', label: 'Quantise', icon: '🔲' },
  { id: 'presets', label: 'Presets', icon: '⚡' },
  { id: 'spec', label: 'Architecture', icon: '📜' },
];
