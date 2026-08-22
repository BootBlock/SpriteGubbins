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
 * CLAUDE.md names `src/index.css` as the one place a colour value is written down, and this module
 * is how the three call sites keep to that without a fourth copy: the stylesheet's own `oklch()`
 * declaration is parsed and converted here, at config time, and `vite.config.ts` substitutes the
 * answer into both the manifest and the HTML. Nothing states the hex. Repointing the ramp in
 * `index.css` repoints the chrome and the splash in the same edit.
 *
 * The conversion is `src/utils/oklab.ts` — the app's own, clamped the way a browser clamps — rather
 * than a second implementation of Ottosson's matrices written for the build. That is the same
 * reasoning `src/constants/differenceRamp.ts` records for resolving tokens in code.
 */

import { readFileSync } from 'node:fs';
import { oklabToSrgb, oklchToOklab } from '../src/utils/oklab.ts';

/**
 * `foundry-900`, the page ground, as `#rrggbb`.
 *
 * Both manifest fields take it, and they are two decisions that happen to agree. `theme_color`
 * tints chrome that sits directly against the page, and `background_color` paints the splash the
 * page replaces — so anything other than the colour `body` actually carries is a seam the reader
 * sees. `foundry-950` is the well *below* the page, which is why it is not the answer to either.
 */
export function themeColorHex(stylesheetPath: URL): string {
  const stylesheet = readFileSync(stylesheetPath, 'utf8');
  const declaration = /--color-foundry-900:\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(stylesheet);
  if (declaration === null) {
    throw new Error('--color-foundry-900 is not declared in src/index.css as an oklch() triple');
  }

  const [, lightness, chroma, hue] = declaration;
  const { r, g, b } = oklabToSrgb(oklchToOklab(Number(lightness), Number(chroma), Number(hue)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** The placeholder `index.html` carries in place of the value, replaced by the build. */
export const THEME_COLOR_PLACEHOLDER = '__THEME_COLOR__';
