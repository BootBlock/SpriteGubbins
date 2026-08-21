/**
 * The two colours a sprite's bounds are outlined in, alternating pixel by pixel.
 *
 * **A colour written down outside `src/index.css` again, and it claims the same exemption
 * `differenceRamp.ts` claims, for the same reason:** the outline is drawn *into pixel data*, by a
 * pure function in `src/utils/` that a worker may run, where there is no element to carry a class
 * and reading a computed style is banned outright. And as there, the exemption is from the
 * *mechanism* only — both stops are the app's own tokens, stated exactly as `index.css` states
 * them, and `tests/design-tokens.test.ts` fails if the two ever part company.
 *
 * **Achromatic, and that is the whole design.** The mark lands on the reader's own artwork, whose
 * hue nothing here knows, so any coloured outline is invisible against some sheet — and every hue in
 * this app's palette already means something, which an outline round a sprite is not entitled to
 * say. The page's own ground and the colour its body text is set in are the darkest and lightest
 * things the app owns; alternating them along the run gives a dashed marquee that separates from
 * artwork of any lightness, and reads as the app drawing over the picture rather than as part of it.
 * It is the selection-marquee idiom, for exactly the reason that idiom is achromatic.
 */
export const SPRITE_MARKER = [
  { property: '--color-foundry-950', oklch: [0.115, 0.015, 270] },
  { property: '--color-ink', oklch: [0.927, 0.012, 281] },
] as const satisfies readonly {
  /** The custom property in `index.css` this stop mirrors — what the test looks the triple up by. */
  readonly property: string;
  /** `oklch(L C h)`, written as the stylesheet writes it: lightness 0–1, chroma, hue in degrees. */
  readonly oklch: readonly [number, number, number];
}[];
