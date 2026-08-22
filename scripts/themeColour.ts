/**
 * The colour the browser paints when the app itself is not painting yet.
 *
 * Two of the three places this app's ground colour has to appear cannot read a CSS custom
 * property: the `<meta name="theme-color">` in `index.html`, which tints the browser's own chrome,
 * and the `theme_color` / `background_color` of the PWA manifest, which paint that chrome and the
 * install splash screen. So for a long time each carried a hand-written `#060911` — a value that
 * matched no token at all. It sits between `foundry-950` (`#04050a`) and `foundry-900`
 * (`#0a0c12`), so the splash screen handed over to a visibly lighter page, which is precisely the
 * flash the comment above the meta tag claimed it prevented.
 *
 * The derivation itself is `scripts/tokenColour.ts`, which is what keeps `src/index.css` the one
 * place a colour value is written down. `vite.config.ts` substitutes the answer into both the
 * manifest and the HTML, and nothing states the hex.
 */

import { tokenHex } from './tokenColour.ts';

/**
 * `foundry-900`, the page ground, as `#rrggbb`.
 *
 * Both manifest fields take it, and they are two decisions that happen to agree. `theme_color`
 * tints chrome that sits directly against the page, and `background_color` paints the splash the
 * page replaces — so anything other than the colour `body` actually carries is a seam the reader
 * sees. `foundry-950` is the well *below* the page, which is why it is not the answer to either.
 */
export function themeColorHex(stylesheetPath: URL): string {
  return tokenHex(stylesheetPath, 'foundry-900');
}

/** The placeholder `index.html` carries in place of the value, replaced by the build. */
export const THEME_COLOR_PLACEHOLDER = '__THEME_COLOR__';
