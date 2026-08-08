/**
 * The rungs a machine's colour channel can land on, given how many bits it stores.
 *
 * The Master System's two bits, the Mega Drive's three, the Amiga's four, the SNES's five and VGA's
 * six are all the same idea at different widths: a channel holds an integer, and the palette is
 * every combination those integers can make. So a machine like that has nothing to enumerate — the
 * *ladder* is the palette, which is what this returns.
 *
 * **The rung positions are the linear normalisation, `round(i × 255 / (levels − 1))`**, which is the
 * exact mapping of the index range onto a byte and is what every art tool writes when asked for a
 * Mega Drive palette.
 *
 * The reason to trust it over anything else is that at the widths this library uses it **is** what
 * hardware does. Widening a channel by repeating its bit pattern into eight — the standard trick —
 * lands on exactly these values at two, three and four bits per channel, which covers the Master
 * System, the Mega Drive, the Atari ST, the PC Engine, the Amiga and the Game Gear. At two and four
 * bits that is unsurprising, since the pattern tiles a byte exactly; at three it is not, and it holds
 * anyway. At five and six the repetition is cut short (`(n << 3) | (n >> 2)` carries only three of
 * the five bits round) and the two part company — by **at most one step in 255**, at four of the
 * thirty-two five-bit values.
 *
 * That last gap is below what a display resolves, and far below the difference between two consoles:
 * a DAC does not output an evenly spaced ramp at all, and what it does output varies by revision and
 * by video mode. That is one machine's analogue behaviour rather than the palette it was told to
 * show, which is what this describes.
 *
 * **Its own module, apart from the image transform that uses it**, because the two live in different
 * TypeScript programs: this is arithmetic and is read by the prompt text and the studio, while
 * `channelDepth.ts` touches `ImageData` and can only be reached from the app. Merging them would
 * pull the DOM into `tests/`, which compiles without it.
 */

/** Channel value 0–255 for each rung, lowest first. */
export function channelLevels(bitsPerChannel: number): readonly number[] {
  const steps = 2 ** bitsPerChannel;
  // A single rung has no interval to divide, and the expression below would divide by zero reaching
  // for it. No shipped palette is that narrow — one bit per channel is the floor — but this is where
  // a `bitsPerChannel` of zero is answered rather than returning `[NaN]`.
  if (steps < 2) return [0];
  return Array.from({ length: steps }, (_, index) => Math.round((index * 255) / (steps - 1)));
}

/** How many colours a space of this depth holds, across all three channels. */
export function channelSpaceSize(bitsPerChannel: number): number {
  return channelLevels(bitsPerChannel).length ** 3;
}
