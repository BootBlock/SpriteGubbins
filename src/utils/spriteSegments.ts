import { SCATTERED_SPRITE_CEILING, SMALLEST_SPRITE_PIXELS } from '../constants/quantiser.ts';
import type { SpriteBox, SpriteSegmentation } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT } from './imageData.ts';
import { type Bounds, mergeNearby } from './mergeNearbyBoxes.ts';

/**
 * How many separate things are on this sheet, and how big each of them is.
 *
 * The one question a *sprite sheet* raises that every pass before this one ignores. The mesh, the
 * three cell readings, the palette and the two cleanups all treat the image as a single field of
 * pixels, which is right for what they do and leaves the app unable to say whether the sheet that
 * came back holds the twelve components the prompt asked for or nine of them — or whether the
 * sprites on it measure the size the studio stated. Both are answered by connected-component
 * labelling over what the keying left transparent: an opaque region nothing joins to another one is
 * a sprite.
 *
 * **It runs on the finished result, in drawn pixels, rather than on the keyed source — which is a
 * departure from the plan this was built to, and is recorded here as one.** The keyed
 * source is where the mask *comes* from, and segmenting there would cost `grid²` times the work to
 * produce bounds that then have to be divided by the mesh before anyone could act on them — which
 * rounds, because a sprite's source bounds need not land on cell edges. The result's alpha is that
 * same keyed alpha carried through the mesh, and its coordinates are the ones every consumer states
 * its own question in: the studio's target component size is in drawn pixels, so is the cell an
 * atlas affords, and so is what a reader counts in the preview. A box here maps back to an exact
 * source range through `GridMesh` for anything that wants one.
 *
 * **Eight-connected**, because pixel art is drawn that way: a diagonal stair of single pixels is one
 * line to the eye and to the artist, and four-connectivity reports it as a row of separate sprites.
 *
 * Two-pass labelling over union–find, in the shape the passes beside it are written in — flat typed
 * arrays, no allocation per pixel, and the closures below built once per call rather than once per
 * pixel. See `imageData.ts` for why that distinction is load-bearing at the 16.8 million pixels this
 * app admits.
 *
 * Pure. `gap` is how far apart two pieces may sit and still be one sprite — see {@link mergeNearby},
 * which is what puts a floating sword back with the hand holding it.
 */
export function spriteSegments(image: ImageData, gap: number): SpriteSegmentation {
  const { data } = image;

  // The whole pass, skipped where there is nothing for it to separate anything *by* — and answered
  // with `SOLID` rather than with one box covering the sheet, because a box here would be a claim
  // this pass has no grounds for. Nothing has told it where a sprite ends, so the honest answer is
  // that it found none, not that it found one the size of the raster. Skipping also matters: keying
  // opens off on this tab, so a fully opaque result is the ordinary state rather than an edge, and
  // labelling one would allocate a full-size `Int32Array` and walk it twice to reach the same
  // conclusion this line reaches from the alpha channel alone.
  if (!hasTransparency(data)) return { kind: 'SOLID' };

  const { sprites, pieces, specks } = labelledBounds(image);

  // Past the ceiling the merge below is unaffordable, and the answer would mean nothing anyway: a
  // sheet that breaks into thousands of pieces has not been keyed into sprites, and a count of them
  // presented as a sprite count is a number a reader would act on. Saying it scattered is
  // information about the keying; saying "3,412 sprites" is not.
  if (pieces > SCATTERED_SPRITE_CEILING) return { kind: 'SCATTERED', pieces, specks };

  return { kind: 'SEGMENTED', boxes: mergeNearby(sprites, gap), specks };
}

/**
 * The largest of the sprites found, by the area of its box — or `null` where none were.
 *
 * The one an atlas cell has to seat, and the one worth reading against the studio's target
 * component size, so both the tab's readout and the atlas calculator ask for it. Here rather than in
 * either of them because two answers to "which is the largest" is exactly the drift this repository
 * files rules against — one panel could report a sprite the other says is not the biggest.
 *
 * By the area of the **box** rather than by the artwork inside it, because the box is what has to
 * fit: a sprawling figure that fills a third of its bounds still needs every pixel of them. Ties
 * fall to the earlier box, which is the topmost — {@link spriteSegments} returns them in reading
 * order, so the answer is stable across two runs at the same settings.
 */
export function widestSprite(boxes: readonly SpriteBox[]): SpriteBox | null {
  return boxes.reduce<SpriteBox | null>(
    (largest, box) =>
      largest === null || box.width * box.height > largest.width * largest.height ? box : largest,
    null,
  );
}

/** How many labels the union–find opens with, doubling from there as a sheet needs more. */
const INITIAL_LABELS = 1024;

/**
 * Whether any pixel in the image carries no coverage at all.
 *
 * The alpha channel alone, and it stops at the first one it finds — on a keyed sheet that is
 * somewhere in the first row of margin, so the ordinary cost of this guard is a few reads rather
 * than a walk of the sheet. The walk is only ever paid in full by an image with no transparency in
 * it, which is exactly the case the guard exists to answer.
 */
function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let alpha = 3; alpha < data.length; alpha += CHANNELS_PER_PIXEL) {
    if ((data[alpha] ?? 0) === FULLY_TRANSPARENT) return true;
  }
  return false;
}

/** What the labelling found: the regions worth calling sprites, and the count of those that were not. */
interface Labelled {
  /** One per region clearing {@link SMALLEST_SPRITE_PIXELS}, in scan order. */
  readonly sprites: Bounds[];
  /** How many of those there are — the same as `sprites.length`, except past the ceiling. */
  readonly pieces: number;
  /** Regions too small to be a sprite. */
  readonly specks: number;
}

/**
 * Two-pass connected-component labelling: every opaque region's bounds, and how many pixels it holds.
 *
 * The first pass gives each opaque pixel a provisional label from its already-visited neighbours —
 * west, north-west, north and north-east, which are the four an eight-connected walk has already
 * seen — and records that two provisional labels name one region wherever a pixel touches both. The
 * second pass resolves each label to its root and grows one box per root.
 *
 * Union by size with path compression, so the second pass's `find` is effectively constant however
 * a region snakes across the sheet — a U-shape a thousand rows tall is the case that makes a naive
 * chain quadratic, and a sprite outline is a U-shape.
 *
 * **The bounds accumulate into flat arrays indexed by label, and only the survivors are ever
 * materialised as objects.** That is what keeps the pathological sheet affordable, and it is the
 * reason the speck floor and the scatter ceiling are both applied *here* rather than by the caller.
 * A keyed sheet whose tolerance left salt-and-pepper fringe can hold millions of regions; one
 * `{left, top, right, bottom, pixels}` on the heap for each of them is the difference between a
 * large transient allocation and running the browser out of memory. So a speck never becomes an
 * object at all, and past the ceiling nothing is materialised — the counts are enough to say the
 * sheet scattered, which is the only answer the caller can give from there.
 *
 * The regions come back in scan order — topmost first, and leftmost among those — which is what
 * makes everything downstream of it deterministic without sorting anything twice.
 */
function labelledBounds(image: ImageData): Labelled {
  const { width, height, data } = image;
  const labels = new Int32Array(width * height);

  // `0` is the background, so a label is never zero and the array's own zero-fill is the empty
  // state. Index 0 of both arrays below is therefore unused, which costs eight bytes and removes a
  // ±1 from every line that touches them.
  let parent = new Int32Array(INITIAL_LABELS);
  let sizes = new Int32Array(INITIAL_LABELS);
  let next = 1;

  const claim = (): number => {
    if (next >= parent.length) {
      const grownParent = new Int32Array(parent.length * 2);
      grownParent.set(parent);
      parent = grownParent;
      const grownSizes = new Int32Array(sizes.length * 2);
      grownSizes.set(sizes);
      sizes = grownSizes;
    }
    parent[next] = next;
    sizes[next] = 1;
    next += 1;
    return next - 1;
  };

  const find = (label: number): number => {
    let root = label;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    // The compression walk, done separately so the search above stays a plain loop: every label on
    // the path is re-pointed at the root it has just resolved to, which is what keeps the next
    // search from repeating this one.
    let walk = label;
    while (walk !== root) {
      const above = parent[walk] ?? walk;
      parent[walk] = root;
      walk = above;
    }
    return root;
  };

  const union = (left: number, right: number): void => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft === rootRight) return;
    // The smaller tree hangs off the larger, which is what bounds the depth the search above walks.
    const leftIsBigger = (sizes[rootLeft] ?? 0) >= (sizes[rootRight] ?? 0);
    const kept = leftIsBigger ? rootLeft : rootRight;
    const absorbed = leftIsBigger ? rootRight : rootLeft;
    parent[absorbed] = kept;
    sizes[kept] = (sizes[kept] ?? 0) + (sizes[absorbed] ?? 0);
  };

  /** Take a neighbour's label, or record that it and the one already taken name one region. */
  const joined = (label: number, neighbour: number): number => {
    if (neighbour === 0) return label;
    if (label === 0) return neighbour;
    union(label, neighbour);
    return label;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = y * width + x;
      if ((data[cell * CHANNELS_PER_PIXEL + 3] ?? 0) === FULLY_TRANSPARENT) continue;

      let label = 0;
      if (x > 0) label = joined(label, labels[cell - 1] ?? 0);
      if (y > 0) {
        if (x > 0) label = joined(label, labels[cell - width - 1] ?? 0);
        label = joined(label, labels[cell - width] ?? 0);
        if (x + 1 < width) label = joined(label, labels[cell - width + 1] ?? 0);
      }
      labels[cell] = label === 0 ? claim() : label;
    }
  }

  // One slot per provisional label, indexed by the label's own number — so a root addresses its own
  // bounds directly and nothing has to be hashed. `pixels` doubles as the occupancy flag: a label
  // that is not a root, or that was never claimed, still reads zero after the walk.
  const left = new Int32Array(next);
  const top = new Int32Array(next);
  const right = new Int32Array(next);
  const bottom = new Int32Array(next);
  const pixels = new Int32Array(next);
  // Scan order, recovered from the walk rather than from the label numbers: union by size means a
  // region's root may be a label claimed later than the one its first pixel took, so the roots
  // cannot simply be read in ascending order.
  const roots: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const label = labels[y * width + x] ?? 0;
      if (label === 0) continue;

      const root = find(label);
      if ((pixels[root] ?? 0) === 0) {
        roots.push(root);
        left[root] = x;
        top[root] = y;
        right[root] = x + 1;
        bottom[root] = y + 1;
        pixels[root] = 1;
        continue;
      }
      // No `top` case: no union happens in this pass, so the forest is frozen and every pixel of a
      // region resolves to one root — which a row-major walk therefore meets first at the region's
      // topmost row.
      if (x < (left[root] ?? 0)) left[root] = x;
      if (x >= (right[root] ?? 0)) right[root] = x + 1;
      if (y >= (bottom[root] ?? 0)) bottom[root] = y + 1;
      pixels[root] = (pixels[root] ?? 0) + 1;
    }
  }

  // Counted before anything is built, so the two states that must not allocate — a sheet of fringe,
  // and a sheet past the ceiling — cost one walk of a number array rather than a heap object each.
  // A speck is fringe the keying left behind, not a sprite, and how much of it a sheet carries is a
  // fact about the *keying*: the same question `keyedShare` answers from the other side, and a
  // reader watching this fall as the tolerance rises is watching the halo go.
  const sprites: Bounds[] = [];
  let pieces = 0;
  for (const root of roots) {
    if ((pixels[root] ?? 0) >= SMALLEST_SPRITE_PIXELS) pieces += 1;
  }
  if (pieces <= SCATTERED_SPRITE_CEILING) {
    for (const root of roots) {
      if ((pixels[root] ?? 0) < SMALLEST_SPRITE_PIXELS) continue;
      sprites.push({
        left: left[root] ?? 0,
        top: top[root] ?? 0,
        right: right[root] ?? 0,
        bottom: bottom[root] ?? 0,
        pixels: pixels[root] ?? 0,
      });
    }
  }

  return { sprites, pieces, specks: roots.length - pieces };
}
