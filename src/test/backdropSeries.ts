import type { Rgba } from '../types/quantiser.ts';

/** `colour` mixed `share` of the way to `towards`, per channel. */
function mix(colour: Rgba, towards: number, share: number): Rgba {
  const channel = (value: number): number => Math.round(value + (towards - value) * share);
  return { r: channel(colour.r), g: channel(colour.g), b: channel(colour.b), a: colour.a };
}

/** The deepest a backdrop is taken to shade a colour, and the furthest it washes one. */
const DEEPEST_SHADE = 0.95;
const FURTHEST_WASH = 0.25;
const STEPS = 17;

/**
 * The shading and washing series a full-bleed square paints from one colour: the colour itself, then
 * every step towards 95% black into the square's corners and towards 25% white into its light.
 *
 * **One series for every key test** (R15 of `docs/todo/done/icon-catalogue.md`). A full-bleed square paints a
 * backdrop from the colours it is given — the set's, and a spell's school colour — and lets them fall
 * towards black and wash towards the light, and the keying removes any pixel within the key's reach
 * wherever it sits. So a colour is safe on a full-bleed sheet only if every step of this series is, and
 * the preset keys and the school colours are measured along the same steps.
 */
export function backdropSeries(colour: Rgba): readonly Rgba[] {
  return Array.from({ length: STEPS + 1 }, (_, step) => step / STEPS).flatMap((at) => [
    mix(colour, 0, at * DEEPEST_SHADE),
    mix(colour, 255, at * FURTHEST_WASH),
  ]);
}
