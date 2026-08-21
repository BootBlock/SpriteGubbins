import { SCATTERED_SPRITE_CEILING, SMALLEST_SPRITE_PIXELS } from '../constants/quantiser.ts';
import type { SpriteBox, SpriteSegmentation } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT } from './imageData.ts';

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
 * **It runs on the finished result, in drawn pixels, rather than on the keyed source.** The keyed
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
  const { width, height, data } = image;

  // The whole pass, skipped where there is nothing for it to separate anything *by*. Keying is off
  // by default on this tab, so a fully opaque result is the ordinary state rather than an edge —
  // and labelling one would allocate a full-size `Int32Array`, walk it twice, and arrive at the
  // single box this line states outright. One sprite filling the sheet is also the honest answer:
  // nothing here has been told where a sprite ends, so it cannot invent a boundary.
  if (!hasTransparency(data)) {
    return {
      kind: 'SEGMENTED',
      boxes: [{ left: 0, top: 0, width, height, pixels: width * height }],
      specks: 0,
    };
  }

  const bounds = labelledBounds(image);
  // A speck is fringe the keying left behind, not a sprite. Counted rather than dropped silently,
  // because how much of it a sheet carries is a fact about the *keying* — the same question
  // `keyedShare` answers from the other side — and a reader watching the speck count fall as the
  // tolerance rises is watching the halo go.
  const sprites = bounds.filter((box) => box.pixels >= SMALLEST_SPRITE_PIXELS);
  const specks = bounds.length - sprites.length;

  // Past the ceiling the merge below is unaffordable, and the answer would mean nothing anyway: a
  // sheet that breaks into thousands of pieces has not been keyed into sprites, and a count of them
  // presented as a sprite count is a number a reader would act on. Saying it scattered is
  // information about the keying; saying "3,412 sprites" is not.
  if (sprites.length > SCATTERED_SPRITE_CEILING) {
    return { kind: 'SCATTERED', pieces: sprites.length, specks };
  }

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

/** A box while it is still being grown, in the exclusive-edge form the merge below works in. */
interface Bounds {
  left: number;
  top: number;
  /** Exclusive — the first column past the box. */
  right: number;
  /** Exclusive — the first row past the box. */
  bottom: number;
  pixels: number;
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
 * The regions come back in scan order — topmost first, and leftmost among those — which is what
 * makes everything downstream of it deterministic without sorting anything twice.
 */
function labelledBounds(image: ImageData): Bounds[] {
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

  const found = new Map<number, Bounds>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const label = labels[y * width + x] ?? 0;
      if (label === 0) continue;

      const root = find(label);
      const box = found.get(root);
      if (box === undefined) {
        found.set(root, { left: x, top: y, right: x + 1, bottom: y + 1, pixels: 1 });
        continue;
      }
      // No `top` case: the walk is row by row, so a region's first pixel is always its topmost.
      if (x < box.left) box.left = x;
      if (x >= box.right) box.right = x + 1;
      if (y >= box.bottom) box.bottom = y + 1;
      box.pixels += 1;
    }
  }

  return [...found.values()];
}

/**
 * Pieces close enough to be parts of one sprite, folded into one box.
 *
 * The failure this answers is a sprite that arrives in pieces: a sword held clear of the hand, a
 * shadow under the feet, a pauldron the keying cut away from the shoulder it sits on. Each is its
 * own connected region and none of them is a sprite. What they share is *proximity*, so two boxes
 * within `gap` drawn pixels of one another — measured the same eight-connected way the labelling
 * measures adjacency — become one.
 *
 * **Boxes rather than pixels, which is what makes it a merge rather than a dilation.** Two regions
 * whose boxes overlap belong together however far apart their nearest pixels are: an outstretched
 * arm passes through the torso's box without touching a pixel of it. That is also why `gap` has no
 * off position — at zero this still folds boxes that overlap, which is the case a reader would
 * never want left apart.
 *
 * **Iterated to a fixed point**, because a merged box reaches further than either half did: fold a
 * sprite's top-left and bottom-right pieces together and the box that results covers the empty
 * bottom-left corner as well, where a third piece may be sitting. Each round is `O(n²)` in the boxes
 * still standing and every round but the last removes at least one of them, so
 * {@link SCATTERED_SPRITE_CEILING} is what makes the worst case affordable.
 *
 * Sorted top to bottom and left to right on the way out — reading order, so the sprite a reader
 * counts first in the preview is the first one anything downstream names.
 */
function mergeNearby(pieces: readonly Bounds[], gap: number): SpriteBox[] {
  let boxes = pieces.map((piece) => ({ ...piece }));

  for (;;) {
    const folded = foldOnce(boxes, gap);
    if (folded.length === boxes.length) break;
    boxes = folded;
  }

  return boxes
    .sort((left, right) => left.top - right.top || left.left - right.left)
    .map((box) => ({
      left: box.left,
      top: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      pixels: box.pixels,
    }));
}

/**
 * One round of the merge: every pair within `gap` unioned, and one box per group.
 *
 * Union–find again, over the boxes this time, so a round folds a whole *chain* rather than a pair —
 * three pieces where the first is near the second and the second near the third come back as one box
 * even though the first and third are far apart. Without that, a limb attached through a joint would
 * take a round per joint.
 */
function foldOnce(boxes: readonly Bounds[], gap: number): Bounds[] {
  const parent = boxes.map((_, index) => index);

  const find = (index: number): number => {
    let root = index;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    let walk = index;
    while (walk !== root) {
      const above = parent[walk] ?? walk;
      parent[walk] = root;
      walk = above;
    }
    return root;
  };

  for (const [left, first] of boxes.entries()) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      const second = boxes[right];
      if (second === undefined || separation(first, second) > gap) continue;
      const rootLeft = find(left);
      const rootRight = find(right);
      if (rootLeft !== rootRight) parent[rootRight] = rootLeft;
    }
  }

  // Grouped by root, in the order the roots are first met, so the output keeps the scan order the
  // labelling produced and the fixed-point loop above cannot shuffle a settled answer.
  const groups = new Map<number, Bounds>();
  for (const [index, box] of boxes.entries()) {
    const root = find(index);
    const group = groups.get(root);
    if (group === undefined) {
      groups.set(root, { ...box });
      continue;
    }
    group.left = Math.min(group.left, box.left);
    group.top = Math.min(group.top, box.top);
    group.right = Math.max(group.right, box.right);
    group.bottom = Math.max(group.bottom, box.bottom);
    group.pixels += box.pixels;
  }

  return [...groups.values()];
}

/**
 * How far apart two boxes sit, in drawn pixels — `0` where they touch or overlap.
 *
 * The Chebyshev separation, which is the eight-connected metric the labelling itself uses: a box
 * three pixels away diagonally is three away, not four and a bit. Measuring it any other way would
 * put the merge and the labelling on two different definitions of "next to", and a gap of 1 would
 * then mean something different depending on which direction the piece had drifted.
 */
function separation(first: Bounds, second: Bounds): number {
  const across = Math.max(first.left - second.right, second.left - first.right, 0);
  const down = Math.max(first.top - second.bottom, second.top - first.bottom, 0);
  return Math.max(across, down);
}
