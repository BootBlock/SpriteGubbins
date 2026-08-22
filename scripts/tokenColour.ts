/**
 * A design token, resolved to `#rrggbb` at build time.
 *
 * CLAUDE.md names `src/index.css` as the one place a colour value is written down, and a handful of
 * build-time surfaces cannot read a custom property to honour that: the `<meta name="theme-color">`
 * tag and the PWA manifest, which paint the browser's chrome and the install splash, and the app
 * icon, which is pixel data with no element to carry a class. Each of those used to hold a
 * hand-typed hex, and every one of those hexes had drifted from the token its comment named.
 *
 * So the stylesheet's own `oklch()` declaration is parsed and converted here instead, and the
 * callers state a token name rather than a value. Repointing the ramp in `index.css` repoints the
 * chrome, the splash and the icon in the same edit.
 *
 * The conversion is `src/utils/oklab.ts` — the app's own, clamped the way a browser clamps — rather
 * than a second implementation of Ottosson's matrices written for the build. That is the same
 * reasoning `src/constants/differenceRamp.ts` records for resolving tokens in code.
 */

import { readFileSync } from 'node:fs';
import { oklabToSrgb, oklchToOklab } from '../src/utils/oklab.ts';

/**
 * Resolve one `--color-*` token from `src/index.css` to `#rrggbb`.
 *
 * `token` is the name without the `--color-` prefix — `foundry-900`, `neon`, `gold`. Only a literal
 * `oklch()` triple is understood, which is how every stop on the wheel and every rung of the foundry
 * ramp is declared; a token defined in terms of another variable throws rather than being guessed
 * at, because a build-time reader cannot resolve a `var()` the way the cascade does.
 */
export function tokenHex(stylesheetPath: URL, token: string): string {
  const stylesheet = readFileSync(stylesheetPath, 'utf8');
  const pattern = new RegExp(`--color-${token}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`);
  const declaration = pattern.exec(stylesheet);
  if (declaration === null) {
    throw new Error(`--color-${token} is not declared in src/index.css as an oklch() triple`);
  }

  const [, lightness, chroma, hue] = declaration;
  const { r, g, b } = oklabToSrgb(oklchToOklab(Number(lightness), Number(chroma), Number(hue)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** The same colour as the four opaque bytes a rasteriser writes into pixel data. */
export function tokenRgba(stylesheetPath: URL, token: string): [number, number, number, number] {
  const hex = tokenHex(stylesheetPath, token);
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    0xff,
  ];
}
