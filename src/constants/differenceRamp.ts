/**
 * The colours the difference heatmap paints, as the four stops of one ramp.
 *
 * **This is a colour written down outside `src/index.css`, which needs a reason, and here it is:**
 * the heatmap is painted *into pixel data*. A pixel has no element to carry a class, and the code
 * that writes it is a pure function in `src/utils/`, where reading a computed style is banned
 * outright — so the values have to be resolvable in code, with nothing to resolve them from. The
 * same argument the palette library makes for `src/constants/palettes/`, arriving from the other
 * direction: those are colours a machine could display, this is a colour the app is drawing with,
 * and neither can be a utility class.
 *
 * What the exemption does **not** extend to is choosing new colours. Every stop is one of the app's
 * own tokens, stated exactly as `index.css` states it — the same `oklch()` triple, in the same
 * order — and `tests/design-tokens.test.ts` reads the stylesheet and fails if the two ever part
 * company. So the palette still has one definition; this is a mirror of it, machine-checked, not a
 * second opinion.
 *
 * **The four are the app's own severity vocabulary**, which is why the ramp reads without a legend:
 * the page's own ground where a pixel stands for its source exactly, then `emerald` for a difference
 * a reader would have to look for, `gold` for one worth attention, and `rose` where the pixel has
 * lost what it replaced. It is the same green/amber/red the badges and the form validation already
 * speak. Lightness climbs steeply out of the ground and then holds — 0.115, 0.78, 0.80, 0.68 — so
 * the bottom of the ramp is ordered by brightness and the top by hue, which is the pairing that
 * keeps a mark legible against the dark pane at every level.
 */
export const DIFFERENCE_RAMP = [
  { property: '--color-foundry-950', oklch: [0.115, 0.015, 270] },
  { property: '--color-emerald', oklch: [0.78, 0.17, 156] },
  { property: '--color-gold', oklch: [0.8, 0.15, 84] },
  { property: '--color-rose', oklch: [0.68, 0.2, 12] },
] as const satisfies readonly {
  /** The custom property in `index.css` this stop mirrors — what the test looks the triple up by. */
  readonly property: string;
  /** `oklch(L C h)`, written as the stylesheet writes it: lightness 0–1, chroma, hue in degrees. */
  readonly oklch: readonly [number, number, number];
}[];
