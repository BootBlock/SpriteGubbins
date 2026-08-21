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
