/**
 * The running extremum of a line, in constant time per position however wide the window — and
 * carrying *which* position won, not just the value.
 *
 * This is van Herk's algorithm and Gil and Werman's, published independently in 1992: split the
 * line into blocks the width of the window, scan each block forward and backward accumulating the
 * extremum, and then every window — which by construction straddles exactly one block boundary — is
 * the better of one backward value and one forward value. Three passes, no comparison count that
 * depends on the window, where the naive form costs one comparison per position per window pixel.
 *
 * **Why it is here rather than a plain loop:** the outline-expansion pass morphs a sheet of up to
 * 16.8 million pixels twice over, each time in two axes, at a radius the reader sets. The naive form
 * is O(radius) per position per axis, so the cost of the whole pass would climb with a dial — which
 * is exactly the shape of thing that turns a slider into a control nobody dares move. This way the
 * radius is free, which `outlineExpansion`'s own measurements confirm: the pass timed the same at a
 * thickness of 4 as at 1.
 *
 * **The owner is the reason this is not a scalar running minimum.** The quantiser's morphology has
 * to hand back a whole *pixel* rather than a lightness, because a pixel is a colour and a colour is
 * what the sheet is made of — see `extremeNeighbour.ts`. So every comparison carries an index
 * alongside its key, and the winner's index comes out the other end.
 *
 * **Ties break on the lower owner index, always.** That is what makes the answer independent of the
 * block structure the algorithm happens to impose — a property `runningExtremum.test.ts` pins by
 * comparing against a brute-force window at every radius and length — and it is what makes the
 * separable two-axis composition in `extremeNeighbour.ts` exact rather than merely plausible.
 *
 * Pure: it reads one field and writes another, both the caller's, and touches nothing else.
 */

/** A field of comparable values, each standing for the position that produced it. */
export interface ExtremumField {
  /** What is compared. `Int16` so a sentinel outside the 0–255 byte range can be an identity. */
  readonly keys: Int16Array;
  /** Which position each key came from — an index into the image the caller is morphing. */
  readonly owners: Int32Array;
}

/** Where a line through a field starts, how far apart its positions are, and how many there are. */
export interface Line {
  readonly start: number;
  readonly stride: number;
  readonly length: number;
}

/**
 * The block scans, allocated once for the longest line and reused down the whole image.
 *
 * A sheet 4096 pixels on a side is 4096 rows and 4096 columns, and the four arrays below allocated
 * per line would be sixteen thousand allocations per axis per morphological step. The caller makes
 * one set and reuses it down the whole image.
 */
export interface ExtremumScratch {
  readonly forwardKeys: Int16Array;
  readonly forwardOwners: Int32Array;
  readonly backwardKeys: Int16Array;
  readonly backwardOwners: Int32Array;
}

/** Scratch for lines of up to `length` positions. */
export function extremumScratch(length: number): ExtremumScratch {
  return {
    forwardKeys: new Int16Array(length),
    forwardOwners: new Int32Array(length),
    backwardKeys: new Int16Array(length),
    backwardOwners: new Int32Array(length),
  };
}

/**
 * Write, for every position on `line`, the winner of the `2 × radius + 1` window centred on it.
 *
 * `takeMin` chooses the direction: the smallest key for an erosion, the largest for a dilation.
 *
 * **The window is clipped to the line rather than padded**, which is the same answer replicating the
 * end value would give — a copy of a value already inside the window cannot change a minimum or a
 * maximum — and is what the rest of the quantiser means by a neighbourhood: `despeckle` weighs
 * "the neighbours it *has*", five at an edge and three in a corner, and this agrees with it.
 *
 * The positions whose window would run off an end are computed directly instead of through the
 * blocks. There are at most `radius` of them at each end, and the block identity does not hold for
 * a window shorter than a block — a short line falls entirely into this arm, which is why a line
 * shorter than the window needs no separate case.
 */
export function runningExtremum(
  input: ExtremumField,
  output: ExtremumField,
  line: Line,
  radius: number,
  takeMin: boolean,
  scratch: ExtremumScratch,
): void {
  const { start, stride, length } = line;
  const window = 2 * radius + 1;
  const { forwardKeys, forwardOwners, backwardKeys, backwardOwners } = scratch;

  // Forward: the extremum from each block's first position up to this one.
  for (let index = 0; index < length; index += 1) {
    const at = start + index * stride;
    const key = input.keys[at] ?? 0;
    const owner = input.owners[at] ?? 0;
    const previousKey = forwardKeys[index - 1] ?? 0;
    const previousOwner = forwardOwners[index - 1] ?? 0;
    const opensBlock = index % window === 0;
    const wins = opensBlock || beats(key, owner, previousKey, previousOwner, takeMin);
    forwardKeys[index] = wins ? key : previousKey;
    forwardOwners[index] = wins ? owner : previousOwner;
  }

  // Backward: the extremum from this position to its block's last — or to the line's, where the
  // final block is cut short.
  for (let index = length - 1; index >= 0; index -= 1) {
    const at = start + index * stride;
    const key = input.keys[at] ?? 0;
    const owner = input.owners[at] ?? 0;
    const nextKey = backwardKeys[index + 1] ?? 0;
    const nextOwner = backwardOwners[index + 1] ?? 0;
    const closesBlock = index % window === window - 1 || index === length - 1;
    const wins = closesBlock || beats(key, owner, nextKey, nextOwner, takeMin);
    backwardKeys[index] = wins ? key : nextKey;
    backwardOwners[index] = wins ? owner : nextOwner;
  }

  for (let index = 0; index < length; index += 1) {
    const from = index - radius;
    const to = index + radius;
    const at = start + index * stride;

    if (from < 0 || to >= length) {
      const first = Math.max(from, 0);
      const last = Math.min(to, length - 1);
      let bestKey = input.keys[start + first * stride] ?? 0;
      let bestOwner = input.owners[start + first * stride] ?? 0;
      for (let scan = first + 1; scan <= last; scan += 1) {
        const scanned = start + scan * stride;
        const key = input.keys[scanned] ?? 0;
        const owner = input.owners[scanned] ?? 0;
        if (beats(key, owner, bestKey, bestOwner, takeMin)) {
          bestKey = key;
          bestOwner = owner;
        }
      }
      output.keys[at] = bestKey;
      output.owners[at] = bestOwner;
      continue;
    }

    const backKey = backwardKeys[from] ?? 0;
    const backOwner = backwardOwners[from] ?? 0;
    const frontKey = forwardKeys[to] ?? 0;
    const frontOwner = forwardOwners[to] ?? 0;
    const backWins = beats(backKey, backOwner, frontKey, frontOwner, takeMin);
    output.keys[at] = backWins ? backKey : frontKey;
    output.owners[at] = backWins ? backOwner : frontOwner;
  }
}

/**
 * Whether the first candidate strictly beats the second: better key, or an equal key from an
 * earlier position.
 *
 * The tie-break is not a detail. Without one, which of two equally dark pixels a window returns
 * depends on where the algorithm's blocks happened to fall — so the same sheet could morph
 * differently at two radii that reach the same neighbourhood, and no test could pin either answer.
 * With it the result is a function of the window alone.
 */
function beats(key: number, owner: number, bestKey: number, bestOwner: number, takeMin: boolean): boolean {
  if (key === bestKey) return owner < bestOwner;
  return takeMin ? key < bestKey : key > bestKey;
}
