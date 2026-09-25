import { PREVIEW_MODES } from '../types/quantiser.ts';
import type { PreviewMode } from '../types/quantiser.ts';

/**
 * What each preview layout is called on its pill.
 *
 * Beside the tab's other user-facing copy in spirit but not in file, and the reason is a
 * type import: `constants/quantiser.ts` is read by the Node-side suites under `tests/`, whose
 * program carries no DOM library, and `types/quantiser.ts` is written in terms of `ImageData`.
 * A record keyed by the union has to name the union, so it lives here instead — where the keys stay
 * exhaustive, which is the property worth the extra file: a sixth mode added to `PREVIEW_MODES`
 * fails to compile until it has been given a name a reader can see.
 *
 * The identifiers are the app's and the words are the reader's. `Side by side` says what the frames
 * do rather than what they contain, because the layout is the only thing separating it from `Wipe`.
 */
export const PREVIEW_MODE_LABELS: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'Side by side',
  WIPE: 'Wipe',
  DIFFERENCE: 'Difference',
  SPRITES: 'Sprites',
  ONION: 'Onion skin',
};

/**
 * The layouts that need a result to draw, which is every one but the pair.
 *
 * Side by side is the only layout whose second frame can stand empty and still say something: its
 * placeholder names why there is no result. Each of the others is a picture of the result, so with
 * none it would draw a placeholder over the sheet. Derived rather than listed, so a sixth mode is
 * withheld with the rest unless it is made an exception here, as the panel's own fallback to the pair
 * already treats it.
 */
export const RESULT_PREVIEW_MODES: readonly PreviewMode[] = PREVIEW_MODES.filter(
  (mode) => mode !== 'SIDE_BY_SIDE',
);

/**
 * Why {@link RESULT_PREVIEW_MODES} cannot be chosen yet, shown under the pills while they cannot.
 *
 * It names no cause for the missing result: the result pane already states that, in whichever of its
 * four forms applies, and a second account here would be free to disagree with it.
 */
export const RESULT_PREVIEW_MODES_UNAVAILABLE = `${new Intl.ListFormat('en-GB').format(
  RESULT_PREVIEW_MODES.map((mode) => PREVIEW_MODE_LABELS[mode]),
)} each draw the result, so you can choose them once there is one.`;
